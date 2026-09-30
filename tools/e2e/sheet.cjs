const {PNG}=require('pngjs');const fs=require('fs');
const [out,...ids]=process.argv.slice(2);
const imgs=ids.map(i=>PNG.sync.read(fs.readFileSync('poses/'+i+'.png')));const w=Math.max(...imgs.map(i=>i.width));const h=imgs.reduce((s,i)=>s+i.height,0);const o=new PNG({width:w,height:h});o.data.fill(255);let y=0;for(const im of imgs){PNG.bitblt(im,o,0,0,im.width,im.height,0,y);y+=im.height;}fs.writeFileSync(out,PNG.sync.write(o));
