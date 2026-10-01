import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const text=name=>readFileSync(new URL(name,root),'utf8');

test('all shipped surfaces use the timer assets; raster dimensions match declarations',()=>{
 const manifest=JSON.parse(text('manifest.json'));
 assert.deepEqual(Object.keys(manifest.icons),['16','32','48','128']);
 for(const [size,name] of Object.entries(manifest.icons)){
  assert.equal(name,`icons/parker-timer-${size}.png`);
  const png=readFileSync(new URL(name,root));assert.equal(png.readUInt32BE(16),Number(size));assert.equal(png.readUInt32BE(20),Number(size));
 }
 // Toolbar icons at 1×, 1.5× and 2× (Retina), each a real render at that size.
 assert.deepEqual(manifest.action.default_icon,{'16':'icons/parker-timer-16.png','24':'icons/parker-timer-24.png','32':'icons/parker-timer-32.png'});
 for(const [size,name] of Object.entries(manifest.action.default_icon)){
  const png=readFileSync(new URL(name,root));assert.equal(png.readUInt32BE(16),Number(size));assert.equal(png.readUInt32BE(20),Number(size));
  assert.equal(png[25],6,`${name}: RGBA, so the corners stay transparent`);
 }
 assert(text('scripts/package.py').includes("'icons/parker-timer-24.png'"),'the 24 px icon ships');
 for(const page of ['options.html','popup.html','parked.html']){
  assert(text(page).includes('rel="icon" href="icons/parker-timer-32.png"'));
  assert(text(page).includes('src="icons/parker-timer-128.png"'));
 }
 assert(text('README.md').includes('src="icons/parker-timer-128.png"'));
 for(const name of readdirSync(root).filter(n=>/\.(html|css|js|json)$/.test(n)))assert(!/icons\/(?:\d+\.png|icon\.svg)/.test(text(name)),name);
 assert.deepEqual(readdirSync(new URL('icons/',root)).sort(),['parker-timer-128.png','parker-timer-16.png','parker-timer-24.png','parker-timer-32.png','parker-timer-48.png','parker-timer.svg']);
 assert(!/<image|filter|https?:\/\/(?!www.w3.org)/.test(text('icons/parker-timer.svg')));
 for(const size of [256,512,1024]){const p=readFileSync(new URL(`docs/assets/parker-timer-${size}.png`,root));assert.equal(p.readUInt32BE(16),size);assert.equal(p.readUInt32BE(20),size);}
});

test('README: Google\'s Chrome Web Store badge, unmodified, and every Store link goes to the listing',()=>{
 const {store_url}=JSON.parse(text('store-listing/fields.json')),readme=text('README.md');
 // Without its border on GitHub's light theme (the white background it's made for); the bordered badge otherwise.
 assert(readme.includes(`<a href="${store_url}"><picture><source media="(prefers-color-scheme: light)" srcset="docs/assets/chrome-web-store-badge-no-border.png"><img src="docs/assets/chrome-web-store-badge.png" alt="Available in the Chrome Web Store" width="206"></picture></a>`));
 assert.deepEqual([...new Set(readme.match(/https:\/\/chromewebstore\.google\.com\/[^\s)"<>]+/g))],[store_url]);
 // Google's guidelines allow resizing only: these are its 340×96 badges, byte for byte.
 for(const [file,sha] of [['chrome-web-store-badge.png','fbf289fca885e58a1507cc8c69a9df68f35e83e683825b3ad6cd617b0a17d79c'],['chrome-web-store-badge-no-border.png','f49e4bff319083c20b3386f23547315773631e155e389ed42550295e4913e12d']])
  assert.equal(createHash('sha256').update(readFileSync(new URL(`docs/assets/${file}`,root))).digest('hex'),sha,file);
});

test('Store reviewer instructions fit the 500-character Test instructions field',()=>{
 // Plain ASCII, and still within the limit if every line break is submitted as CRLF.
 const t=text('store-listing/test-instructions.txt').replace(/\n$/,'');
 assert(/^[\x20-\x7e\n]*$/.test(t),'plain ASCII');assert(t.length+(t.match(/\n/g)||[]).length<=500,`${t.length} characters`);
});

test('Store artwork: exact sizes, no alpha outside the icon, and outputs that match their recorded sources',async()=>{
 const {verifyAssets}=await import('../tools/store-assets/verify.mjs');
 assert.deepEqual(verifyAssets({ui:false}),[]);
});
