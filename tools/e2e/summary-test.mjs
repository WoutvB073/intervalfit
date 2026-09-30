// Stap 6: overzicht na afloop, reeks-blokje op Home, Mijn voortgang en nep-geschiedenis.
// Gebruik: node summary-test.mjs [basis-url] [thema's]   → screenshots sum-<thema>-*.png
// Controleert: echte workout (test-workout doorgespoeld) → overzicht; gestopt < 1 min telt niet mee;
// mijlpalen via nep-geschiedenis; geen overlap/horizontaal scrollen op 5 formaten.
import puppeteer from 'puppeteer-core';

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
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const load = async (hash = '#/') => {
  await page.goto(`${BASE}?dev=1&r=${n++}${hash}`, { waitUntil: 'load' });
  await sleep(700);
};
const reset = async (theme, extra = {}) => {
  await page.goto(`${BASE}?dev=1&r=${n++}`, { waitUntil: 'load' });
  await page.evaluate(
    (theme, extra) => {
      localStorage.clear();
      localStorage.setItem('intervalfit.dev', '1');
      localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
      localStorage.setItem('intervalfit.settings', JSON.stringify({ theme, ...extra }));
    },
    theme,
    extra,
  );
  await load();
};
const clickText = async (sel, text) => {
  const ok = await page.evaluate(
    (sel, text) => {
      const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text));
      el?.click();
      return !!el;
    },
    sel,
    text,
  );
  if (!ok) throw new Error(`niet gevonden: ${text}`);
  await sleep(450);
};
const devSheet = async (...labels) => {
  await clickText('.card--dev button', 'Nep-geschiedenis');
  await sleep(300);
  for (const l of labels) await clickText('.sheet-action', l);
  await sleep(400);
};
const history = () => page.evaluate(() => JSON.parse(localStorage.getItem('intervalfit.history') || '[]'));
const summaryText = () =>
  page.evaluate(() => ({
    headline: document.querySelector('.summary__headline')?.textContent,
    msgs: [...document.querySelectorAll('.summary-msg')].map((m) => m.textContent),
    medal: document.querySelector('.medal')?.className + ' ' + (document.querySelector('.medal__num')?.textContent ?? ''),
    tiles: [...document.querySelectorAll('.summary-tile')].map((t) => t.textContent),
  }));
/** Overlap/uitsteken: elementen buiten het scherm of horizontaal scrollen. */
const layoutProblems = () =>
  page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`horizontaal scrollen (${document.documentElement.scrollWidth})`);
    for (const el of document.querySelectorAll('.summary-tile, .summary-msg, .week-dot, .btn, .streak-card, .history-row')) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.left < -1 || r.right > window.innerWidth + 1)) out.push(`${el.className} steekt uit`);
      if (el.scrollWidth > el.clientWidth + 2 && !el.classList.contains('history-row')) out.push(`${el.className.split(' ')[0]} tekst past niet (${el.textContent.slice(0, 30)})`);
    }
    return out;
  });

// ── 1. Echte speler: test-workout doorspoelen → overzicht ──
await reset('fris', { sound: { voice: false } });
await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout')).click());
await sleep(800);
for (let i = 0; i < 40; i++) {
  const done = await page.evaluate(() => {
    const s = window.__player?.session;
    if (!s || s.status === 'finished') return true;
    s.skip();
    return false;
  });
  if (done) break;
  await sleep(60);
}
await sleep(1500);
check(page.url().includes('#/klaar/'), `na afloop naar het overzicht (${page.url().split('#')[1]})`);
let h = await history();
check(h.length === 1 && h[0].completed === true, 'afgeronde workout in de geschiedenis');
let s = await summaryText();
check(s.headline === 'Je eerste workout!', `kop: ${s.headline}`);
check(s.msgs.length >= 1 && s.msgs.length <= 2, `boodschappen: ${s.msgs.join(' | ')}`);
check(!!(await page.$('.summary__confetti')), 'confetti-canvas aanwezig');
await clickText('.btn', 'Klaar');
await sleep(500);
check((await page.evaluate(() => location.hash)) === '#/', 'Klaar → Home');
check(!!(await page.$('.streak-card')), 'reeks-blokje op Home');

// ── 2. Stoppen onder 1 minuut: telt niet mee ──
await page.evaluate(() => [...document.querySelectorAll('.card--dev button')].find((b) => b.textContent.includes('Test-workout')).click());
await sleep(1500);
await page.click('.player__top .player__icon-btn');
await sleep(500);
const dlg = await page.evaluate(() => document.querySelector('[role="dialog"], .dialog')?.textContent ?? '');
check(dlg.includes('tellen niet mee'), 'stopvraag meldt dat < 1 minuut niet meetelt');
await clickText('button', 'Stoppen');
await sleep(900);
check((await page.evaluate(() => location.hash)) === '#/', 'gestopt < 1 min → terug naar Home');
h = await history();
check(h.length === 1, 'gestopt < 1 min niet in de geschiedenis');

// ── 3. Mijlpalen via nep-geschiedenis (per thema screenshots) ──
for (const theme of THEMES) {
  await reset(theme, { name: 'Ria' });
  await devSheet('4 workouts', 'Lange workout (45');
  await sleep(2300);
  s = await summaryText();
  check(s.medal.includes('medal--count') && s.medal.trim().endsWith('5'), `[${theme}] 5e workout op de medaille (${s.medal})`);
  check(s.msgs.length === 2 && /record|langste/i.test(s.msgs[1]), `[${theme}] tweede boodschap = record: ${s.msgs.join(' | ')}`);
  await page.screenshot({ path: `sum-${theme}-mijlpaal.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(300);
  await page.screenshot({ path: `sum-${theme}-mijlpaal-onder.png` });
  await load('#/');
  await page.screenshot({ path: `sum-${theme}-home.png` });
  await load('#/voortgang');
  await page.screenshot({ path: `sum-${theme}-voortgang.png` });
}

// ── 4. Andere mijlpalen (tekst) ──
const cases = [
  ['2 dagen op rij', 'Workout afgerond', 'streak', '3'],
  ['6 dagen op rij', 'Workout afgerond', 'streak', '7'],
  ['9 workouts', 'Workout afgerond', 'count', '10'],
  ['49 workouts', 'Workout afgerond', 'count', '50'],
  ['Pauze van 12 dagen', 'Workout afgerond', 'comeback', ''],
];
for (const [scen, fin, kind, num] of cases) {
  await reset('fris');
  await devSheet(scen, fin);
  await sleep(1800);
  s = await summaryText();
  check(s.medal.includes(`medal--${kind}`) && (!num || s.medal.trim().endsWith(num)), `${scen} → ${kind} ${num}: ${s.headline} | ${s.msgs.join(' | ')}`);
}
await reset('fris');
await devSheet('4 workouts', 'Gestopt na 6');
await sleep(1800);
s = await summaryText();
check(s.msgs.some((m) => /6 minuten/.test(m)) && s.tiles.some((t) => / van /.test(t)), `gestopt na 6 min: ${s.headline} | ${s.msgs.join(' | ')} | ${s.tiles.join(' / ')}`);
await page.screenshot({ path: 'sum-gestopt.png' });
await load('#/');
await devSheet('Gestopt na 40');
check((await history()).length === 5, 'nep: gestopt na 40 s telt niet mee');

// ── 5. Voortgang met veel geschiedenis + overzicht openen vanuit de lijst ──
await reset('fris');
await devSheet('2 maanden gevarieerd');
await load('#/voortgang');
await page.screenshot({ path: 'sum-voortgang-vol.png' });
await page.click('.history-row');
await sleep(600);
check(page.url().includes('#/klaar/') && !(await page.$('.summary__confetti')), 'overzicht vanuit de lijst: zonder confetti');
await page.screenshot({ path: 'sum-terugkijken.png' });
await page.click('.top-bar .icon-btn');
await sleep(500);
check((await page.evaluate(() => location.hash)) === '#/voortgang', 'terug → Mijn voortgang');

// ── 6. Formaten: geen uitstekende of afgekapte elementen ──
const sizes = [
  [375, 667],
  [390, 844],
  [412, 915],
  [360, 740],
  [844, 390],
  [915, 412],
];
await reset('vrolijk', { name: 'Ria' });
await devSheet('49 workouts', 'Lange workout (45');
const sumUrl = page.url().split('#')[1];
for (const [w, hgt] of sizes) {
  await page.setViewport({ width: w, height: hgt, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  for (const hash of [`#${sumUrl}`, '#/', '#/voortgang']) {
    await load(hash);
    const p = await layoutProblems();
    check(p.length === 0, `${w}×${hgt} ${hash.slice(0, 12)}: ${p.join('; ') || 'ok'}`);
  }
  if (w === 375 || w === 844) {
    await load(`#${sumUrl}`);
    await page.screenshot({ path: `sum-${w}x${hgt}.png` });
  }
}
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

// ── 7. Instellingen: naam ──
await reset('fris');
await load('#/instellingen');
await page.type('.settings-name', '  Ria ');
await page.evaluate(() => document.querySelector('.settings-name').blur());
await sleep(200);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('intervalfit.settings')).name);
check(saved === 'Ria', `naam opgeslagen zonder spaties ("${saved}")`);

check(errors.length === 0, `geen fouten in de console ${errors.join(' | ')}`);
console.log(fails ? `\n${fails} MISLUKT` : '\nAlles geslaagd');
await browser.close();
process.exit(fails ? 1 : 0);
