// Per thema: Home, editor, speler (werk en rust) naast elkaar; plus instellingen.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const THEMES = (process.argv[3] ?? 'fris,sportief,vrolijk,pastel').split(',');
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const load = async (hash, theme) => {
  await page.goto(`${BASE}?dev=1&r=${n++}${hash}`, { waitUntil: 'load' });
  await page.evaluate((theme) => {
    if (!localStorage.getItem('intervalfit.schema')) return;
    const s = JSON.parse(localStorage.getItem('intervalfit.settings') || '{}');
    if (s.theme !== theme) {
      s.theme = theme;
      localStorage.setItem('intervalfit.settings', JSON.stringify(s));
      location.reload();
    }
  }, theme);
  await sleep(1200);
};
await page.goto(`${BASE}?dev=1`, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('intervalfit.dev', '1');
  localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
});

for (const theme of THEMES) {
  const shots = [];
  const shot = async (name) => {
    const f = `th-${theme}-${name}.png`;
    await page.screenshot({ path: f });
    shots.push(f);
  };
  await load('#/', theme);
  await load('#/', theme);
  await shot('home');
  const id = await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts'])[1].id);
  await load(`#/workout/${id}`, theme);
  await shot('editor');
  await load('#/', theme);
  await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout')).click());
  await sleep(700);
  await page.evaluate(() => window.__player.session.skip());
  await sleep(1300);
  await shot('werk');
  await page.evaluate(() => window.__player.session.skip());
  await sleep(1300);
  await shot('rust');
  const imgs = shots.map((f) => PNG.sync.read(fs.readFileSync(f)));
  const out = new PNG({ width: imgs.reduce((s, i) => s + i.width + 12, -12), height: imgs[0].height });
  out.data.fill(255);
  let x = 0;
  for (const im of imgs) {
    PNG.bitblt(im, out, 0, 0, im.width, im.height, x, 0);
    x += im.width + 12;
  }
  fs.writeFileSync(`theme-${theme}.png`, PNG.sync.write(out));
  // Instellingen (volledige pagina)
  await load('#/instellingen', theme);
  await page.screenshot({ path: `settings-${theme}.png`, fullPage: true });
}
console.log('fouten:', errors.length ? errors : 'geen');
await browser.close();
