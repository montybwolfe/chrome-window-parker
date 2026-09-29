// Review-only derivatives. These are never inputs to the upload pipeline.
import sharp from 'sharp';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const out='work/store-asset-qa';await mkdir(out,{recursive:true});
const files=(await readdir('store-listing')).filter(f=>f.endsWith('.png')).map(f=>'store-listing/'+f);
files.push(...[256,512,1024].map(n=>`docs/assets/parker-timer-${n}.png`),'docs/assets/promo-440x280.png');
for(const file of files){
 const stem=file.replaceAll('/','-').slice(0,-4),m=await sharp(file).metadata();
 // Full 200% nearest-neighbor inspection preserves the exact final pixels.
 await sharp(file).resize(m.width*2,m.height*2,{kernel:'nearest'}).png().toFile(`${out}/${stem}-200.png`);
 await sharp(file).resize(Math.round(m.width/2),Math.round(m.height/2),{kernel:'lanczos3'}).png().toFile(`${out}/${stem}-thumbnail.png`);
}
const clips=[
 ['settings-controls','store-listing/screenshot-1-settings-1280x800.png',{left:340,top:230,width:600,height:195}],
 ['settings-icon','store-listing/screenshot-1-settings-1280x800.png',{left:340,top:35,width:310,height:120}],
 ['parked','store-listing/screenshot-2-parked-1280x800.png',{left:420,top:245,width:440,height:240}],
 ['popup','store-listing/screenshot-3-popup-1280x800.png',{left:790,top:235,width:380,height:335}],
 ['small-promo','store-listing/small-promo-440x280.png',{left:0,top:0,width:440,height:280}],
 ['marquee-title','store-listing/marquee-promo-1400x560.png',{left:85,top:120,width:500,height:320}],
 ['marquee-windows','store-listing/marquee-promo-1400x560.png',{left:830,top:120,width:430,height:325}]
];
for(const [name,file,rect] of clips)await sharp(file).extract(rect).resize(rect.width*2,rect.height*2,{kernel:'nearest'}).png().toFile(`${out}/${name}-detail-200.png`);
const cards=files.map(file=>{const src=path.relative(out,file);return `<section><h2>${file}</h2><h3>100% / native store slot</h3><img src="${src}"><h3>200% / exact pixel inspection</h3><img src="${file.replaceAll('/','-').slice(0,-4)}-200.png"><h3>Thumbnail</h3><img src="${file.replaceAll('/','-').slice(0,-4)}-thumbnail.png"></section>`;}).join('');
await writeFile(`${out}/index.html`,`<!doctype html><title>Store artwork QA</title><style>body{font:16px system-ui;background:#e8edf4;margin:30px}section{margin-bottom:60px}img{display:block;max-width:none}h3{margin-top:25px}</style><h1>Native, 200% and thumbnail QA</h1>${cards}`);
console.log('QA derivatives and gallery:',out);
