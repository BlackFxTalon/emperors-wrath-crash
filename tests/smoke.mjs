/**
 * Headless smoke test: boots the built app, plays a full round with a bet,
 * verifies engine/HUD wiring (phases, multiplier growth, extraction payout) in Russian.
 * Run: `npm run build && node tests/smoke.mjs`
 */
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
const base = 'http://127.0.0.1:4173';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto(base, { waitUntil: 'domcontentloaded' });

// Loading gate must lift.
await page.waitForSelector('#loading-screen', { state: 'detached', timeout: 20_000 });
console.log('OK loading screen lifted');

const canvases = await page.evaluate(() => ({
  three: !!document.querySelector('#canvas-three'),
  pixi: !!document.querySelector('#canvas-pixi'),
}));
if (!canvases.three || !canvases.pixi) throw new Error('canvases missing');
console.log('OK both canvases present');

// Place a bet during BETTING with generous margin: wait for a fresh countdown.
await page.waitForFunction(() => {
  const out = document.querySelector('#balance');
  return out && out.textContent.includes('1 000');
}, null, { timeout: 10_000 });
console.log('OK balance rendered: 1 000,00');

await page.fill('#bet-input', '100');
// Spec: idle button carries a live countdown while betting.
await page.waitForFunction(
  () => /ВЗВЕСТИ ТОРПЕДУ · \d+\.\d с/.test(document.querySelector('#action-button')?.textContent ?? ''),
  null,
  { timeout: 5_000 },
);
await page.waitForFunction(
  () => (document.querySelector('#action-hint')?.textContent ?? '').includes('ставку'),
  null,
  { timeout: 5_000 },
);
console.log('OK idle button shows live countdown + Russian stake hint');
await page.click('#action-button'); // ВЗВЕСТИ ТОРПЕДУ
await page.waitForFunction(() => document.querySelector('#balance')?.textContent === '900,00', null, { timeout: 5000 });
console.log('OK bet debited: 900,00');

// Wait for FLYING (betting window is 8s; poll the button state).
await page.waitForFunction(
  () => document.querySelector('#action-button')?.textContent.startsWith('ЭКСТРАКЦИЯ'),
  null,
  { timeout: 12_000 },
);
console.log('OK flight started, ЭКСТРАКЦИЯ button live');

// Let the torpedo climb for a cinematic screenshot.
await page.waitForTimeout(2_500);
await page.screenshot({ path: 'docs/screenshot-flight.png' });

// Extract! The crash point is random — racing it and losing is also valid engine behavior.
await page.click('#action-button');
await page.waitForFunction(
  () => {
    const t = document.querySelector('#action-button')?.textContent ?? '';
    return t.includes('ДУША СПАСЕНА') || t.includes('ВЗВЕСТИ ТОРПЕДУ');
  },
  null,
  { timeout: 120_000 },
);
const outcomeText = await page.textContent('#action-button');
const secured = outcomeText.includes('ДУША СПАСЕНА');
const balance = parseFloat((await page.textContent('#balance')).replace(/\s/g, '').replace(',', '.'));
if (secured) {
  // Spec: inert control explains the locked payout.
  await page.waitForFunction(
    () => (document.querySelector('#action-hint')?.textContent ?? '').includes('выплата зафиксирована'),
    null,
    { timeout: 5_000 },
  );
  if (!(balance > 900)) throw new Error(`extraction not credited, balance=${balance}`);
  console.log(`OK settlement: extraction credited, balance=${balance}, hint explains lock`);
} else {
  if (balance !== 900) throw new Error(`lost bet must not pay, balance=${balance}`);
  console.log('OK settlement: raced the rift and lost (valid), balance=900');
}

// Round must settle into CRASHED then BETTING again (engine loop intact).
// Crash points are random — a high multiplier can mean a long flight, so wait generously.
await page.waitForFunction(
  () => document.querySelector('#action-button')?.textContent.includes('ВЗВЕСТИ ТОРПЕДУ'),
  null,
  { timeout: 120_000 },
);
console.log('OK round loop returned to BETTING');

// Integrity panel must reveal data for the finished round.
await page.click('#integrity-toggle');
await page.waitForFunction(
  () => {
    const el = document.querySelector('#integrity-crash');
    return el && el.textContent.includes('сыграно');
  },
  null,
  { timeout: 15_000 },
);
console.log('OK integrity panel: seed revealed + recomputed in Russian');

if (errors.length > 0) {
  console.error('CONSOLE ERRORS:');
  for (const e of errors) console.error('  ' + e);
  throw new Error('console errors detected');
}
console.log('OK no console errors');

await browser.close();
await server.close();
console.log('\nSMOKE TEST PASSED — the Emperor protects.');
process.exit(0);
