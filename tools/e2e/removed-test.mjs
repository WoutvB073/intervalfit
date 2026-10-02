// Verwijderde oefening (fire hydrants): bestaande workout (oude opslag), back-up en oude deellink blijven werken.
// Gebruik: node removed-test.mjs [basis-url]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import lz from 'lz-string';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const old = {
  id: 'oud1', name: 'Billen (oud)', rounds: 2, restSec: 10, roundRestSec: 30, createdAt: 1, updatedAt: 1,
  exercises: [
    { id: 'x1', libraryId: 'squats', name: 'Squats', workSec: 20 },
    { id: 'x2', libraryId: 'fire-hydrants', name: 'Fire hydrants', workSec: 25, restSec: 5 },
  ],
};

// 1. Oude opslag (schema 1) met fire hydrants → na het openen een eigen oefening
await page.goto(`${BASE}?dev=1`, { waitUntil: 'networkidle0' });
await page.evaluate((old) => {
  localStorage.clear();
  localStorage.setItem('intervalfit.dev', '1');
  localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
  localStorage.setItem('intervalfit.schema', '1');
  localStorage.setItem('intervalfit.workouts', JSON.stringify([old]));
}, old);
await page.goto(`${BASE}?dev=1&r=1#/`, { waitUntil: 'networkidle0' });
await sleep(600);
const stored = await page.evaluate(() => ({ schema: localStorage.getItem('intervalfit.schema'), w: JSON.parse(localStorage.getItem('intervalfit.workouts'))[0] }));
const fh = stored.w.exercises[1];
check(stored.schema === '2', `opslag bijgewerkt naar schema ${stored.schema}`);
check(!('libraryId' in fh) && fh.name === 'Fire hydrants' && fh.workSec === 25 && fh.restSec === 5, `workout omgezet: ${JSON.stringify(fh)}`);
const thumbs = await page.$$eval('.workout-card .thumb', (t) => t.map((x) => x.className + ':' + x.textContent));
check(thumbs.some((t) => /F$/.test(t)), `letter-tegel "F" op Home (${thumbs.join(' | ')})`);
await page.screenshot({ path: 'removed-home.png' });

// Afspelen: de workout start en toont de eigen oefening
await page.evaluate(() => document.querySelector('.workout-card__start').click());
await sleep(800);
for (let i = 0; i < 3; i++) {
  await page.click('.player__ctrl[aria-label="Overslaan"]');
  await sleep(300);
}
const label = await page.evaluate(() => document.querySelector('.player__label')?.textContent);
check(label === 'Fire hydrants', `speler toont "${label}"`);
await page.screenshot({ path: 'removed-speler.png' });

// 2. Back-up met fire hydrants terugzetten
const backup = { app: 'IntervalFit', version: 1, workouts: [{ ...old, id: 'oud2', name: 'Uit back-up' }], history: [], photos: {} };
fs.writeFileSync('downloads-backup-fh.json', JSON.stringify(backup));
await page.goto(`${BASE}?dev=1&r=2#/instellingen`, { waitUntil: 'networkidle0' });
await page.waitForSelector('input[type=file]');
const input = await page.$('input[type=file]');
await input.uploadFile('downloads-backup-fh.json');
await sleep(800);
const fromBackup = await page.evaluate(() => JSON.parse(localStorage.getItem('intervalfit.workouts')).find((w) => w.name === 'Uit back-up'));
check(!!fromBackup && !('libraryId' in fromBackup.exercises[1]) && fromBackup.exercises[1].name === 'Fire hydrants', 'back-up: fire hydrants als eigen oefening');
fs.unlinkSync('downloads-backup-fh.json');

// 3. Oude deellink (bibliotheekoefening zonder eigen naam)
const code = lz
  .compressToEncodedURIComponent(JSON.stringify({ v: 1, n: 'Oude link', r: 2, s: 15, q: 45, e: [['squats', '', 40], ['fire-hydrants', '', 30]] }))
  .replace(/\+/g, '~')
  .replace(/\$/g, '_');
await page.goto(`${BASE}?dev=1&r=3#/deel/${code}`, { waitUntil: 'networkidle0' });
await sleep(600);
const preview = await page.evaluate(() => document.body.innerText);
check(/Fire hydrants/.test(preview) && /Squats/.test(preview), 'oude deellink toont beide oefeningen');

// 4. Niet meer in de bibliotheek
await page.goto(`${BASE}?dev=1&r=4#/workout/nieuw`, { waitUntil: 'networkidle0' });
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Oefening toevoegen')).click());
await sleep(600);
await page.type('.lib-search input', 'fire');
await sleep(300);
check((await page.$$('.lib-tile')).length === 0, 'zoeken op "fire": niets in de bibliotheek');

check(errors.length === 0, `geen fouten ${errors.join(' | ')}`);
console.log(fails ? `\n${fails} MISLUKT` : '\nAlles geslaagd');
await browser.close();
process.exit(fails ? 1 : 0);
