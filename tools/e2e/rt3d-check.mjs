// Controle Russian twists (3D): één herhaling met een VASTE camera, vanuit drie hoeken (schuin / voor / boven).
// Gebruik: node rt3d-check.mjs → rt3d-vast.png
import puppeteer from 'puppeteer-core';
const B = process.argv[2] ?? 'http://localhost:5183/intervalfit/';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 520 });
await page.goto(B + '?dev=1', { waitUntil: 'networkidle0' });
await page.evaluate(async () => {
  const { ANIMATIONS_3D } = await import('/intervalfit/src/figure/anim3d.ts');
  const { frame3D, fitViewBox3D } = await import('/intervalfit/src/figure/scene3d.ts');
  const base = ANIMATIONS_3D['russian-twists'];
  const views = [['schuin (30°)', 30, 24], ['voor (0°)', 0, 15], ['boven (0°, 70° van boven)', 0, 70]];
  const f1 = (n) => n.toFixed(1);
  let html = '<div style="font:14px sans-serif;padding:8px;background:var(--bg)">';
  for (const [label, yaw, pitch] of views) {
    const anim = { ...base, orbit: 1e9, startYaw: yaw, pitch };
    const [vx, vy, vs] = fitViewBox3D(anim);
    html += `<div style="margin:4px 0">${label}</div><div style="display:flex;gap:6px">`;
    for (let i = 0; i < 8; i++) {
      const f = frame3D(anim, (i / 8) * base.cycle);
      const items = [];
      for (const s of f.segs) {
        const cls = `fig-seg fig-${s.kind} ${s.accent ? 'fig-accent' : 'fig-body'}${s.far ? ' fig-far' : ''}`;
        const halo = s.halo ? `<line class="fig-seg fig-halo fig-halo-${s.kind}" x1="${f1(s.a[0])}" y1="${f1(s.a[1])}" x2="${f1(s.b[0])}" y2="${f1(s.b[1])}"/>` : '';
        items.push([s.depth, `${halo}<line class="${cls}" x1="${f1(s.a[0])}" y1="${f1(s.a[1])}" x2="${f1(s.b[0])}" y2="${f1(s.b[1])}"/>`]);
      }
      items.push([f.torso.depth, `<path class="fig-torso-front fig-accent" d="M${f.torso.pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L')}Z"/>`]);
      items.push([f.head.depth, `<circle class="fig-head" r="11.5" cx="${f1(f.head.c[0])}" cy="${f1(f.head.c[1])}"/>`]);
      items.sort((a, b) => a[0] - b[0]);
      html += `<svg viewBox="${vx} ${vy} ${vs} ${vs}" style="width:118px;height:118px;background:var(--surface-2);border-radius:12px"><path class="fig-mat" d="M${f.mat.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L')}Z"/>${items.map((x) => x[1]).join('')}</svg>`;
    }
    html += '</div>';
  }
  document.body.innerHTML = html + '</div>';
});
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'rt3d-vast.png' });
await browser.close();
