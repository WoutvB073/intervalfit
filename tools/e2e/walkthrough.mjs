// Rondgang als nieuwe gebruiker (zonder ontwikkelaarsmodus), met screenshots van elk scherm.
// Gebruik: node walkthrough.mjs [basis-url] [thema]  → wt-XX-naam.png
// 1) iPhone Safari: link openen → installatiescherm (+ gedeelde link)
// 2) Als geïnstalleerde app: Home, nieuwe workout, bibliotheek, editor, speler, pauze, stoppen, overzicht,
//    voortgang, delen, importeren, instellingen, hulp. Controleert ook dat er nergens ontwikkelaarsfuncties zichtbaar zijn.
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const THEME = process.argv[3] ?? 'fris';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const devSeen = [];
let shot = 0;
let n = 0;

async function newPage(standalone) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, userAgent: IPHONE });
  if (standalone) await page.evaluateOnNewDocument(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
  // Versnelde klok (de speler rekent met Date.now), zodat een workout in seconden echt afloopt.
  await page.evaluateOnNewDocument(() => {
    const real = Date.now.bind(Date);
    window.__off = 0;
    Date.now = () => real() + window.__off;
  });
  return page;
}
const snap = async (page, name, full = false) => {
  const f = `wt-${String(++shot).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f, fullPage: full });
  // Ontwikkelaarsfuncties mogen nergens zichtbaar zijn.
  const dev = await page.evaluate(() => {
    const t = document.body.innerText;
    return ['Ontwikkelaarsmodus', 'Nep-geschiedenis', 'Galerij', 'Test-workout', 'fases'].filter((w) => t.includes(w)).concat(document.querySelector('.dev-badge, .card--dev, .player__debug') ? ['dev-element'] : []);
  });
  if (dev.length) devSeen.push(`${f}: ${dev.join(', ')}`);
  return f;
};
const click = async (page, sel, text) => {
  const ok = await page.evaluate(
    (sel, text) => {
      const el = [...document.querySelectorAll(sel)].find((b) => !text || b.textContent.includes(text));
      el?.click();
      return !!el;
    },
    sel,
    text ?? null,
  );
  if (!ok) throw new Error(`niet gevonden: ${sel} ${text ?? ''}`);
  await sleep(500);
};

// ── 1. Safari: installatiescherm ──
let page = await newPage(false);
await page.goto(`${BASE}?dev=0`, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}?r=${n++}`, { waitUntil: 'networkidle0' });
await sleep(500);
await snap(page, 'installeren', true);
await page.close();

// ── 2. Geïnstalleerde app ──
page = await newPage(true);
await page.goto(`${BASE}?dev=0`, { waitUntil: 'networkidle0' });
await page.evaluate((theme) => {
  localStorage.clear();
  if (theme !== 'fris') localStorage.setItem('intervalfit.settings', JSON.stringify({ theme }));
}, THEME);
await page.goto(`${BASE}?r=${n++}`, { waitUntil: 'networkidle0' });
await sleep(700);
await snap(page, 'home-eerste-keer', true);

// Nieuwe workout
await click(page, 'button', 'Nieuwe workout');
await sleep(400);
await snap(page, 'editor-leeg', true);
await page.type('.field__input--big', 'Mijn ochtendrondje');
await click(page, 'button', 'Oefening toevoegen');
await sleep(500);
await snap(page, 'bibliotheek');
for (const name of ['Squats', 'Opdrukken', 'Plank', 'Jumping jacks']) await click(page, '.lib-tile', name);
await snap(page, 'bibliotheek-gekozen');
await click(page, '.lib-footer button');
await sleep(600);
await snap(page, 'editor-gevuld', true);
// Oefening-paneel
await click(page, '.ex-row__main, .ex-row button');
await sleep(500);
await snap(page, 'oefening-paneel');
await page.keyboard.press('Escape');
await sleep(600);
await click(page, 'button', 'Opslaan');
await sleep(700);
await snap(page, 'home-met-nieuwe', true);

// Afspelen (eerste keer: tips)
await click(page, '.workout-card__start');
await sleep(800);
await snap(page, 'speler-tips');
await click(page, 'button', 'Begrepen');
await sleep(1500);
await snap(page, 'speler-aftellen');
await page.evaluate(() => window.__player?.session.skip());
const skip = async () => {
  await page.click('.player__ctrl[aria-label="Overslaan"]');
  await sleep(300);
};
await sleep(300);
await skip();
await sleep(900);
await snap(page, 'speler-werk');
await skip();
await sleep(900);
await snap(page, 'speler-rust');
await page.click('.player__ctrl--main');
await sleep(700);
await snap(page, 'speler-pauze');
await click(page, '.player__pause-stop');
await sleep(600);
await snap(page, 'speler-stoppen-vraag');
await click(page, '.dialog button', 'Doorgaan');
await sleep(400);
// Was al gepauzeerd: weer verder
await click(page, '.player__pause-btn');
// Versneld laten aflopen tot het einde (echt afgerond, niet overgeslagen)
for (let i = 0; i < 400; i++) {
  const done = await page.evaluate(() => !document.querySelector('.player__ctrl[aria-label="Overslaan"]'));
  if (done) break;
  await page.evaluate(() => (window.__off += 3000));
  await sleep(40);
}
await sleep(2500);
await snap(page, 'overzicht');
await snap(page, 'overzicht-heel', true);
await click(page, '.summary__actions button', 'Klaar');
await sleep(700);
await snap(page, 'home-na-workout', true);
await click(page, '.streak-card');
await sleep(600);
await snap(page, 'voortgang', true);
await page.goBack();
await sleep(600);

// Delen en importeren
await click(page, '.workout-card .icon-btn--quiet');
await sleep(500);
await snap(page, 'meer-menu');
await click(page, '.sheet-action', 'Delen');
await sleep(600);
await snap(page, 'delen');
await page.keyboard.press('Escape');
await sleep(700);
await click(page, '.import-btn');
await sleep(600);
await snap(page, 'importeren');
await page.keyboard.press('Escape');
await sleep(700);

// Instellingen + hulp
await click(page, '.icon-btn[aria-label="Instellingen"]');
await sleep(600);
await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
await sleep(200);
await snap(page, 'instellingen', true);

// Ontwikkelaarsroutes als gewone gebruiker
await page.goto(`${BASE}?r=${n++}#/galerij`, { waitUntil: 'networkidle0' });
await sleep(600);
await snap(page, 'galerij-als-gebruiker');

console.log(JSON.stringify({ screenshots: shot, devSeen, errors }, null, 1));
await browser.close();
