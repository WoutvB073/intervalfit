// Speler op alle formaten en fases: screenshots + automatische controle op overlap.
// Gebruik: node layout-test.mjs [basis-url] [thema]
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const THEME = process.argv[3] ?? 'fris';
const SIZES = [
  { name: 'iPhone SE', w: 375, h: 667 },
  { name: 'iPhone 14', w: 390, h: 844 },
  { name: 'Groot Android', w: 412, h: 915 },
  { name: 'Liggend 14', w: 844, h: 390 },
  { name: 'Liggend Android', w: 915, h: 412 },
];
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(`${BASE}?dev=1`, { waitUntil: 'networkidle0' });
await page.evaluate((theme) => {
  localStorage.clear();
  localStorage.setItem('intervalfit.dev', '1');
  localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
  localStorage.setItem('intervalfit.settings', JSON.stringify({ theme }));
}, THEME);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const overlapCheck = () =>
  page.evaluate(() => {
    const sel = ['.player__top', '.player__heading', '.player__visual', '.player__timer-wrap', '.player__controls'];
    const rects = sel.map((s) => [s, document.querySelector(s)?.getBoundingClientRect()]).filter(([, r]) => r && r.width > 0);
    const problems = [];
    for (let i = 0; i < rects.length; i++) {
      const [a, r] = rects[i];
      if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) problems.push(`${a} buiten beeld`);
      for (let j = i + 1; j < rects.length; j++) {
        const [b, q] = rects[j];
        const ox = Math.min(r.right, q.right) - Math.max(r.left, q.left);
        const oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
        if (ox > 1 && oy > 1) problems.push(`${a} overlapt ${b}`);
      }
    }
    const t = document.querySelector('.player__timer-wrap')?.getBoundingClientRect();
    return { problems, timer: t ? Math.round(t.width) : 0 };
  });

const results = [];
for (const size of SIZES) {
  await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}?dev=1&r=${size.w}${size.h}#/`, { waitUntil: 'load' });

  await sleep(800);
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout')).click());
  await sleep(900);
  const shots = [];
  const snap = async (label) => {
    await sleep(500);
    const file = `ly-${THEME}-${size.w}x${size.h}-${label}.png`;
    await page.screenshot({ path: file });
    const chk = await overlapCheck();
    results.push({ size: size.name, fase: label, timer: chk.timer, problemen: chk.problems });
    shots.push(file);
  };
  const skipTo = async (type) => {
    for (let k = 0; k < 20; k++) {
      const t = await page.evaluate(() => window.__player.session.phase.type);
      if (t === type) return;
      await page.evaluate(() => window.__player.session.skip());
      await sleep(80);
    }
  };
  await snap('aftellen');
  await skipTo('work');
  await snap('werk');
  await skipTo('rest');
  await snap('rust');
  await skipTo('roundRest');
  await snap('rondepauze');
  await page.evaluate(() => document.querySelector('.player__ctrl--main').click());
  await snap('pauze');
  // Blad: de 5 fases naast elkaar
  const imgs = shots.map((f) => PNG.sync.read(fs.readFileSync(f)));
  const gap = 12;
  const out = new PNG({ width: imgs.reduce((s, i) => s + i.width + gap, -gap), height: Math.max(...imgs.map((i) => i.height)) });
  out.data.fill(255);
  let x = 0;
  for (const im of imgs) {
    PNG.bitblt(im, out, 0, 0, im.width, im.height, x, 0);
    x += im.width + gap;
  }
  fs.writeFileSync(`sheet-${THEME}-${size.w}x${size.h}.png`, PNG.sync.write(out));
}
console.log(JSON.stringify({ results, errors }, null, 1));
await browser.close();
