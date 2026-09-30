// Gebruik: node shot.mjs <scenario.json>
// scenario: { url, out, width, height, fullPage?, fresh?, steps: [ {click: selector} | {clickText: text} | {eval: js} | {wait: ms} | {shot: file} ] }
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const sc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--lang=nl-NL', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const page = await browser.newPage();
const logs = [];
page.on('console', async (m) => {
  if (m.type() === 'error') {
    const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => '?')));
    logs.push(`[error] ${args.map((a) => String(a).slice(0, 600)).join(' | ')}`);
  } else logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.emulate({
  viewport: { width: sc.width ?? 390, height: sc.height ?? 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: sc.ua ?? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
if (sc.standalone) {
  await page.evaluateOnNewDocument(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
}
if (sc.noInstallPrompt) {
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('beforeinstallprompt', (e) => e.stopImmediatePropagation(), true);
  });
}
await page.goto(sc.url, { waitUntil: 'networkidle0' });
if (sc.fresh) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
}
try {
for (const s of sc.steps ?? []) {
  if (s.focus) {} if (s.click) await page.click(s.click);
  if (s.clickText) {
    const el = await page.waitForSelector(`::-p-text(${s.clickText})`);
    await el.click();
  }
  if (s.eval) logs.push(`[eval] ${JSON.stringify(await page.evaluate(s.eval))}`);
  if (s.wait) await new Promise((r) => setTimeout(r, s.wait));
  if (s.viewport) await page.setViewport({ deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...s.viewport });
  if (s.shot) await page.screenshot({ path: s.shot, fullPage: !!s.fullPage });
  if (s.type) await page.keyboard.type(s.type);
  if (s.focus) await page.focus(s.focus);
}
} catch (e) { logs.push('[FOUT] ' + e.message); }
console.log(logs.join('\n'));
await browser.close();
