import { Application, Container, Graphics, Rectangle, Text, TextStyle, Ticker } from 'pixi.js';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import type { Phase, TickEvent } from '../../engine/types';

const GOLD = '#c9a227';
const GOLD_BRIGHT = '#e8c95a';
const BLOOD = '#c41212';
const BLOOD_DARK = '#8a0303';
const PARCHMENT = '#f5f0e6';
const DISPLAY = '"Ruslan Display", Georgia, serif';
const SERIF = '"Cormorant", Georgia, serif';

interface HistoryChip {
  bg: Graphics;
  label: Text;
}

interface Toast {
  root: Container;
  life: number;
  maxLife: number;
}

export class Hud {
  private app = new Application();
  private root = new Container();
  private hudLayer = new Container(); // shaken on crash
  private multiplierText!: Text;
  private multiplierCaption!: Text;
  private statusLine!: Text;
  private banner!: Text;
  private bannerSub!: Text;
  private historyRow = new Container();
  private historyChips: HistoryChip[] = [];
  private toasts: Toast[] = [];
  private toastLayer = new Container();
  private vignette!: Graphics;
  private shake = 0;
  private phase: Phase = 'BETTING';
  private bottomInset = 0;
  private histOffset = 0;
  private histContentW = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartOffset = 0;

  private constructor() {}

  static async create(canvas: HTMLCanvasElement): Promise<Hud> {
    const hud = new Hud();
    await hud.app.init({
      canvas,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      resizeTo: window,
      powerPreference: 'high-performance',
    });
    hud.app.ticker.stop(); // driven externally by the master loop
    hud.build();
    hud.app.stage.eventMode = 'static';
    hud.setupHistoryDrag();
    hud.app.stage.addChild(hud.root);
    return hud;
  }

  /** Reserve the DOM bottom sheet's height so HUD text never hides behind it. */
  setBottomInset(px: number): void {
    this.bottomInset = px;
    this.layoutPositions();
  }

  private setupHistoryDrag(): void {
    this.historyRow.eventMode = 'static';
    this.historyRow.cursor = 'grab';
    this.historyRow.on('pointerdown', (e: FederatedPointerEvent) => {
      this.dragging = true;
      this.dragStartX = e.global.x;
      this.dragStartOffset = this.histOffset;
      this.historyRow.cursor = 'grabbing';
    });
    this.historyRow.on('pointermove', (e: FederatedPointerEvent) => {
      if (!this.dragging) return;
      this.histOffset = this.clampHistOffset(this.dragStartOffset - (e.global.x - this.dragStartX));
      this.historyRow.x = -this.histOffset;
    });
    const end = () => {
      this.dragging = false;
      this.historyRow.cursor = 'grab';
    };
    this.historyRow.on('pointerup', end);
    this.historyRow.on('pointerupoutside', end);
    this.historyRow.on('wheel', (e: FederatedWheelEvent) => {
      this.histOffset = this.clampHistOffset(this.histOffset + e.deltaX);
      this.historyRow.x = -this.histOffset;
    });
  }

  private clampHistOffset(v: number): number {
    const max = Math.max(0, this.histContentW - (this.app.screen.width - 24));
    return Math.min(max, Math.max(0, v));
  }

  private build(): void {
    const W = this.app.screen.width;

    this.vignette = new Graphics();
    this.root.addChild(this.vignette);

    this.root.addChild(this.hudLayer);

    // ── Warp Charge counter ──────────────────────────────────────────
    this.multiplierCaption = new Text({
      text: 'ВАРП-ЗАРЯД',
      style: new TextStyle({
        fontFamily: DISPLAY,
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: 3,
        fill: GOLD,
        dropShadow: { color: 0x000000, alpha: 0.8, blur: 4, distance: 2 },
      }),
    });
    this.multiplierCaption.anchor.set(0.5);

    this.multiplierText = new Text({
      text: 'x1.00',
      style: new TextStyle({
        fontFamily: SERIF,
        fontSize: 96,
        fontWeight: '700',
        fill: GOLD_BRIGHT,
        stroke: { color: '#1a0d05', width: 8, join: 'round' },
        dropShadow: { color: 0x8a0303, alpha: 0.55, blur: 18, distance: 0 },
      }),
    });
    this.multiplierText.anchor.set(0.5);

    this.hudLayer.addChild(this.multiplierCaption, this.multiplierText);

    // ── status / countdown line ─────────────────────────────────────
    this.statusLine = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: SERIF,
        fontSize: 19,
        fontStyle: 'italic',
        fill: PARCHMENT,
        dropShadow: { color: 0x000000, alpha: 0.9, blur: 4, distance: 2 },
      }),
    });
    this.statusLine.anchor.set(0.5);
    this.hudLayer.addChild(this.statusLine);

    // ── big phase banner ─────────────────────────────────────────────
    this.banner = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: DISPLAY,
        fontSize: 54,
        fontWeight: '400',
        letterSpacing: 4,
        fill: BLOOD,
        stroke: { color: '#120404', width: 6, join: 'round' },
        dropShadow: { color: 0x000000, alpha: 0.9, blur: 10, distance: 3 },
      }),
    });
    this.banner.anchor.set(0.5);
    this.hudLayer.addChild(this.banner);

    this.bannerSub = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: SERIF,
        fontSize: 20,
        fontStyle: 'italic',
        fill: PARCHMENT,
        dropShadow: { color: 0x000000, alpha: 0.9, blur: 4, distance: 2 },
      }),
    });
    this.bannerSub.anchor.set(0.5);
    this.hudLayer.addChild(this.bannerSub);

    // ── history strip ────────────────────────────────────────────────
    this.hudLayer.addChild(this.historyRow);
    this.root.addChild(this.toastLayer);

    this.layout();
  }

  /** The Pixi ticker doubles as the single authoritative RAF clock for the whole app. */
  get ticker(): Ticker {
    return this.app.ticker;
  }

  /** Called on every master-loop frame with the latest engine tick. */
  frame(tick: TickEvent, dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    this.layoutPositions();
    this.updateCounter(tick, dt);
    this.updateBanners(tick, dt);
    this.updateToasts(dt);
    this.updateShake(dt);
    this.updateVignette(dt);
  }

  private updateCounter(tick: TickEvent, dt: number): void {
    const m = tick.multiplier;
    this.multiplierText.text = `x${m.toFixed(2)}`;

    if (this.phase === 'FLYING') {
      // Heat up from parchment-gold to blazing red as the multiplier climbs.
      const heat = Math.min(1, Math.log2(Math.max(1, m)) / 5);
      this.multiplierText.style.fill = lerpColor(GOLD_BRIGHT, BLOOD_BRIGHT_HEX, heat * 0.85);
      const scale = 1 + Math.min(0.25, Math.log2(Math.max(1, m)) * 0.05);
      this.multiplierText.scale.set(lerp(this.multiplierText.scale.x, scale, 0.1));
      this.multiplierCaption.text = 'ВАРП-ЗАРЯД РАСТЁТ';
      this.statusLine.text = tick.bet
        ? tick.bet.settled
          ? `Душа спасена — выплачено ${tick.bet.payout.toFixed(2)} талера`
          : `Торпеда взведена · ${tick.bet.amount.toFixed(2)} талера`
        : 'В Варпе нет вашей торпеды…';
    } else if (this.phase === 'BETTING') {
      this.multiplierText.style.fill = GOLD_BRIGHT;
      this.multiplierText.scale.set(lerp(this.multiplierText.scale.x, 1, 0.1));
      this.multiplierCaption.text = 'СЛЕДУЮЩИЙ ЗАПУСК';
      this.statusLine.text =
        tick.countdown !== null ? `Гнев восходит через ${tick.countdown.toFixed(1)} с` : '';
    } else {
      this.multiplierText.style.fill = BLOOD;
      this.multiplierText.scale.set(lerp(this.multiplierText.scale.x, 1.12, 0.2));
      this.multiplierCaption.text = 'ВАРП ПОЖИРАЕТ ВСЕХ';
    }
    void dt;
  }

  private bannerTimer = 0;
  private updateBanners(tick: TickEvent, dt: number): void {
    if (this.phase === 'CRASHED') {
      this.banner.text = 'ВАРП-РАЗЛОМ';
      this.bannerSub.text = 'ТОРПЕДА ПОТЕРЯНА В ЭМПИРЕЯХ';
      this.banner.alpha = 0.75 + Math.sin(performance.now() * 0.008) * 0.25;
      this.bannerSub.alpha = this.banner.alpha;
    } else if (this.phase === 'FLYING' && this.bannerTimer < 2.2) {
      this.bannerTimer += dt;
      const k = Math.min(1, this.bannerTimer / 0.4);
      this.banner.text = 'ГНЕВ ВОСХОДИТ';
      this.bannerSub.text = 'ИЗВЛЕКИТЕ ДУШУ ДО УДАРА РАЗЛОМА';
      this.banner.alpha = this.bannerTimer < 1.6 ? k : Math.max(0, 1 - (this.bannerTimer - 1.6) / 0.6);
      this.bannerSub.alpha = this.banner.alpha;
    } else if (this.phase === 'BETTING') {
      this.banner.text = '';
      this.bannerSub.text = tick.bet ? '' : 'ВЗВЕДИТЕ ТОРПЕДУ, ГВАРДЕЕЦ';
      this.banner.alpha = 0;
      this.bannerSub.alpha = 0.8 + Math.sin(performance.now() * 0.004) * 0.2;
    } else {
      this.bannerTimer = 0;
      this.banner.alpha = 0;
      this.bannerSub.alpha = 0;
    }
    if (this.phase !== 'FLYING' && this.phase !== 'CRASHED') this.bannerTimer = 0;
  }

  private updateToasts(dt: number): void {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i]!;
      t.life -= dt;
      if (t.life <= 0) {
        this.toastLayer.removeChild(t.root);
        t.root.destroy({ children: true });
        this.toasts.splice(i, 1);
        continue;
      }
      const k = t.life / t.maxLife;
      t.root.alpha = Math.min(1, k * 3);
      t.root.y -= dt * 26;
    }
  }

  private updateShake(dt: number): void {
    if (this.shake > 0.001) {
      this.shake = Math.max(0, this.shake - dt * 2.6);
      this.hudLayer.position.set((Math.random() - 0.5) * 26 * this.shake, (Math.random() - 0.5) * 20 * this.shake);
    } else {
      this.hudLayer.position.set(0, 0);
    }
  }

  private vignetteAlpha = 0;
  private updateVignette(dt: number): void {
    this.vignetteAlpha = Math.max(0, this.vignetteAlpha - dt * 0.5);
    if (this.vignetteAlpha <= 0.001 && this.vignette.renderable) {
      this.vignette.clear();
      this.vignette.renderable = false;
      return;
    }
    const { width: W, height: H } = this.app.screen;
    this.vignette.renderable = true;
    this.vignette.clear();
    // BLOOD VIGNETTE: 4 soft-ish edge rects (cheap, no filter dependency)
    const a = this.vignetteAlpha * 0.55;
    const depth = Math.max(70, Math.min(W, H) * 0.18);
    this.vignette.rect(0, 0, W, depth).fill({ color: BLOOD_DARK, alpha: a });
    this.vignette.rect(0, H - depth, W, depth).fill({ color: BLOOD_DARK, alpha: a });
    this.vignette.rect(0, 0, depth, H).fill({ color: BLOOD_DARK, alpha: a });
    this.vignette.rect(W - depth, 0, depth, H).fill({ color: BLOOD_DARK, alpha: a });
  }

  // ── public impulses from bridge ────────────────────────────────────

  setPhase(phase: Phase): void {
    this.phase = phase;
    if (phase === 'CRASHED') {
      this.shake = 1;
      this.vignetteAlpha = 1;
    }
  }

  addHistory(multiplier: number): void {
    const chipBg = new Graphics();
    const value = multiplier >= 10 ? GOLD_BRIGHT : multiplier >= 2 ? BLOOD : '#9a938a';
    const bgColor = multiplier >= 10 ? 0x3a2c08 : multiplier >= 2 ? 0x2a0606 : 0x1c1916;
    const label = new Text({
      text: `x${multiplier.toFixed(2)}`,
      style: new TextStyle({
        fontFamily: SERIF,
        fontSize: 12,
        fontWeight: '700',
        fill: value,
      }),
    });
    const padX = 7;
    const w = label.width + padX * 2;
    const h = 20;
    chipBg.roundRect(0, 0, w, h, 3).fill({ color: bgColor, alpha: 0.92 }).stroke({ color: 0x3a3128, width: 1 });
    label.position.set(padX, (h - label.height) / 2);
    const holder = new Container();
    holder.addChild(chipBg, label);
    this.historyChips.unshift({ bg: chipBg, label });
    this.historyRow.addChildAt(holder, 0);
    // Cap history — old entries drop off, the strip keeps pannable.
    while (this.historyChips.length > 12) {
      const dead = this.historyChips.pop()!;
      dead.bg.parent?.destroy({ children: true });
    }
    this.layoutHistory();
  }

  toast(kind: 'win' | 'lose' | 'info', title: string, sub?: string): void {
    const root = new Container();
    const title2 = new Text({
      text: title,
      style: new TextStyle({
        fontFamily: DISPLAY,
        fontSize: 30,
        fontWeight: '400',
        letterSpacing: 2,
        fill: kind === 'win' ? GOLD_BRIGHT : kind === 'lose' ? BLOOD : PARCHMENT,
        stroke: { color: '#120404', width: 5, join: 'round' },
        dropShadow: { color: 0x000000, alpha: 0.9, blur: 8, distance: 2 },
      }),
    });
    title2.anchor.set(0.5);
    fitToWidth(title2, this.app.screen.width - 32);
    root.addChild(title2);
    if (sub) {
      const sub2 = new Text({
        text: sub,
        style: new TextStyle({
          fontFamily: SERIF,
          fontSize: 17,
          fontStyle: 'italic',
          fill: PARCHMENT,
          dropShadow: { color: 0x000000, alpha: 0.9, blur: 4, distance: 1 },
        }),
      });
      sub2.anchor.set(0.5);
      fitToWidth(sub2, this.app.screen.width - 32);
      sub2.y = 34;
      root.addChild(sub2);
    }
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    root.position.set(W / 2, H * 0.52);
    this.toastLayer.addChild(root);
    this.toasts.push({ root, life: 2.4, maxLife: 2.4 });
  }

  // ── layout ─────────────────────────────────────────────────────────

  private layout(): void {
    this.layoutPositions();
    this.layoutHistory();
  }

  private layoutPositions(): void {
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    // On narrow screens the DOM bottom sheet reserves its height.
    const inset = W <= 720 ? this.bottomInset : 0;
    const usableH = Math.max(220, H - inset);
    const maxW = W - 24;
    const cx = W / 2;
    const cy = usableH * 0.34;
    const s = Math.min(1, W / 900);
    this.multiplierText.position.set(cx, cy);
    setFont(this.multiplierText, Math.round(96 * Math.max(0.62, s)));
    setFont(this.multiplierCaption, Math.round(15 * Math.max(0.78, s)));
    this.multiplierCaption.position.set(cx, cy - this.multiplierText.height / 2 - 18);
    setFont(this.statusLine, Math.round(19 * Math.max(0.76, s)));
    this.statusLine.position.set(cx, cy + this.multiplierText.height / 2 + 26 * Math.max(0.76, s));
    setFont(this.banner, Math.round(54 * Math.max(0.55, s)));
    this.banner.position.set(cx, usableH * 0.62);
    setFont(this.bannerSub, Math.round(20 * Math.max(0.7, s)));
    this.bannerSub.position.set(cx, this.banner.y + this.banner.height / 2 + 14);

    // No HUD line may exceed the viewport (uniform scale keeps glyphs undistorted).
    fitToWidth(this.multiplierText, maxW);
    fitToWidth(this.multiplierCaption, maxW);
    fitToWidth(this.statusLine, maxW);
    fitToWidth(this.banner, maxW);
    fitToWidth(this.bannerSub, maxW);

    this.toastLayer.children.forEach((c) => {
      if (c.x === 0 && c.y === 0) c.position.set(W / 2, usableH * 0.52);
    });
  }

  private layoutHistory(): void {
    let x = 16;
    const y = 14;
    for (const chip of this.historyChips) {
      const holder = chip.bg.parent!;
      holder.position.set(x, y);
      holder.visible = true;
      x += holder.width + 6;
    }
    this.histContentW = x;
    this.histOffset = this.clampHistOffset(this.histOffset);
    this.historyRow.position.set(-this.histOffset, 0);
    this.historyRow.hitArea = new Rectangle(0, 0, this.app.screen.width, 44);
  }
}

const BLOOD_BRIGHT_HEX = '#e04a2a';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Set a text's font size only when it actually changes (avoids per-frame re-measure). */
function setFont(text: Text, px: number): void {
  if (text.style.fontSize !== px) {
    text.style.fontSize = px;
  }
}

/** Uniformly shrink a single-line text so it never exceeds maxW. */
function fitToWidth(text: Text, maxW: number): void {
  // Pixi's `width` includes the current scale — divide it out to get the natural size.
  const natural = text.width / (text.scale.x || 1);
  if (natural > maxW) {
    text.scale.set(maxW / natural);
  } else if (text.scale.x !== 1) {
    text.scale.set(1);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const mix = (shift: number) => {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    return Math.round(lerp(ca, cb, Math.min(1, Math.max(0, t))));
  };
  const r = mix(16);
  const g = mix(8);
  const bl = mix(0);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
