// Development-only renderer. Never included in the runtime extension package.
import http from 'node:http';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=fileURLToPath(new URL('../../',import.meta.url));
const base='http://127.0.0.1:8766';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const jobs=[
 {name:'screenshot-1-settings-1280x800',page:'/options.html?system=light&asset=1',width:1280,height:800},
 {name:'screenshot-2-parked-1280x800',page:'/parked.html?system=light&asset=1',width:1280,height:800},
 {name:'screenshot-3-popup-1280x800',page:'/tests/browser/popup-preview.html?asset=1',width:1280,height:800},
 {name:'small-promo-440x280',page:'/tests/browser/promo.html',width:440,height:280},
 {name:'marquee-promo-1400x560',page:'/tests/browser/promo.html',width:1400,height:560}
];
const runtime=['background.js','clock.js','engine.js','settings.js','ui.js','theme.js','ui.css','popup.html','popup.js','options.html','options.js','parked.html','parked.js'];
const fixtures=['tests/helpers.js','tests/browser/bridge.js','tests/browser/worker.js','tests/browser/popup-preview.html','tests/browser/promo.html'];
const sources=[...runtime,...fixtures,'icons/parker-timer.svg','tools/store-assets/client.js','tools/store-assets/server.mjs','tools/store-assets/package.json','tools/store-assets/pnpm-lock.yaml'];
const allowed=new Set([...runtime,...fixtures,'icons/parker-timer.svg',...[16,32,48,128].map(s=>`icons/parker-timer-${s}.png`),'tools/store-assets/index.html','tools/store-assets/client.js']);
await mkdir(path.join(root,'store-listing/sources'),{recursive:true});
const inputs=Object.fromEntries(await Promise.all(sources.map(async f=>[f,sha(await readFile(path.join(root,f)))])));
// All icon sizes are independent renders from the SVG, with one final downsample.
const svg=await readFile(path.join(root,'icons/parker-timer.svg'));
for(const size of [128,256,512,1024]){
 const vector=Buffer.from(svg.toString().replace('width="1024" height="1024"',`width="${size*4}" height="${size*4}"`));
 const file=size===128?'store-listing/store-icon-128.png':`docs/assets/parker-timer-${size}.png`;
 await sharp(vector).resize(size,size,{kernel:'lanczos3'}).png().toFile(path.join(root,file));
}
http.createServer(async(req,res)=>{
 try{
  if(req.headers.host!=='127.0.0.1:8766'){res.writeHead(403);res.end();return;}
  const url=new URL(req.url,base);
  if(req.method==='POST'&&url.pathname==='/export'){
   if(req.headers.origin!==base||req.headers['content-type']!=='image/png'){res.writeHead(403);res.end();return;}
   const job=jobs.find(j=>j.name===url.searchParams.get('name'));if(!job)throw Error('Unknown asset');
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024)throw Error('Image too large');chunks.push(chunk);}
   const buffer=Buffer.concat(chunks),m=await sharp(buffer).metadata();
   if(m.format!=='png'||m.width!==job.width*4||m.height!==job.height*4)throw Error('Expected a lossless 4x PNG master');
   const master=`store-listing/sources/${job.name}-4x.png`,final=`store-listing/${job.name}.png`;
   await writeFile(path.join(root,master),buffer);
   await sharp(buffer).flatten({background:'#fafafa'}).resize(job.width,job.height,{kernel:'lanczos3'}).toColourspace('srgb').png().toFile(path.join(root,final));
   if(job.name==='small-promo-440x280')await copyFile(path.join(root,final),path.join(root,'docs/assets/promo-440x280.png'));
   await writeFile(path.join(root,`store-listing/sources/${job.name}.json`),JSON.stringify({renderer:'Chrome DOM → SVG foreignObject → 4x PNG → single Lanczos3 downsample',library:'dom-to-image-more 3.11.0',...job,scale:4,master,masterSHA256:sha(buffer),output:final,outputSHA256:sha(await readFile(path.join(root,final))),inputs},null,2)+'\n');
   res.setHeader('Content-Type','text/plain');res.end(`Saved ${final} (${job.width} × ${job.height}); master ${m.width} × ${m.height}`);return;
  }
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  if(url.pathname==='/jobs.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(jobs));return;}
  let name=decodeURIComponent(url.pathname).slice(1)||'tools/store-assets/index.html';
  if(name==='renderer.js')name='tools/store-assets/node_modules/dom-to-image-more/dist/dom-to-image-more.min.js';
  else if(!allowed.has(name)){res.writeHead(404);res.end();return;}
  let data=await readFile(path.join(root,name));
  if(name.endsWith('.html')){
   data=data.toString().replace('/popup.html?system=light','/popup.html?system=light&asset=1').replaceAll('icons/parker-timer-128.png','icons/parker-timer.svg');
   if(['options.html','popup.html','parked.html'].includes(name))data=data.replace('<script src="theme.js">','<script src="/tests/browser/bridge.js"></script><script src="theme.js">');
  }
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(name)]||'text/plain');res.end(data);
 }catch(error){console.error(error);res.writeHead(400);res.end(error.message);}
}).listen(8766,'127.0.0.1',()=>console.log(`Lossless store exporter: ${base}`));
