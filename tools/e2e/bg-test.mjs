// Wegschakelen: app 14 s verbergen tijdens een workout en weer terugkomen.
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.emulate({
  viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
});
// Zichtbaarheid zelf kunnen omzetten
await page.evaluateOnNewDocument(() => {
  let vis = 'visible';
  Object.defineProperty(Document.prototype, 'visibilityState', { get: () => vis, configurable: true });
  window.__setVis = (v) => {
    vis = v;
    document.dispatchEvent(new Event('visibilitychange'));
  };
});
await page.goto(`${BASE}?dev=1`, { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('intervalfit.dev', '1');
  localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
});
await page.reload({ waitUntil: 'networkidle0' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const info = () =>
  page.evaluate(() => {
    const s = window.__player.session;
    return { i: s.index, type: s.phase.type, left: +s.remaining().toFixed(2), status: s.status };
  });

await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout')).click());
await sleep(11500); // aftellen voorbij, ± 1,5 s in de eerste oefening
const before = await info();
const n = await page.evaluate(() => window.__cueLog.length);
await page.evaluate(() => window.__setVis('hidden'));
const hiddenAt = Date.now();
await sleep(14000);
const duringHidden = await page.evaluate((k) => window.__cueLog.slice(k).map((e) => e.type + ':' + e.what), n);
const m = await page.evaluate(() => window.__cueLog.length);
await page.evaluate(() => window.__setVis('visible'));
const shownAt = Date.now();
await sleep(300);
const after = await info();
await sleep(1500);
const afterLog = await page.evaluate((k) => window.__cueLog.slice(k), m);
// Verwachting: 11,5 + 14 s na de start = 25,5 s → aftellen 10 + werk 10 + rust 5 = 25 → 0,5 s in werk 2 (index 3)
console.log(JSON.stringify({ before, after, hiddenMs: shownAt - hiddenAt, duringHidden, afterLog: afterLog.map((e) => ({ type: e.type, what: e.what, inMs: e.at ? e.at - shownAt : null })), errors }, null, 1));
console.log('pauzescherm:', await page.evaluate(() => document.querySelector('.player__pause-reason')?.textContent));
await page.screenshot({ path: 'bg-after.png' });
await browser.close();
