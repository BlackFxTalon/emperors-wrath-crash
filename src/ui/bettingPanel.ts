import type { CrashEngine } from '../engine/CrashEngine';
import type { Phase } from '../engine/types';

/**
 * Wires the DOM launch-sanctum panel to the engine.
 *
 * The action control is self-explanatory at all times (spec: player-betting-ui /
 * "Action control state feedback"):
 *  - the label carries phase context (countdown, stake, live multiplier);
 *  - whenever the button is inert, the hint line says why and what the player holds.
 */

interface Elements {
  panel: HTMLElement;
  balance: HTMLOutputElement;
  bet: HTMLInputElement;
  auto: HTMLInputElement;
  autoEnabled: HTMLInputElement;
  action: HTMLButtonElement;
  hint: HTMLParagraphElement;
  message: HTMLParagraphElement;
}

interface Extraction {
  multiplier: number;
  payout: number;
}

export class BettingPanel {
  private el: Elements;
  private engine: CrashEngine;
  private phase: Phase = 'BETTING';
  private betArmed = false;
  private betSettled = false;
  private armedAmount = 0;
  private autoTarget: number | null = null;
  private currentMultiplier = 1;
  private countdown: number | null = null;
  private lastExtraction: Extraction | null = null;
  private lostStake: number | null = null;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;
  private lastButtonLabel = '';
  private lastHint = '';

  constructor(engine: CrashEngine) {
    this.engine = engine;
    this.el = {
      panel: document.querySelector<HTMLElement>('#bet-panel')!,
      balance: document.querySelector<HTMLOutputElement>('#balance')!,
      bet: document.querySelector<HTMLInputElement>('#bet-input')!,
      auto: document.querySelector<HTMLInputElement>('#auto-extract')!,
      autoEnabled: document.querySelector<HTMLInputElement>('#auto-enabled')!,
      action: document.querySelector<HTMLButtonElement>('#action-button')!,
      hint: document.querySelector<HTMLParagraphElement>('#action-hint')!,
      message: document.querySelector<HTMLParagraphElement>('#bet-message')!,
    };

    this.el.balance.textContent = fmt(engine.balance);
    this.el.action.addEventListener('click', () => this.onAction());
    for (const chip of document.querySelectorAll<HTMLButtonElement>('.chip')) {
      chip.addEventListener('click', () => {
        this.el.bet.value = chip.dataset.chip ?? '10';
      });
    }

    engine.on('balance', ({ value }) => {
      this.el.balance.textContent = fmt(value);
    });
    engine.on('phase', ({ phase }) => {
      this.phase = phase;
      this.el.panel.dataset.phase = phase;
      if (phase === 'BETTING') {
        // Fresh window: reset per-round stake memories.
        this.lastExtraction = null;
        this.lostStake = null;
      }
      this.refresh(true);
    });
    engine.on('tick', (t) => {
      this.currentMultiplier = t.multiplier;
      this.countdown = t.countdown;
      this.betArmed = t.bet !== null;
      this.betSettled = t.bet?.settled ?? false;
      if (t.bet) {
        this.armedAmount = t.bet.amount;
        this.autoTarget = t.bet.autoTarget;
      }
      this.refresh();
    });
    engine.on('armed', ({ amount, autoTarget }) => {
      this.armedAmount = amount;
      this.autoTarget = autoTarget;
      this.refresh(true);
    });
    engine.on('betCancelled', () => this.refresh(true));
    engine.on('extraction', ({ multiplier, payout }) => {
      this.lastExtraction = { multiplier, payout };
      this.showMessage(`Extraction at x${multiplier.toFixed(2)} — +${payout.toFixed(2)} Throne Gelt.`, false);
      this.refresh(true);
    });
    engine.on('crash', ({ lostBet }) => {
      if (lostBet) {
        this.lostStake = this.armedAmount;
        this.showMessage('Your torpedo was consumed by the Warp.');
      }
      this.refresh(true);
    });
    engine.on('rejected', ({ reason }) => this.showMessage(reason));

    this.refresh(true);
  }

  private onAction(): void {
    if (this.phase === 'BETTING') {
      if (this.betArmed) {
        this.engine.cancelBet();
      } else {
        this.engine.placeBet(Number(this.el.bet.value), this.autoTargetInput());
      }
    } else if (this.phase === 'FLYING') {
      this.engine.cashOut();
    }
    this.refresh(true);
  }

  private autoTargetInput(): number | null {
    if (!this.el.autoEnabled.checked) return null;
    const v = Number(this.el.auto.value);
    return Number.isFinite(v) ? v : null;
  }

  private refresh(force = false): void {
    const b = this.el.action;
    b.classList.remove('extract');

    let label: string;
    let enabled: boolean;
    let hint: string;

    switch (this.phase) {
      case 'BETTING': {
        if (this.betArmed) {
          label = `RECALL TORPEDO · ${fmt(this.armedAmount)}`;
          enabled = true;
          hint =
            'Torpedo armed — extraction during flight locks your payout.' +
            (this.autoTarget !== null ? ` Auto-extract at x${this.autoTarget.toFixed(2)}.` : '');
        } else {
          const s = this.countdown !== null ? this.countdown.toFixed(1) : '—';
          label = `ARM TORPEDO · ${s}s`;
          enabled = true;
          hint = 'Place your stake before the launch window closes.';
        }
        break;
      }
      case 'FLYING': {
        if (this.betArmed && !this.betSettled) {
          label = `EXTRACT · x${this.currentMultiplier.toFixed(2)}`;
          enabled = true;
          hint = `Click to lock x${this.currentMultiplier.toFixed(2)} × ${fmt(this.armedAmount)} — before the rift takes it.`;
          b.classList.add('extract');
        } else if (this.betSettled && this.lastExtraction) {
          label = 'SOUL SECURED';
          enabled = false;
          hint = `Extracted at x${this.lastExtraction.multiplier.toFixed(2)} — payout locked: +${fmt(
            this.lastExtraction.payout,
          )} Throne Gelt. Watch the rest burn.`;
        } else {
          label = 'NO STAKE IN FLIGHT';
          enabled = false;
          hint = 'No bet was armed for this flight — arm one in the next window.';
        }
        break;
      }
      case 'CRASHED': {
        label = 'WARP RIFT…';
        enabled = false;
        hint =
          this.lostStake !== null
            ? `Your ${fmt(this.lostStake)} Throne Gelt burned with the torpedo.`
            : 'Torpedo lost to the Empyrean — next window opens soon.';
        break;
      }
    }

    // Avoid DOM churn on every tick when nothing visible changed.
    if (force || label !== this.lastButtonLabel) {
      b.textContent = label;
      b.disabled = !enabled;
      this.lastButtonLabel = label;
    }
    if (force || hint !== this.lastHint) {
      this.el.hint.textContent = hint;
      this.lastHint = hint;
    }
  }

  private showMessage(text: string, isError = true): void {
    this.el.message.textContent = text;
    this.el.message.style.color = isError ? 'var(--blood-bright)' : 'var(--bone-gold-bright)';
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      this.el.message.textContent = '';
    }, 3400);
  }
}

function fmt(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
