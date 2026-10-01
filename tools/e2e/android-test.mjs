// Android: installatiescherm per browser, "Openen in Chrome", gedeelde link en de Samsung-donkermodus-tip.
// Gebruik: node android-test.mjs [basis-url]   → and-<naam>.png
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const UA = {
  samsungOneUI2: 'Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/11.2 Chrome/75.0.3770.143 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  chrome: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  edge: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 EdgA/140.0.0.0',
  opera: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 OPR/91.0.0.0',
  whatsapp: 'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 WhatsApp/2.25.20',
  instagram: 'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 Instagram 390.0.0.0 Android (34/14; 450dpi; 1080x2340; samsung; SM-A556B; a55x; s5e8845; nl_NL)',
  facebook: 'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
};
// Een geldige gedeelde workout (gemaakt met de app zelf).
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};

async function open(ua, { query = '', hash = '#/', dark = false, prompt = false, dev = false, standalone = false } = {}) {
  const page = await browser.newPage();
  await page.emulate({ viewport: { width: 360, height: 780, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, userAgent: ua });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
  if (standalone) {
    await page.evaluateOnNewDocument(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q));
    });
  }
  if (prompt) {
    // Chrome/Samsung bieden zelf een installatieverzoek aan; nabootsen.
    await page.evaluateOnNewDocument(() => {
      window.addEventListener('load', () => {
        const e = new Event('beforeinstallprompt');
        e.prompt = async () => {};
        e.userChoice = Promise.resolve({ outcome: 'dismissed' });
        window.dispatchEvent(e);
      });
    });
  }
  await page.goto(`${BASE}?dev=${dev ? 1 : 0}&r=${n++}${query}${hash}`, { waitUntil: 'networkidle0' });
  await sleep(500);
  return page;
}
const texts = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.gate__card-title')?.textContent,
    buttons: [...document.querySelectorAll('.gate button, .gate summary')].map((b) => b.textContent.trim()),
    body: document.body.innerText,
  }));

// 1. Installatiescherm per browser
const cases = [
  ['chrome', UA.chrome, { prompt: true }],
  ['samsung-oneui2', UA.samsungOneUI2, {}],
  ['samsung', UA.samsung, { prompt: true }],
  ['firefox', UA.firefox, {}],
  ['edge', UA.edge, { prompt: true }],
  ['opera', UA.opera, {}],
  ['whatsapp', UA.whatsapp, {}],
  ['instagram', UA.instagram, {}],
  ['facebook', UA.facebook, {}],
];
for (const [name, ua, opts] of cases) {
  const page = await open(ua, opts);
  const t = await texts(page);
  await page.screenshot({ path: `and-${name}.png`, fullPage: true });
  if (name === 'chrome') {
    check(t.buttons.includes('Installeren') && !t.buttons.includes('Openen in Chrome'), `Chrome: eigen Installeren-knop, geen omweg (${t.title})`);
  } else {
    check(t.buttons.includes('Openen in Chrome') && !t.buttons.includes('Installeren'), `${name}: "Openen in Chrome" en géén directe installeerknop (${t.title})`);
    const alt = t.buttons.find((b) => b.startsWith('Liever in') || b.startsWith('Werkt de knop niet'));
    check(!!alt && (['whatsapp', 'instagram', 'facebook'].includes(name) ? alt.startsWith('Werkt') : alt.startsWith('Liever')), `${name}: alternatief "${alt}"`);
  }
  if (name.startsWith('samsung')) {
    await page.evaluate(() => document.querySelector('.gate__manual')?.setAttribute('open', ''));
    const body = (await texts(page)).body;
    check(/Gevaarlijke app geblokkeerd/.test(body) && /oudere versie van Android/.test(body), `${name}: uitleg bij de melding "onveilig"`);
  }
  // Klik op "Openen in Chrome": de browser moet naar een intent://-link met Chrome als pakket gaan.
  if (name !== 'chrome') {
    const target = new Promise((resolve) => {
      page.on('request', (r) => r.isNavigationRequest() && resolve(r.url()));
      setTimeout(() => resolve(null), 2000);
    });
    const cdp = await page.createCDPSession();
    await cdp.send('Page.enable');
    let requested = null;
    cdp.on('Page.frameRequestedNavigation', (e) => (requested = e.url));
    await page.evaluate(() => [...document.querySelectorAll('.gate button')].find((b) => b.textContent.includes('Openen in Chrome'))?.click());
    await sleep(600);
    const url = requested ?? (await target);
    check(!!url && url.startsWith('intent://') && url.includes('package=com.android.chrome'), `${name}: knop opent ${String(url).slice(0, 70)}…`);
  }
  await page.close();
}

// 2. Chrome niet aanwezig → terug met ?geenchrome=1: eigen stappen staan open
{
  const page = await open(UA.samsung, { query: '&geenchrome=1' });
  const open_ = await page.evaluate(() => document.querySelector('.gate__manual')?.open);
  const notice = await page.evaluate(() => document.querySelector('.gate__notice')?.textContent);
  check(open_ && /Chrome kon niet worden geopend/.test(notice ?? ''), 'geen Chrome: melding + eigen stappen open');
  await page.screenshot({ path: 'and-samsung-geen-chrome.png', fullPage: true });
  await page.close();
}

// 3. Gedeelde link in Samsung Internet: niet direct toevoegen (ander geheugen), wel Chrome of kopiëren
{
  const maker = await open(UA.chrome, { dev: true });
  // Deellink maken via het echte Delen-scherm (werkt lokaal én online).
  await maker.evaluate(() => document.querySelector('.workout-card .icon-btn--quiet').click());
  await sleep(500);
  await maker.evaluate(() => [...document.querySelectorAll('.sheet-action')].find((b) => b.textContent.includes('Delen')).click());
  await sleep(700);
  const code = await maker.evaluate(() => /#\/deel\/(\S+)/.exec(document.body.innerText)?.[1]);
  await maker.close();
  const page = await open(UA.samsung, { hash: `#/deel/${code}` });
  const t = await texts(page);
  check(t.buttons.includes('Openen in Chrome') && t.buttons.some((b) => b.includes('Kopieer voor de app')) && !t.buttons.some((b) => b.includes('Toevoegen aan mijn workouts')), 'gedeelde link in Samsung Internet: Chrome of kopiëren, niet direct toevoegen');
  await page.screenshot({ path: 'and-samsung-deel.png', fullPage: true });
  await page.close();
  // Via de intent-link (?deel=…) komt Chrome op de gewone route uit, met "Toevoegen".
  const chrome = await open(UA.chrome, { query: `&deel=${encodeURIComponent(code)}`, hash: '' });
  const hash = await chrome.evaluate(() => location.hash.slice(0, 7));
  const ct = await texts(chrome);
  check(hash === '#/deel/' && ct.buttons.some((b) => b.includes('Toevoegen aan mijn workouts')), `Chrome via intent-link: ${hash}… met "Toevoegen aan mijn workouts"`);
  await chrome.close();
}

// 4. Tip bij Thema: alleen Samsung Internet met donkere modus
for (const [name, ua, dark, expect] of [
  ['samsung-donker', UA.samsung, true, true],
  ['samsung-licht', UA.samsung, false, false],
  ['chrome-donker', UA.chrome, true, false],
]) {
  const page = await open(ua, { dev: true, dark, hash: '#/instellingen' });
  await page.waitForSelector('.theme-grid');
  const tip = await page.$('.settings-tip');
  check(!!tip === expect, `tip bij Thema – ${name}: ${tip ? 'zichtbaar' : 'niet zichtbaar'}`);
  if (tip) {
    await page.evaluate(() => document.querySelector('.settings-tip').scrollIntoView({ block: 'center' }));
    await sleep(200);
    await page.screenshot({ path: `and-tip-${name}.png` });
  }
  await page.close();
}

console.log(fails ? `\n${fails} MISLUKT` : '\nAlles geslaagd');
await browser.close();
process.exit(fails ? 1 : 0);
