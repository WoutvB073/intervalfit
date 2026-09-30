// Delen en importeren van begin tot eind.
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const ORIGIN = new URL(BASE).origin;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(ORIGIN, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (label, ok, extra = '') => results.push(`${ok ? 'OK  ' : 'FOUT'} ${label}${extra ? ' — ' + extra : ''}`);
const errors = [];
let n = 0;

async function phone(ua, { standalone = false } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setUserAgent(ua);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  // Geen echt deelmenu in de testbrowser: navigator.share weghalen zodat "kopiëren" wordt gebruikt.
  await page.evaluateOnNewDocument((sa) => {
    delete Navigator.prototype.share;
    delete Navigator.prototype.canShare;
    if (sa) Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true });
  }, standalone);
  return page;
}
async function fresh(page, extra = {}) {
  await page.goto(`${BASE}?r=${n++}`, { waitUntil: 'load' });
  await page.evaluate((extra) => {
    localStorage.clear();
    localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, extra);
  await page.goto(`${BASE}?r=${n++}#/`, { waitUntil: 'load' });
  await sleep(700);
}
const clickText = (page, sel, text) =>
  page.evaluate((sel, text) => [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text))?.click(), sel, text);

// 1. Afzender (iPhone, app): Delen → bericht kopiëren
const a = await phone(IPHONE, { standalone: true });
await fresh(a);
await a.click("[aria-label='Meer opties voor Buik & billen']");
await sleep(500);
await clickText(a, '.sheet-action', 'Delen');
await sleep(700);
await a.screenshot({ path: 'sh-share-sheet.png' });
await clickText(a, '.share-sheet button', 'Bericht kopiëren');
await sleep(500);
const message = await a.evaluate(() => navigator.clipboard.readText());
check('deelbericht gekopieerd', message.startsWith('Ik heb een workout voor je: Buik & billen (7 oefeningen, 18 min).'), message.slice(0, 90) + '…');
const url = /https?:\/\/\S+/.exec(message)[0];

// 2. Ontvanger (iPhone, app): Workout importeren → Plakken
const b = await phone(IPHONE, { standalone: true });
await fresh(b);
await b.evaluate((t) => navigator.clipboard.writeText(`[30-09 10:02] Wout: ${t}`), message);
await clickText(b, '.import-btn', 'Workout importeren');
await sleep(600);
await clickText(b, '.import-sheet button', 'Plakken');
await sleep(600);
await b.screenshot({ path: 'sh-import-found.png' });
check('plakken herkent WhatsApp-bericht', await b.evaluate(() => document.querySelector('.import-sheet__found .wpreview__name')?.textContent === 'Buik & billen'));
await clickText(b, '.import-sheet__found button', 'Toevoegen');
await sleep(900);
const bList = await b.evaluate(() => [...document.querySelectorAll('.workout-card__name')].map((e) => e.textContent));
check('na importeren eerst: dubbel-vraag (voorbeeldworkout bestaat al)', await b.evaluate(() => document.querySelector('.dialog__title')?.textContent === 'Nog een keer toevoegen?'));
await b.screenshot({ path: 'sh-duplicate.png' });
await clickText(b, '.dialog button', 'Ja, toevoegen');
await sleep(900);
const bList2 = await b.evaluate(() => [...document.querySelectorAll('.workout-card__name')].map((e) => e.textContent));
check('toegevoegd bovenaan', bList2[0] === 'Buik & billen' && bList2.length === bList.length + 1, JSON.stringify(bList2));
check('oplichten + melding', await b.evaluate(() => !!document.querySelector('.workout-card.is-new') && !!document.querySelector('.toast')?.textContent.includes('bovenaan')));
await b.screenshot({ path: 'sh-added.png' });

// 3. Nieuwe workout (niet dubbel) importeren via losse code in het tekstvak
const code = url.split('#/deel/')[1];
await b.evaluate(() => {
  const ws = JSON.parse(localStorage['intervalfit.workouts']);
  localStorage.setItem('intervalfit.workouts', JSON.stringify(ws.filter((w) => w.name !== 'Buik & billen')));
});
await b.goto(`${BASE}?r=${n++}#/`, { waitUntil: 'load' });
await sleep(600);
await clickText(b, '.import-btn', 'Workout importeren');
await sleep(500);
await b.type('.import-sheet__text', `Hier is de code: ${code}`);
await sleep(300);
await clickText(b, '.import-sheet__found button', 'Toevoegen');
await sleep(800);
check('losse code in tekst → direct toegevoegd (geen dubbel)', (await b.evaluate(() => document.querySelector('.workout-card__name')?.textContent)) === 'Buik & billen' && !(await b.$('.dialog')));
// Onzin plakken
await clickText(b, '.import-btn', 'Workout importeren');
await sleep(500);
await b.type('.import-sheet__text', 'hallo, hoe gaat het?');
await sleep(300);
check('onzin → vriendelijke melding', await b.evaluate(() => !!document.querySelector('.import-sheet .notice--warn')));

// 4. Link geopend in iPhone Safari (app al geïnstalleerd, eigen geheugen)
const c = await phone(IPHONE);
await c.goto(url.replace('https://woutvb073.github.io/intervalfit/', BASE), { waitUntil: 'load' });
await sleep(900);
await c.screenshot({ path: 'sh-ios-safari.png', fullPage: true });
check('iPhone Safari: stappenplan + kopieerknop, geen toevoegknop',
  await c.evaluate(() => !!document.querySelector('.gate-share__steps') && [...document.querySelectorAll('.gate-share button')].some((b) => b.textContent.includes('Kopieer voor de app')) && ![...document.querySelectorAll('.gate-share button')].some((b) => b.textContent.includes('Toevoegen'))));

// 5. Link geopend in Android Chrome (deelt het geheugen met de app)
const d = await phone(ANDROID);
await d.goto(`${BASE}?r=${n++}`, { waitUntil: 'load' });
await d.evaluate(() => localStorage.clear());
await d.goto(url.replace('https://woutvb073.github.io/intervalfit/', `${BASE}?r=${n++}`), { waitUntil: 'load' });
await sleep(900);
await d.screenshot({ path: 'sh-android.png', fullPage: true });
await clickText(d, '.gate-share button', 'Toevoegen aan mijn workouts');
await sleep(700);
// Voorbeeldworkouts bestaan hier al (eerste keer openen) → dubbel-vraag
if (await d.$('.dialog')) await clickText(d, '.dialog button', 'Ja, toevoegen');
await sleep(600);
const dStore = await d.evaluate(() => JSON.parse(localStorage['intervalfit.workouts'] || '[]').map((w) => w.name));
check('Android Chrome: toegevoegd in het gedeelde geheugen', dStore[0] === 'Buik & billen', JSON.stringify(dStore));
check('Android Chrome: bevestiging', await d.evaluate(() => !!document.querySelector('.gate-share__done')));
await d.screenshot({ path: 'sh-android-done.png' });

// 6. Link geopend in de app zelf (bv. Android opent links in de geïnstalleerde app)
const e = await phone(ANDROID, { standalone: false });
await e.evaluateOnNewDocument(() => {
  const orig = window.matchMedia.bind(window);
  window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : orig(q));
});
await fresh(e);
await e.goto(url.replace('https://woutvb073.github.io/intervalfit/', `${BASE}?r=${n++}`), { waitUntil: 'load' });
await sleep(800);
await e.screenshot({ path: 'sh-inapp.png' });
await clickText(e, '.share-preview button', 'Toevoegen');
await sleep(700);
if (await e.$('.dialog')) await clickText(e, '.dialog button', 'Ja, toevoegen');
await sleep(800);
check('in de app: toegevoegd en terug op Home', await e.evaluate(() => location.hash === '#/' && document.querySelector('.workout-card__name')?.textContent === 'Buik & billen'));

// 7. Kapotte link in de app
await e.goto(`${BASE}?r=${n++}#/deel/kapotteLinkZonderInhoud`, { waitUntil: 'load' });
await sleep(600);
check('kapotte link → nette melding', await e.evaluate(() => document.body.textContent.includes('Deze link werkt niet')));

console.log(results.join('\n'));
console.log('paginafouten:', errors.length ? errors : 'geen');
await browser.close();
