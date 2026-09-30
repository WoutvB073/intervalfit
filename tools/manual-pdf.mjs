// Maakt de handleiding als pdf (A4, 1 pagina) uit het scherm #/handleiding.
// Gebruik (dev-server moet draaien): node tools/manual-pdf.mjs [basis-url]
// Schrijft public/handleiding.pdf (online: …/intervalfit/handleiding.pdf).
import puppeteer from 'puppeteer-core';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const out = path.resolve(import.meta.dirname, '..', 'public', 'handleiding.pdf');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}?dev=1`, { waitUntil: 'networkidle0' });
// Altijd in het standaardthema (licht & fris), los van wat er in deze browser is gekozen.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('intervalfit.settings') || '{}');
  localStorage.setItem('intervalfit.settings', JSON.stringify({ ...s, theme: 'fris' }));
});
await page.goto(`${BASE}?dev=1&r=pdf#/handleiding`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 500));
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
const pages = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / 1));
console.log('klaar:', out, pages);
await browser.close();
