// App-icoonontwerpen in context: nagemaakt iPhone-beginscherm (donkere en lichte achtergrond) + vergelijkingsblad.
// Gebruik: node icon-shots.mjs [a,b,c]   → icon-home-<x>-<wall>.png, icon-vergelijking.png
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const icons = (process.argv[2] ?? 'a,b,c').split(',');
const dir = path.resolve('../../design/icon');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
for (const x of icons) {
  for (const wall of ['dark', 'light']) {
    await page.goto(`${pathToFileURL(path.join(dir, 'homescreen.html')).href}?icon=${x}&wall=${wall}`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: `icon-home-${x}-${wall}.png` });
  }
}
// Vergelijking: groot, beginscherm-formaat en klein (Instellingen/Spotlight), op licht en donker.
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;font-family:'Segoe UI',sans-serif;display:flex}
  .col{padding:28px 30px;display:flex;flex-direction:column;align-items:center;gap:18px}
  .col:nth-child(odd){background:#f2f2f7}.col:nth-child(even){background:#1c1c1e;color:#fff}
  h2{margin:0;font-size:20px} .row{display:flex;gap:18px;align-items:flex-end}
  img{display:block;border-radius:22.5%} .l{width:200px;height:200px}.m{width:64px;height:64px}.s{width:29px;height:29px}
</style>${icons
  .flatMap((x) =>
    ['licht', 'donker'].map(
      (t) => `<div class="col"><h2>${x.toUpperCase()} · ${t}</h2><img class="l" src="icon-${x}.svg"><div class="row"><img class="m" src="icon-${x}.svg"><img class="s" src="icon-${x}.svg"></div></div>`,
    ),
  )
  .join('')}`;
await page.goto(pathToFileURL(path.join(dir, 'homescreen.html')).href);
await page.setContent(html.replaceAll('src="icon-', `src="${pathToFileURL(dir).href}/icon-`), { waitUntil: 'load' });
await page.setViewport({ width: 1560, height: 380, deviceScaleFactor: 1 });
await page.screenshot({ path: 'icon-vergelijking.png', fullPage: true });
await browser.close();
console.log('klaar');
