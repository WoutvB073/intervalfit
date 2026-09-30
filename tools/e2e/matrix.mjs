// Test het installatiescherm met verschillende toestellen/browsers/weergavemodi.
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const UA = {
  iphone18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphone26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1',
  iphoneWhatsApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/25.20.0',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0 (iPhone14,7; iOS 18_5; nl_NL; nl)',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidFacebook: 'Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

const SHARE = process.argv[3] ?? '';
const cases = [
  { name: 'iphone-safari18', ua: UA.iphone18 },
  { name: 'iphone-safari26', ua: UA.iphone26 },
  { name: 'iphone-se-safari26', ua: UA.iphone26, w: 375, h: 667 },
  { name: 'iphone-chrome', ua: UA.iphoneChrome },
  { name: 'iphone-whatsapp', ua: UA.iphoneWhatsApp },
  { name: 'iphone-instagram', ua: UA.iphoneInstagram },
  { name: 'ipad-safari', ua: UA.ipad, platform: 'MacIntel', touch: 5, w: 820, h: 1180 },
  { name: 'android-chrome-handmatig', ua: UA.androidChrome, w: 360, h: 740 },
  { name: 'android-chrome-knop', ua: UA.androidChrome, w: 360, h: 740, fakePrompt: true },
  { name: 'android-chrome-geinstalleerd', ua: UA.androidChrome, w: 360, h: 740, fakePrompt: true, clickInstall: true },
  { name: 'samsung', ua: UA.samsung, w: 360, h: 740 },
  { name: 'samsung-knop', ua: UA.samsung, w: 360, h: 740, fakePrompt: true },
  { name: 'android-facebook', ua: UA.androidFacebook, w: 360, h: 740 },
  { name: 'desktop', ua: UA.desktop, w: 1280, h: 800, mobile: false },
  { name: 'desktop-dev', ua: UA.desktop, w: 1280, h: 800, mobile: false, query: '?dev=1' },
  { name: 'iphone-standalone', ua: UA.iphone26, standaloneIOS: true },
  { name: 'android-standalone', ua: UA.androidChrome, w: 360, h: 740, displayMode: 'standalone' },
  ...(SHARE ? [
    { name: 'deel-iphone', ua: UA.iphone26, hash: `#/deel/${SHARE}`, fullPage: true },
    { name: 'deel-android', ua: UA.androidChrome, w: 360, h: 740, hash: `#/deel/${SHARE}`, fakePrompt: true, fullPage: true },
    { name: 'deel-kapot', ua: UA.iphone26, hash: '#/deel/kapotteLinkZonderInhoud123' },
    { name: 'deel-desktop', ua: UA.desktop, w: 1280, h: 800, mobile: false, hash: `#/deel/${SHARE}` },
  ] : []),
];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
for (const c of cases) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const mobile = c.mobile ?? true;
  await page.emulate({
    viewport: { width: c.w ?? 390, height: c.h ?? 844, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile },
    userAgent: c.ua,
  });
  await page.evaluateOnNewDocument((c) => {
    if (c.platform) Object.defineProperty(Navigator.prototype, 'platform', { get: () => c.platform });
    if (c.touch) Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => c.touch });
    if (c.displayMode) { const orig = window.matchMedia.bind(window); window.matchMedia = (q) => q.includes('display-mode: ' + c.displayMode) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : orig(q); }
    if (c.standaloneIOS) Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true });
    // Houd de echte beforeinstallprompt tegen; we sturen zelf een nep-event waar dat nodig is.
    window.addEventListener('beforeinstallprompt', (e) => { if (!e.__fake) e.stopImmediatePropagation(); }, true);
  }, c);
  await page.goto(`${BASE}${c.query ?? ''}${c.hash ?? ''}`, { waitUntil: 'networkidle0' });
  if (c.fakePrompt) {
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt'); e.__fake = true;
      e.prompt = () => Promise.resolve();
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
  }
  await new Promise((r) => setTimeout(r, 700));
  if (c.clickInstall) {
    await page.click('.gate__install-btn');
    await new Promise((r) => setTimeout(r, 700));
  }
  const info = await page.evaluate(() => ({
    scherm: document.querySelector('.gate') ? 'installatie' : document.querySelector('.desktop') ? 'computer' : document.querySelector('.screen--home') ? 'app' : '?',
    titel: document.querySelector('.gate__card-title, .desktop__text, .home-header__title')?.textContent,
    stappen: [...document.querySelectorAll('.gate-step__text')].length,
    pijl: document.querySelector('.gate-arrow')?.className.replace('gate-arrow gate-arrow--', '') ?? null,
    knop: !!document.querySelector('.gate__install-btn'),
    kopieer: !!document.querySelector('.gate__copy'),
    deel: document.querySelector('.gate-share__name, .gate__card--warn .gate__card-title')?.textContent ?? null,
    qr: !!document.querySelector('.qr svg'),
    dev: !!document.querySelector('.dev-badge'),
    breedte: document.documentElement.scrollWidth,
  }));
  console.log(c.name.padEnd(30), JSON.stringify(info), errors.length ? `FOUTEN: ${errors}` : '');
  await page.screenshot({ path: `m-${c.name}.png`, fullPage: !!c.fullPage });
  await ctx.close();
}
await browser.close();
