// PWA-controle (vervangt de oude Lighthouse-PWA-categorie): installeerbaarheid volgens Chrome,
// manifest (iconen, maskable), service worker en starten zonder internet.
// Gebruik: node pwa-check.mjs [basis-url]
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:4183/intervalfit/';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: 'networkidle0' });
const cdp = await page.createCDPSession();
const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]').href;
  return (await fetch(href)).json();
});
const sizes = manifest.icons.map((i) => `${i.sizes}${i.purpose ? ` (${i.purpose})` : ''}`);
const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
const splash = await page.$$eval('link[rel="apple-touch-startup-image"]', (l) => l.length);
const appleIcon = await page.$eval('link[rel="apple-touch-icon"]', (l) => l.href);
// Offline starten
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 800));
const offlineText = await page.evaluate(() => document.body.innerText.slice(0, 60).replace(/\s+/g, ' '));
console.log(JSON.stringify({ installabilityErrors, name: manifest.name, display: manifest.display, start_url: manifest.start_url, icons: sizes, serviceWorker: controlled, appleTouchIcon: appleIcon.split('/').pop(), iPhoneSplashScreens: splash, offlineStart: offlineText }, null, 1));
await browser.close();
