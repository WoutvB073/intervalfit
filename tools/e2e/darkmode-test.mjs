// Donkere modus van telefoon/browser mag de gekozen thema's NIET veranderen.
// Per thema × scherm × modus een screenshot; de gemiddelde kleur moet gelijk blijven aan "alles licht".
//   modus 'licht'      : prefers-color-scheme light
//   modus 'donker'     : prefers-color-scheme dark (donkere modus van de telefoon)
//   modus 'geforceerd' : donkere modus + Chrome "Auto Dark Theme" (geforceerd donker maken van webpagina's,
//                         zoals Chrome op Android en Chromium-browsers zoals Samsung Internet/Opera/WebView dat doen)
// Gebruik: node darkmode-test.mjs [basis-url]   → dm-<thema>-<scherm>-<modus>.png + dm-overzicht.png
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const THEMES = ['fris', 'sportief', 'vrolijk', 'pastel'];
const MODES = ['licht', 'donker', 'geforceerd'];
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36';
const CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
let fails = 0;
const results = [];

/** Gemiddelde kleur (0–255) van een screenshot. */
function meanColor(buf) {
  const png = PNG.sync.read(buf);
  let r = 0, g = 0, b = 0;
  const px = png.width * png.height;
  for (let i = 0; i < png.data.length; i += 4) {
    r += png.data[i];
    g += png.data[i + 1];
    b += png.data[i + 2];
  }
  return [r / px, g / px, b / px];
}

const SCREENS = [
  { name: 'home', ua: CHROME, hash: '#/', dev: true },
  { name: 'instellingen', ua: SAMSUNG, hash: '#/instellingen', dev: true },
  { name: 'speler', ua: CHROME, hash: '#/', dev: true, player: true },
  { name: 'installeren', ua: SAMSUNG, hash: '#/', dev: false },
];

for (const theme of THEMES) {
  for (const screen of SCREENS) {
    const base = {};
    for (const mode of MODES) {
      const page = await browser.newPage();
      await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, userAgent: screen.ua });
      const cdp = await page.createCDPSession();
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode === 'licht' ? 'light' : 'dark' }]);
      await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: mode === 'geforceerd' });
      await page.goto(`${BASE}?dev=${screen.dev ? 1 : 0}&r=${n++}`, { waitUntil: 'networkidle0' });
      await page.evaluate((theme) => {
        localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
        localStorage.setItem('intervalfit.settings', JSON.stringify({ theme }));
      }, theme);
      await page.goto(`${BASE}?dev=${screen.dev ? 1 : 0}&r=${n++}${screen.hash}`, { waitUntil: 'networkidle0' });
      await sleep(700);
      if (screen.player) {
        await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout'))?.click());
        await sleep(1200);
      }
      const meta = await page.evaluate(() => ({
        colorScheme: document.querySelector('meta[name="color-scheme"]')?.content ?? '(geen)',
        cssScheme: getComputedStyle(document.documentElement).colorScheme,
        themeColor: document.querySelector('meta[name="theme-color"]')?.content,
      }));
      const buf = await page.screenshot({ path: `dm-${theme}-${screen.name}-${mode}.png` });
      const c = meanColor(buf);
      if (mode === 'licht') Object.assign(base, { c });
      const diff = Math.max(...c.map((v, i) => Math.abs(v - base.c[i])));
      const ok = diff < 6;
      if (!ok) fails++;
      results.push(`${ok ? '✓' : '✗'} ${theme.padEnd(8)} ${screen.name.padEnd(12)} ${mode.padEnd(10)} kleurverschil ${diff.toFixed(1).padStart(5)}  meta=${meta.colorScheme} css=${meta.cssScheme} statusbalk=${meta.themeColor}`);
      await page.close();
    }
  }
}
console.log(results.join('\n'));
console.log(fails ? `\n${fails} MISLUKT` : '\nAlles geslaagd: geen enkel thema verandert door (geforceerde) donkere modus');
await browser.close();
process.exit(fails ? 1 : 0);
