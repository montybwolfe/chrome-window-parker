import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const allowed=new Set(['background.js','clock.js','engine.js','settings.js','ui.js','support.js','theme.js','ui.css','popup.html','popup.js','options.html','options.js','parked.html','parked.js','tests/helpers.js',
 'tests/browser/index.html','tests/browser/bridge.js','tests/browser/worker.js',
 ...[16,32,48,128].map(size=>`icons/parker-timer-${size}.png`)]);
http.createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'tests/browser/index.html';
  // Serve only the fixture and its dependencies, never arbitrary checkout files.
  if(!allowed.has(name)){res.writeHead(404);res.end('Not found');return;}
  let data=await readFile(path.join(root,name));const ext=path.extname(name);
  if(['options.html','popup.html','parked.html'].includes(name))data=String(data).replace('<script src="theme.js">', '<script src="/tests/browser/bridge.js"></script><script src="theme.js">');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[ext]||'text/plain');
  res.setHeader('Cache-Control','no-store');res.end(data);
 }catch{res.writeHead(400);res.end('Invalid request');}
}).listen(8765,'127.0.0.1',()=>console.log('Local regression fixture: http://127.0.0.1:8765'));
