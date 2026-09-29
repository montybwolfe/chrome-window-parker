import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const listing=JSON.parse(await read('store-listing/fields.json'));
const dimensions=[[...listing.screenshots].map(f=>[f,1280,800]),[[listing.small_promo_tile,440,280],[listing.marquee_promo_tile,1400,560]]].flat();
for(const [file,width,height] of dimensions){
 const bytes=await read('store-listing/'+file),meta=await sharp(bytes).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,width);assert.equal(meta.height,height);assert.equal(meta.hasAlpha,false);
 const evidence=JSON.parse(await read(`store-listing/sources/${file.slice(0,-4)}.json`));
 assert.equal(hash(bytes),evidence.outputSHA256);const master=await read(evidence.master),source=await sharp(master).metadata();
 assert.equal(hash(master),evidence.masterSHA256);assert.equal(source.format,'png');assert.equal(source.width,width*4);assert.equal(source.height,height*4);
 for(const [file,sha] of Object.entries(evidence.inputs))assert.equal(hash(await read(file)),sha,`Stale source: ${file}. Restart exporter and render again.`);
 const rebuilt=await sharp(master).flatten({background:'#fafafa'}).resize(width,height,{kernel:'lanczos3'}).toColourspace('srgb').png().toBuffer();assert.deepEqual(rebuilt,bytes);
 console.log(`${file}: ${width}×${height} PNG from ${source.width}×${source.height}; ${bytes.length} bytes; source hashes and exact downsample verified`);
}
for(const [file,size] of [['store-listing/store-icon-128.png',128],...[256,512,1024].map(s=>[`docs/assets/parker-timer-${s}.png`,s])]){
 const vector=(await read('icons/parker-timer.svg')).toString().replace('width="1024" height="1024"',`width="${size*4}" height="${size*4}"`);
 const rebuilt=await sharp(Buffer.from(vector)).resize(size,size,{kernel:'lanczos3'}).png().toBuffer();assert.deepEqual(await read(file),rebuilt);console.log(`${file}: verified 4x vector rasterization`);
}
assert.deepEqual(await read('docs/assets/promo-440x280.png'),await read('store-listing/small-promo-440x280.png'));
assert(!(await readdir(new URL('store-listing/',root))).some(f=>/\.jpe?g$/i.test(f)));
console.log('All 10 final marketing raster assets verified. No legacy JPEGs.');
