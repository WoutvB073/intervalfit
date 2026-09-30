// Bibliotheek: materiaalfilter en -labels; screenshots van bibliotheek en galerij (nieuwe oefeningen) per thema.
// Gebruik: node library-test.mjs [basis-url] [thema's]
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const THEMES = (process.argv[3] ?? 'fris,sportief,vrolijk,pastel').split(',');
const NEW_NAMES = ['Step-ups', 'Single-leg bridge links', 'Single-leg bridge rechts', 'Pike push-ups', 'Plank up-downs', 'V-ups', 'Hielen tikken', 'Bicep curls', 'Hammer curls', 'Pull-ups', 'Chin-ups', 'Hangend knieheffen'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const setTheme = async (theme) => {
  await page.goto(`${BASE}?dev=1&r=${n++}`, { waitUntil: 'load' });
  await page.evaluate((theme) => {
    localStorage.setItem('intervalfit.dev', '1');
    localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
    const s = JSON.parse(localStorage.getItem('intervalfit.settings') || '{}');
    localStorage.setItem('intervalfit.settings', JSON.stringify({ ...s, theme }));
  }, theme);
};
const clickChip = async (text) => {
  await page.evaluate((text) => [...document.querySelectorAll('.lib-chips--gear .chip')].find((c) => c.textContent.trim() === text).click(), text);
  await sleep(250);
};
const tiles = () => page.$$eval('.lib-tile', (els) => els.map((e) => ({ name: e.querySelector('.lib-tile__name').textContent, gear: e.querySelector('.lib-tile__gear')?.textContent ?? '' })));

for (const theme of THEMES) {
  await setTheme(theme);
  await page.goto(`${BASE}?dev=1&r=${n++}#/workout/nieuw`, { waitUntil: 'load' });
  await sleep(600);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Oefening toevoegen')).click());
  await sleep(700);
  if (theme === THEMES[0]) {
    const all = await tiles();
    check(all.length === 51, `Alles: ${all.length} oefeningen`);
    await clickChip('Zonder materiaal');
    const none = await tiles();
    check(none.length === 44 && none.every((t) => !t.gear), `Zonder materiaal: ${none.length}, zonder labels`);
    await clickChip('Dumbbells');
    const db = await tiles();
    check(db.map((t) => t.name).join() === 'Bicep curls,Hammer curls' && db.every((t) => t.gear.includes('Dumbbells')), `Dumbbells: ${db.map((t) => t.name + ' [' + t.gear + ']').join(', ')}`);
    await clickChip('Optrekstang');
    const bar = await tiles();
    check(bar.length === 3 && bar.every((t) => t.gear.includes('Stang')), `Optrekstang: ${bar.map((t) => t.name).join(', ')}`);
    await clickChip('Stoel of trap');
    const chair = await tiles();
    check(chair.length === 2, `Stoel of trap: ${chair.map((t) => t.name).join(', ')}`);
    // Filter + categorie + zoeken samen
    await page.evaluate(() => [...document.querySelectorAll('.lib-chips:not(.lib-chips--gear) .chip')].find((c) => c.textContent === 'Core').click());
    await sleep(200);
    check((await tiles()).length === 0 && !!(await page.$('.lib-empty')), 'Stoel + Core: nette lege melding');
    await page.evaluate(() => [...document.querySelectorAll('.lib-chips:not(.lib-chips--gear) .chip')].find((c) => c.textContent === 'Alles').click());
    await clickChip('Alle materialen');
    await page.type('.lib-search input', 'optrekken');
    await sleep(250);
    check((await tiles()).map((t) => t.name).sort().join() === 'Chin-ups,Pull-ups', 'zoeken "optrekken" → pull-ups en chin-ups');
    await page.evaluate(() => (document.querySelector('.lib-search input').value = ''));
    await page.click('.lib-search__clear');
    await sleep(250);
  }
  await clickChip('Alle materialen');
  // In beeld schuiven: de tegels met materiaal (bovenlichaam)
  await page.evaluate(() => [...document.querySelectorAll('.lib-chips:not(.lib-chips--gear) .chip')].find((c) => c.textContent === 'Bovenlichaam').click());
  await sleep(300);
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.lib-tile')].find((e) => e.textContent.includes('Pike'));
    t.scrollIntoView({ block: 'center' });
  });
  await sleep(500);
  await page.screenshot({ path: `lib-${theme}.png` });

  // Galerij: alleen de nieuwe oefeningen (stilstaand beeld per kaart)
  await page.goto(`${BASE}?dev=1&r=${n++}#/galerij`, { waitUntil: 'load' });
  await sleep(600);
  await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 1 });
  await page.evaluate((keep) => {
    document.querySelectorAll('.gallery-card').forEach((c) => {
      c.style.display = keep.includes(c.querySelector('.gallery-card__name').textContent) ? '' : 'none';
    });
    document.querySelector('.chips').style.display = 'none';
  }, NEW_NAMES);
  await sleep(1300);
  await page.screenshot({ path: `gal-${theme}.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
}
check(errors.length === 0, `geen fouten ${errors.join(' | ')}`);
console.log(fails ? `\n${fails} MISLUKT` : '\nAlles geslaagd');
await browser.close();
process.exit(fails ? 1 : 0);
