// Gewijzigde animaties in de speler, per thema (screenshot tijdens het werk) + controle op overlap.
// Gebruik: node anim-themes.mjs [basis-url] [ids]  → at-<thema>-<id>.png
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const IDS = (process.argv[3] ?? 'russian-twists,pull-ups').split(',');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
for (const theme of ['fris', 'sportief', 'vrolijk', 'pastel']) {
  for (const id of IDS) {
    await page.goto(`${BASE}?dev=1&r=${n++}`, { waitUntil: 'networkidle0' });
    await page.evaluate((theme, id) => {
      localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
      localStorage.setItem('intervalfit.settings', JSON.stringify({ theme, countdown: { enabled: false, seconds: 10 } }));
      localStorage.setItem('intervalfit.workouts', JSON.stringify([{ id: 'w', name: 'Test', rounds: 1, restSec: 10, roundRestSec: 0, createdAt: 1, updatedAt: 1, exercises: [{ id: 'a', libraryId: id, name: id, workSec: 30 }] }]));
    }, theme, id);
    await page.goto(`${BASE}?dev=1&r=${n++}#/speel/w`, { waitUntil: 'networkidle0' });
    await sleep(500);
    await page.evaluate(() => document.querySelector('.player__tap')?.click());
    await sleep(1600);
    await page.screenshot({ path: `at-${theme}-${id}.png` });
  }
}
console.log('fouten:', errors.length ? errors : 'geen');
await browser.close();
