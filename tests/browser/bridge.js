// Injected only by the local development server. Not part of the extension.
// Optional synthetic system preference for Auto appearance acceptance checks.
const assetExport=new URLSearchParams(location.search).has('asset');
const systemPreference=new URLSearchParams(location.search).get('system');
if(['light','dark'].includes(systemPreference)){
 const nativeMatchMedia=window.matchMedia.bind(window);
 window.matchMedia=query=>query==='(prefers-color-scheme: dark)'?{matches:systemPreference==='dark',addEventListener(){},removeEventListener(){}}:nativeMatchMedia(query);
}
const worker=new Worker('/tests/browser/worker.js',{type:'module'});
const storageListeners=new Set();
const emitSettings=settings=>storageListeners.forEach(fn=>fn({settings:{newValue:settings}},'local'));
window.addEventListener('storage',e=>{if(e.key==='parker-browser-test'){const value=JSON.parse(e.newValue||'{}'),old=JSON.parse(e.oldValue||'{}');if(JSON.stringify(value.settings)!==JSON.stringify(old.settings))emitSettings(value.settings);}});
const pending=new Map();let next=0,resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve;});
worker.addEventListener('message',({data})=>{
 if(data.kind==='ready')resolveReady();
 if(data.kind==='persist'&&!assetExport){const old=JSON.parse(localStorage.getItem('parker-browser-test')||'{}');const updated={...old,...data.value};if(JSON.stringify(old)!==JSON.stringify(updated))localStorage.setItem('parker-browser-test',JSON.stringify(updated));if(data.value.settings)emitSettings(data.value.settings);}
 if(data.kind==='reply'){pending.get(data.id)?.(data.response);pending.delete(data.id);}
});
worker.addEventListener('error',error=>{document.body.dataset.workerError=error.message;});
worker.postMessage({type:'bootstrap',page:location.pathname.split('/').pop(),seed:assetExport?{}:JSON.parse(localStorage.getItem('parker-browser-test')||'{}')});
async function send(message,type='message'){
 await ready;const id=++next;return new Promise(resolve=>{pending.set(id,resolve);worker.postMessage({type,id,message,page:location.pathname.split('/').pop()||'options.html'});});
}
const uiEvents=Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(name=>[name,{addListener(){}}]));
const version=document.currentScript.dataset.version;
window.chrome={runtime:{getManifest:()=>({version}),sendMessage:message=>send(message),openOptionsPage:async()=>{location.href='/options.html';}},tabs:{...uiEvents,create:async props=>{window.open(props.url,'_blank','noopener,noreferrer');document.body.dataset.externalTabsOpened=String(Number(document.body.dataset.externalTabsOpened||0)+1);return {id:90001};}},storage:{local:{get:async()=>{const response=await send({},'storage-get');if(!response.ok)throw Error(response.error);return response.data;}},onChanged:{addListener:fn=>storageListeners.add(fn),removeListener:fn=>storageListeners.delete(fn)}}};
const repro=document.getElementById('repro');
if(repro)repro.addEventListener('click',async()=>{const response=await send({},'repro');document.getElementById('result').textContent=response.ok?response.data:response.error;});
