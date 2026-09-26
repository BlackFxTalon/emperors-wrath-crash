import './style.css';
import * as THREE from 'three';
import { createCrashEngine } from './engine/CrashEngine';
import type { Phase, TickEvent } from './engine/types';
import { ThreeScene, type SceneAssets } from './render/three/ThreeScene';
import { Hud } from './render/pixi/Hud';
import { BettingPanel } from './ui/bettingPanel';
import { IntegrityPanel } from './ui/integrityPanel';
import { loadBalance, saveBalance } from './ui/balance';

const SKY_URL = 'img/sky-hive.png';
const TORPEDO_URL = 'img/torpedo.png';

const loadingStatus = document.querySelector<HTMLElement>('#loading-status')!;
function setStatus(text: string): void {
  loadingStatus.textContent = text;
}

async function waitForFonts(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 54px "Ruslan Display"', 'ГНЕВ'),
        document.fonts.load('700 96px "Cormorant"', 'x1.00'),
        document.fonts.load('italic 600 19px "Cormorant"', 'торпеда'),
        document.fonts.load('600 16px "Cormorant"', 'ставка'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to Georgia silently */
  }
}

async function loadAssets(): Promise<SceneAssets> {
  setStatus('Будим Машинный дух…');
  const assets: SceneAssets = { sky: null, torpedo: null };

  const sky = await loadTexture(SKY_URL);
  if (sky) assets.sky = sky;
  else setStatus('Карта неба потеряна в Варпе — включаем фолбэки…');

  assets.torpedo = await loadTexture(TORPEDO_URL);
  if (!assets.torpedo) console.warn('[assets] torpedo.png failed — procedural fallback engaged');
  return assets;
}

async function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => resolve(tex),
      undefined,
      () => resolve(null),
    );
  });
}

async function boot(): Promise<void> {
  setStatus('Просим Астрономикон…');
  await waitForFonts();

  const engine = createCrashEngine({ initialBalance: loadBalance() });
  engine.on('balance', ({ value }) => saveBalance(value));

  const assets = await loadAssets();

  setStatus('Воспламеняем варп-двигатели…');
  const threeCanvas = document.querySelector<HTMLCanvasElement>('#canvas-three')!;
  const pixiCanvas = document.querySelector<HTMLCanvasElement>('#canvas-pixi')!;
  const scene = new ThreeScene();
  await scene.init(threeCanvas, assets);
  const hud = await Hud.create(pixiCanvas);

  // Reserve the DOM sheet's height so HUD text stays above it on phones.
  const sheet = document.querySelector<HTMLElement>('#bet-panel')!;
  const syncInset = () => hud.setBottomInset(sheet.offsetHeight + 16);
  new ResizeObserver(syncInset).observe(sheet);
  syncInset();

  // ── wiring: engine → renderers ───────────────────────────────────────
  let phase: Phase = 'BETTING';
  engine.on('phase', ({ phase: p }) => {
    phase = p;
    scene.setPhase(p);
    hud.setPhase(p);
    if (p === 'CRASHED') scene.detonate();
  });
  engine.on('crash', ({ crashPoint, lostBet }) => {
    hud.addHistory(crashPoint);
    if (lostBet) hud.toast('lose', 'ПОГЛОЩЕНО ВАРПОМ', `Разлом сомкнулся на x${crashPoint.toFixed(2)}`);
  });
  engine.on('extraction', ({ multiplier, payout, auto }) => {
    hud.toast(
      'win',
      `ДУША СПАСЕНА — x${multiplier.toFixed(2)}`,
      `${auto ? 'Авто-экстракция' : 'Ручная экстракция'} · +${payout.toFixed(2)} талера`,
    );
  });

  // ── panels ───────────────────────────────────────────────────────────
  new BettingPanel(engine);
  new IntegrityPanel(engine);

  await engine.start();

  // ── master loop ──────────────────────────────────────────────────────
  let latestTick: TickEvent = { phase: 'BETTING', multiplier: 1, countdown: null, bet: null };
  engine.on('tick', (t) => {
    latestTick = t;
  });

  const ticker = hud.ticker;
  ticker.start();
  let lastMs = performance.now();
  ticker.add(() => {
    const now = performance.now();
    const dtMs = now - lastMs;
    lastMs = now;

    engine.update(now);
    const flightSec = engine.flightTimeMs / 1000;
    scene.frame(dtMs / 1000, flightSec, engine.multiplier);
    hud.frame(latestTick, dtMs);
  });

  // ── lift the loading gate ────────────────────────────────────────────
  const loading = document.querySelector<HTMLElement>('#loading-screen')!;
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 900);
}

void boot().catch((err) => {
  console.error('[boot] the Machine-Spirit raged:', err);
  setStatus('Машинный дух взбунтовался. Перезапустите храм.');
});
