import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
http.createServer(async(req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'tests/browser/index.html';
 const file=path.resolve(root,name);
 if(!file.startsWith(root)||name.startsWith('.git')){res.writeHead(403);res.end();return;}
 try{
  let data=await readFile(file);const ext=path.extname(name);
  if(['options.html','popup.html','parked.html'].includes(name))data=String(data).replace('<script type="module"', '<script type="module" src="/tests/browser/bridge.js"></script><script type="module"');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[ext]||'text/plain');res.setHeader('Cache-Control','no-store');res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(8765,'127.0.0.1',()=>console.log('Local regression fixture: http://127.0.0.1:8765'));
