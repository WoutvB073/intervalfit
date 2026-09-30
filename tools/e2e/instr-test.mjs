// Uitleg in de rust: bij geen enkele oefening afgekapt, max. 2 regels, geen overlap — alle formaten en thema's.
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const THEMES = ['fris', 'sportief', 'vrolijk', 'pastel'];
const SIZES = [
  { name: 'SE', w: 375, h: 667 },
  { name: '14', w: 390, h: 844 },
  { name: 'Android', w: 412, h: 915 },
  { name: 'SE liggend', w: 667, h: 375 },
  { name: '14 liggend', w: 844, h: 390 },
];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(`${BASE}?dev=1`, { waitUntil: 'load' });
const ids = await page.evaluate(async () => {
  const m = await import('/intervalfit/src/data/exercises.ts');
  return m.EXERCISES.map((e) => [e.id, e.name]);
});
const workout = {
  id: 'alles',
  name: 'Alle oefeningen',
  rounds: 1,
  restSec: 5,
  roundRestSec: 0,
  createdAt: 0,
  updatedAt: 0,
  exercises: [...ids.map(([id, name], i) => ({ id: `e${i}`, libraryId: id, name, workSec: 10 })), { id: 'eigen', name: 'Traplopen', workSec: 10 }],
};
const problems = [];
let checks = 0;
let minFont = 99;
let minAt = '';
for (const theme of THEMES) {
  for (const size of SIZES) {
    await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.evaluate(
      (w, theme) => {
        localStorage.setItem('intervalfit.dev', '1');
        localStorage.setItem('intervalfit.workouts', JSON.stringify([w]));
        localStorage.setItem('intervalfit.schema', '1');
        localStorage.setItem('intervalfit.app', JSON.stringify({ welcomeDismissed: true, playerTipsSeen: true }));
        localStorage.setItem('intervalfit.settings', JSON.stringify({ theme }));
      },
      workout,
      theme,
    );
    await page.goto(`${BASE}?dev=1&t=${theme}${size.w}#/speel/alles`, { waitUntil: 'load' });
    await sleep(700);
    await page.evaluate(() => document.querySelector('.player__tap')?.click());
    await sleep(300);
    await page.evaluate(() => window.__player.session.pause());
    for (let guard = 0; guard < 200; guard++) {
      const r = await page.evaluate(() => {
        const s = window.__player.session;
        if (s.status === 'finished') return { done: true };
        const p = s.phase;
        if (p.type === 'work') {
          s.skip();
          return { skipped: true };
        }
        return { type: p.type, name: p.exercise.name };
      });
      if (r.done) break;
      if (r.skipped) {
        await sleep(40);
        continue;
      }
      await sleep(160);
      const c = await page.evaluate(() => {
        const el = document.querySelector('.player__instruction');
        const sel = ['.player__top', '.player__heading', '.player__visual', '.player__timer-wrap', '.player__instruction', '.player__controls'];
        const rects = sel.map((s) => [s, document.querySelector(s)?.getBoundingClientRect()]).filter(([, r]) => r && r.width > 0);
        const overlap = [];
        for (let i = 0; i < rects.length; i++) {
          const [a, r] = rects[i];
          if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < -1) overlap.push(`${a} buiten beeld`);
          for (let j = i + 1; j < rects.length; j++) {
            const [b, q] = rects[j];
            if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1) overlap.push(`${a} × ${b}`);
          }
        }
        if (!el) return { none: true, overlap };
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight);
        return {
          fit: el.dataset.fit,
          font: parseFloat(cs.fontSize),
          lines: Math.round(el.scrollHeight / lh),
          clipped: el.scrollHeight > el.clientHeight + 1 || cs.textOverflow === 'ellipsis',
          overlap,
        };
      });
      checks++;
      const where = `${theme} / ${size.name} / volgende: ${r.name}`;
      if (!c.none) {
        if (c.font < minFont) {
          minFont = c.font;
          minAt = where;
        }
        if (c.fit !== 'ok' || c.lines > 2 || c.clipped) problems.push(`${where}: fit=${c.fit} regels=${c.lines} ${c.font}px`);
      }
      if (c.overlap.length) problems.push(`${where}: ${c.overlap.join(', ')}`);
      await page.evaluate(() => window.__player.session.skip());
      await sleep(40);
    }
  }
}
console.log(JSON.stringify({ checks, problemen: problems.slice(0, 40), aantalProblemen: problems.length, kleinsteLetter: minFont, waar: minAt, errors }, null, 1));
await browser.close();
