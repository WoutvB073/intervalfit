// Screenshot per oefening van de 8 momenten in de beweging (galerij/houdingen).
// Gebruik: node poses.mjs [id1,id2,...]   (leeg = alles)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const only = process.argv[2] ? process.argv[2].split(',') : null;
fs.mkdirSync('poses', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:5183/intervalfit/?dev=1#/galerij/houdingen', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));
const rows = await page.$$('.gallery-poses__row');
for (const row of rows) {
  const id = await row.$eval('small', (e) => e.textContent.replace(/[()]/g, ''));
  if (only && !only.includes(id)) continue;
  await row.screenshot({ path: `poses/${id}.png` });
}
console.log('klaar', rows.length, errors.length ? errors : '');
await browser.close();
