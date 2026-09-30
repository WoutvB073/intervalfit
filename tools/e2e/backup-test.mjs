// Back-up: exporteren (download), workouts wissen, terugzetten via "Kies bestand".
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const dl = path.resolve('downloads');
fs.rmSync(dl, { recursive: true, force: true });
fs.mkdirSync(dl);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`${BASE}?dev=1`, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('intervalfit.dev', '1');
});
await page.goto(`${BASE}?dev=1&a=1#/`, { waitUntil: 'load' });
await sleep(800);

// Eigen foto toevoegen aan de eerste oefening van workout 1 (via de editor)
const id = await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts'])[0].id);
await page.goto(`${BASE}?dev=1&a=2#/workout/${id}`, { waitUntil: 'load' });
await sleep(800);
await page.evaluate(() => document.querySelector('.ex-row:nth-child(1) .ex-row__main').click());
await sleep(700);
const [input] = await page.$$('.photo-actions input[type=file]');
await input.uploadFile(path.resolve('testfoto.png'));
await page.waitForSelector('.ex-sheet__visual .ex-visual--photo', { timeout: 10000 });
await page.evaluate(() => [...document.querySelectorAll('.ex-sheet__footer button')].find((b) => b.textContent.includes('Klaar')).click());
await sleep(500);
await page.evaluate(() => document.querySelector('.save-bar .btn').click());
await sleep(800);

// Exporteren
await page.goto(`${BASE}?dev=1&a=3#/instellingen`, { waitUntil: 'load' });
await page.waitForFunction(() => [...document.querySelectorAll('.backup-actions button')].some((b) => /Back-up maken \(/.test(b.textContent)), { timeout: 10000 });
await page.evaluate(() => [...document.querySelectorAll('.backup-actions button')].find((b) => b.textContent.includes('Back-up maken')).click());
await sleep(1500);
const files = fs.readdirSync(dl);
const backup = JSON.parse(fs.readFileSync(path.join(dl, files[0]), 'utf8'));
console.log('bestand:', files[0], '| workouts:', backup.workouts.length, '| foto\'s:', Object.keys(backup.photos ?? {}).length);

// Alles wissen (alsof het een nieuwe telefoon is) en terugzetten
await page.evaluate(() => {
  localStorage.setItem('intervalfit.workouts', '[]');
  indexedDB.deleteDatabase('intervalfit-photos');
});
await page.goto(`${BASE}?dev=1&a=4#/instellingen`, { waitUntil: 'load' });
await sleep(800);
const imp = await page.$('.backup-actions input[type=file]');
await imp.uploadFile(path.join(dl, files[0]));
await sleep(1500);
const toast = await page.evaluate(() => document.querySelector('.toast')?.textContent);
const after = await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts']).map((w) => w.name));
console.log('melding:', toast, '| workouts na terugzetten:', after);
// Nogmaals terugzetten: niets dubbel
await imp.uploadFile(path.join(dl, files[0]));
await sleep(1200);
console.log('tweede keer:', await page.evaluate(() => document.querySelector('.toast')?.textContent), '| aantal:', await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts']).length));
// Foto terug?
await page.goto(`${BASE}?dev=1&a=5#/`, { waitUntil: 'load' });
await sleep(1200);
console.log('foto zichtbaar op Home:', await page.evaluate(() => !!document.querySelector('.workout-card .ex-visual--photo')));
// Fout bestand
fs.writeFileSync('fout.json', '{"hallo": 1}');
await page.goto(`${BASE}?dev=1&a=6#/instellingen`, { waitUntil: 'load' });
await sleep(800);
await (await page.$('.backup-actions input[type=file]')).uploadFile(path.resolve('fout.json'));
await sleep(800);
console.log('verkeerd bestand:', await page.evaluate(() => document.querySelector('.toast')?.textContent));
console.log('fouten:', errors.length ? errors : 'geen');
await browser.close();
