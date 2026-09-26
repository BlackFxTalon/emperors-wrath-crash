import { crashFromDigest, digestInput, sha256Hex } from '../engine/fair';
import type { CrashEngine } from '../engine/CrashEngine';

/** Provably-fair disclosure panel ("Omnissiah's Seal"). */

export class IntegrityPanel {
  private body: HTMLDivElement;
  private hashEl: HTMLElement;
  private seedEl: HTMLElement;
  private nonceEl: HTMLElement;
  private crashEl: HTMLElement;

  constructor(engine: CrashEngine) {
    const toggle = document.querySelector<HTMLButtonElement>('#integrity-toggle')!;
    this.body = document.querySelector<HTMLDivElement>('#integrity-body')!;
    this.hashEl = document.querySelector<HTMLElement>('#integrity-hash')!;
    this.seedEl = document.querySelector<HTMLElement>('#integrity-seed')!;
    this.nonceEl = document.querySelector<HTMLElement>('#integrity-nonce')!;
    this.crashEl = document.querySelector<HTMLElement>('#integrity-crash')!;

    toggle.addEventListener('click', () => this.body.classList.toggle('hidden'));

    // The commitment ticker only ever updates the "next round" line;
    // the last played round's verification stays until the next reveal.
    engine.on('commit', ({ commitHash, nonce }) => {
      this.hashEl.textContent = `${commitHash.slice(0, 24)}… (nonce ${nonce})`;
    });

    engine.on('revealed', ({ commitHash, nonce, seed, crashPoint }) => {
      void this.showVerification(commitHash, nonce, seed, crashPoint);
    });
  }

  private async showVerification(
    commitHash: string,
    nonce: number,
    seed: string,
    playedCrash: number,
  ): Promise<void> {
    const recomputed = crashFromDigest(await sha256Hex(digestInput(seed, nonce)));
    this.hashEl.textContent = `${commitHash.slice(0, 24)}… (nonce ${nonce})`;
    this.seedEl.textContent = seed;
    this.nonceEl.textContent = String(nonce);
    const match = recomputed === playedCrash ? '✓ verified' : '✗ MISMATCH';
    this.crashEl.textContent = `played x${playedCrash.toFixed(2)} · recomputed x${recomputed.toFixed(2)} ${match}`;
  }
}
