// Laadt de app, wacht tot alles offline is opgeslagen, blokkeert daarna ALLE netwerkverzoeken en laadt opnieuw.
import puppeteer from 'puppeteer-core';
const URL = process.argv[2] ?? 'http://localhost:4183/intervalfit/';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(
  async () => {
    const keys = await caches.keys();
    for (const k of keys) if ((await (await caches.open(k)).keys()).length >= 14) return true;
    return false;
  },
  { timeout: 30000, polling: 500 },
);
await page.reload({ waitUntil: 'load' });
console.log('sw regelt pagina:', await page.evaluate(() => !!navigator.serviceWorker.controller));
const blocked = [];
await page.setRequestInterception(true);
page.on('request', (req) => {
  blocked.push(req.url());
  req.abort('internetdisconnected');
});
await page.reload({ waitUntil: 'load', timeout: 15000 }).catch((e) => console.log('laadfout', e.message));
await new Promise((r) => setTimeout(r, 1000));
console.log(
  'zonder netwerk:',
  JSON.stringify(
    await page.evaluate(() => ({
      title: document.querySelector('.home-header__title')?.textContent,
      cards: [...document.querySelectorAll('.workout-card__name')].map((e) => e.textContent),
      font: document.fonts.check('700 20px "Plus Jakarta Sans Variable"'),
    })),
  ),
);
console.log('geblokkeerde verzoeken:', blocked.length ? blocked : 'geen (alles kwam uit de offline-opslag)');
await page.screenshot({ path: 'offline.png' });
await browser.close();
