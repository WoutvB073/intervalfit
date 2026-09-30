// Foto toevoegen aan een oefening: verkleinen, opslaan in IndexedDB, tonen, bewaren.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

// Grote testfoto (3000×2000) maken
const big = new PNG({ width: 3000, height: 2000 });
for (let i = 0; i < big.data.length; i += 4) {
  const p = i / 4;
  big.data[i] = (p % 3000) / 12;
  big.data[i + 1] = 120;
  big.data[i + 2] = Math.floor(p / 3000) / 8;
  big.data[i + 3] = 255;
}
fs.writeFileSync('testfoto.png', PNG.sync.write(big));

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
});
await page.evaluateOnNewDocument(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
await page.goto('http://localhost:5183/intervalfit/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  location.hash = '#/workout/' + JSON.parse(localStorage['intervalfit.workouts'])[0].id;
});
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => document.querySelector('.ex-row:nth-child(2) .ex-row__main').click());
await new Promise((r) => setTimeout(r, 800));
const inputs = await page.$$('.photo-actions input[type=file]');
console.log('bestandsvelden:', inputs.length, 'camera-veld capture =', await inputs[0].evaluate((e) => e.getAttribute('capture')));
await inputs[1].uploadFile('testfoto.png');
await page.waitForSelector('.ex-sheet__visual .ex-visual--photo', { timeout: 10000 });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: 'photo-sheet.png' });
const info = await page.evaluate(async () => {
  const img = document.querySelector('.ex-sheet__visual img');
  await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight };
});
console.log('opgeslagen foto:', info);
await page.evaluate(() => [...document.querySelectorAll('.ex-sheet__footer button')].find((b) => b.textContent.includes('Klaar')).click());
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => document.querySelector('.save-bar .btn').click());
await new Promise((r) => setTimeout(r, 900));
const saved = await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts'])[0].exercises[1]);
console.log('bewaard:', saved.name, 'photoId =', saved.photoId);
await page.screenshot({ path: 'photo-home.png' });
// Na herladen nog zichtbaar op Home?
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
console.log('na herladen foto op Home:', await page.evaluate(() => !!document.querySelector('.workout-card .ex-visual--photo')));
await browser.close();
