// Maakt de iPhone-opstartschermen (apple-touch-startup-image) uit public/logo.svg.
// Gebruik (na een logowijziging): node tools/splash.mjs
// Schrijft public/splash/*.png en toont de <link>-regels voor index.html.
// Android maakt zijn opstartscherm zelf uit het manifest (icoon + background_color).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'public', 'splash');
fs.mkdirSync(out, { recursive: true });

// [schermbreedte, schermhoogte (CSS-pixels), pixelverhouding] — iPhone SE (2e/3e) en iPhone 11 t/m 17.
const DEVICES = [
  [375, 667, 2], // SE 2/3, 8
  [414, 896, 2], // 11, XR
  [375, 812, 3], // 11 Pro, X, XS, 12 mini, 13 mini
  [414, 896, 3], // 11 Pro Max, XS Max
  [390, 844, 3], // 12, 13, 14, 16e
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [420, 912, 3], // Air
];

// Lettertype en logo ingebed (een pagina via setContent mag geen lokale bestanden laden).
const font = 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2')).toString('base64');
const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'public/logo.svg')).toString('base64');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: 'PJS'; src: url('${font}') format('woff2'); font-weight: 200 800; }
html, body { margin: 0; height: 100%; }
body {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
  background: radial-gradient(120% 60% at 100% 0%, #d9f6ea 0%, rgba(217,246,234,0) 60%),
              radial-gradient(90% 50% at 0% 0%, #e3f1fb 0%, rgba(227,241,251,0) 55%), #f3faf7;
  font-family: 'PJS', sans-serif;
}
img { width: 112px; height: 112px; border-radius: 26px; box-shadow: 0 16px 40px -14px rgba(6, 122, 79, 0.55); }
h1 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.03em; color: #0f2a24; }
</style><img src="${logo}"><h1>IntervalFit</h1>`;

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const links = [];
for (const [w, h, dpr] of DEVICES) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const name = `splash-${w * dpr}x${h * dpr}.png`;
  await page.screenshot({ path: path.join(out, name) });
  links.push(
    `    <link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="/intervalfit/splash/${name}" />`,
  );
}
await browser.close();
console.log(links.join('\n'));

// Verkleinen: kleurenpalet (de zachte verlopen blijven mooi, bestanden worden veel kleiner).
const sharp = (await import('sharp')).default;
for (const f of fs.readdirSync(out)) {
  const p = path.join(out, f);
  const buf = await sharp(p).png({ palette: true, quality: 90, effort: 10, compressionLevel: 9, dither: 0.6 }).toBuffer();
  fs.writeFileSync(p, buf);
}
