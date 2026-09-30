// Screenshots naast elkaar zetten: node combine.cjs uit.png a.png b.png …
const { PNG } = require('pngjs');
const fs = require('fs');
const [out, ...files] = process.argv.slice(2);
const imgs = files.map((f) => PNG.sync.read(fs.readFileSync(f)));
const W = imgs.reduce((s, i) => s + i.width, 0) + 12 * (imgs.length - 1);
const H = Math.max(...imgs.map((i) => i.height));
const o = new PNG({ width: W, height: H });
o.data.fill(255);
let x = 0;
for (const i of imgs) {
  PNG.bitblt(i, o, 0, 0, i.width, i.height, x, 0);
  x += i.width + 12;
}
fs.writeFileSync(out, PNG.sync.write(o));
