// Speler: screenshots van de fases + controle van het geluid/spraak-logboek.
// Gebruik: node player-test.mjs [basis-url]
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
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
});
await page.goto(`${BASE}?dev=1`, { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('intervalfit.dev', '1');
  localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
});
await page.reload({ waitUntil: 'networkidle0' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phaseInfo = () =>
  page.evaluate(() => {
    const s = window.__player?.session;
    return s ? { i: s.index, type: s.phase?.type, status: s.status, left: +s.remaining().toFixed(2) } : null;
  });
const waitFor = async (pred, timeout = 60000) => {
  const t0 = Date.now();
  for (;;) {
    const p = await phaseInfo();
    if (p && pred(p)) return p;
    if (Date.now() - t0 > timeout) throw new Error('timeout ' + JSON.stringify(p));
    await sleep(100);
  }
};

// Start via de echte knop (tik = gebruikersactie, net als op de iPhone).
await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout')).click());
const t0 = Date.now();
await sleep(1200);
await page.screenshot({ path: 'pl-countdown.png' });

await waitFor((p) => p.type === 'work' && p.left < 8);
await page.screenshot({ path: 'pl-work.png' });

await waitFor((p) => p.type === 'rest' && p.left < 4);
await page.screenshot({ path: 'pl-rest.png' });

// Pauze net vóór de piepjes van een werkfase: ingeplande geluiden moeten weg.
await waitFor((p) => p.type === 'work' && p.left < 3.6 && p.left > 3.2);
const beforePause = await page.evaluate(() => window.__cueLog.length);
await page.evaluate(() => document.querySelector('.player__ctrl--main').click());
const pausedAt = Date.now();
await sleep(400);
await page.screenshot({ path: 'pl-pause.png' });
await sleep(2600);
const pauseLog = await page.evaluate((n) => window.__cueLog.slice(n), beforePause);
await page.evaluate(() => document.querySelector('.player__pause-btn').click());
const resumedAt = Date.now();

// Overslaan tijdens rust
await waitFor((p) => p.type === 'rest' && p.left < 4.5);
await page.evaluate(() => document.querySelector('.player__ctrl[aria-label="Overslaan"]').click());
const afterSkip = await phaseInfo();

// SE-formaat en liggend
await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await sleep(700);
await page.screenshot({ path: 'pl-se.png' });
await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await sleep(700);
await page.screenshot({ path: 'pl-landscape.png' });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

// Tot het einde laten lopen
await waitFor((p) => p.status === 'finished', 120000);
await sleep(2500);
await page.screenshot({ path: 'pl-done.png' });
const summary = await page.evaluate(() => ({ hash: location.hash, headline: document.querySelector('.summary__headline')?.textContent, history: JSON.parse(localStorage.getItem('intervalfit.history') || '[]').length }));
console.log('overzicht:', JSON.stringify(summary));

const log = await page.evaluate(() => window.__cueLog);
const phases = await page.evaluate(() => window.__player.session.phases.map((p) => ({ type: p.type, d: p.durationSec, name: p.exercise.name })));
console.log(JSON.stringify({ t0, pausedAt, resumedAt, afterSkip, pauseLog, phases, log, errors }, null, 0));
await browser.close();
