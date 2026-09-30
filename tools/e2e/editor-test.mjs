// Interactietests voor de editor: slepen met aanraken, terugknop met niet-opgeslagen wijzigingen.
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5183/intervalfit/';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--window-size=450,950', '--window-position=-2000,0'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
});
await page.evaluateOnNewDocument(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const names = () => page.$$eval('.ex-row__name', (els) => els.map((e) => e.textContent));
const state = () => page.evaluate(() => ({ hash: location.hash.slice(0, 12), dialog: !!document.querySelector('.dialog'), sheet: !!document.querySelector('.sheet') }));
const openEditor = async () => {
  await page.evaluate(() => {
    const id = JSON.parse(localStorage['intervalfit.workouts'])[1].id;
    history.pushState({ depth: 1 }, '', `#/workout/${id}`);
    dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await sleep(600);
};
const result = (label, ok, extra = '') => console.log(`${ok ? 'OK  ' : 'FOUT'} ${label}${extra ? ' — ' + extra : ''}`);

// 1. Slepen: greep vasthouden en omlaag schuiven
await openEditor();
const before = await names();
const grip = await page.$('.ex-row:nth-child(1) .ex-row__grip');
const box = await grip.boundingBox();
const x = box.x + box.width / 2;
let y = box.y + box.height / 2;
await page.touchscreen.touchStart(x, y);
await sleep(300);
for (let i = 0; i < 20; i++) {
  y += 10;
  await page.touchscreen.touchMove(x, y);
  await sleep(16);
}
await page.touchscreen.touchEnd();
await sleep(500);
const after = await names();
result('slepen met vasthouden verplaatst de oefening', before[0] !== after[0] && after.includes(before[0]), `${before[0]} staat nu op plek ${after.indexOf(before[0]) + 1}`);

// 2. Snel vegen over de greep (zonder vasthouden) sleept niet
const beforeSwipe = await names();
const grip2 = await page.$('.ex-row:nth-child(3) .ex-row__grip');
const b2 = await grip2.boundingBox();
let y2 = b2.y + b2.height / 2;
await page.touchscreen.touchStart(b2.x + 20, y2);
for (let i = 0; i < 10; i++) {
  y2 += 15;
  await page.touchscreen.touchMove(b2.x + 20, y2);
  await sleep(8);
}
await page.touchscreen.touchEnd();
await sleep(400);
result('snel vegen start geen slepen', JSON.stringify(beforeSwipe) === JSON.stringify(await names()));

// 3. Terug met wijzigingen → vraag; "Verder bewerken" blijft in de editor
let s = await state();
await page.evaluate(() => history.back());
await sleep(500);
s = await state();
result('terug met wijzigingen toont de vraag', s.dialog && s.hash.startsWith('#/workout'), JSON.stringify(s));
await page.evaluate(() => [...document.querySelectorAll('.dialog button')].find((b) => b.textContent.includes('Verder bewerken')).click());
await sleep(500);
s = await state();
result('"Verder bewerken" blijft in de editor', !s.dialog && s.hash.startsWith('#/workout'), JSON.stringify(s));

// 4. Paneel openen + terug sluit alleen het paneel
await page.click('.ex-row:nth-child(2) .ex-row__main');
await sleep(600);
await page.evaluate(() => history.back());
await sleep(600);
s = await state();
result('terug sluit eerst het paneel', !s.sheet && !s.dialog && s.hash.startsWith('#/workout'), JSON.stringify(s));

// 5. Terug → "Niet bewaren" → Home, volgorde ongewijzigd opgeslagen
await page.evaluate(() => history.back());
await sleep(500);
await page.evaluate(() => [...document.querySelectorAll('.dialog button')].find((b) => b.textContent.includes('Niet bewaren')).click());
await sleep(800);
s = await state();
const stored = await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts'])[1].exercises.map((e) => e.name));
result('"Niet bewaren" gaat terug naar Home zonder op te slaan', s.hash === '' || s.hash === '#/', `${JSON.stringify(s)} eerste: ${stored[0]}`);
result('opgeslagen volgorde is ongewijzigd', stored[0] === before[0]);

// 6. Opnieuw: naam wijzigen, terug, "Bewaren"
await openEditor();
await page.click('.field__input--big', { clickCount: 3 });
await page.keyboard.type('Buik & billen extra');
await page.evaluate(() => history.back());
await sleep(500);
await page.evaluate(() => [...document.querySelectorAll('.dialog button')].find((b) => b.textContent.trim() === 'Bewaren').click());
await sleep(800);
s = await state();
const saved = await page.evaluate(() => JSON.parse(localStorage['intervalfit.workouts'])[1].name);
result('"Bewaren" slaat op en gaat naar Home', (s.hash === '' || s.hash === '#/') && saved === 'Buik & billen extra', `${JSON.stringify(s)} naam: ${saved}`);

// 7. Na het opslaan: terug vanaf Home blijft in de app (geen spookstappen)
const len = await page.evaluate(() => history.length);
console.log('geschiedenislengte', len, 'huidige state', JSON.stringify(await page.evaluate(() => history.state)));

console.log('paginafouten:', errors.length ? errors : 'geen');
await browser.close();
