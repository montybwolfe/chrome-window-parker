// Injected only by the local development server. Not part of the extension.
const worker=new Worker('/tests/browser/worker.js',{type:'module'});
const pending=new Map();let next=0,resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve;});
worker.addEventListener('message',({data})=>{
 if(data.kind==='ready')resolveReady();
 if(data.kind==='persist')localStorage.setItem('parker-browser-test',JSON.stringify(data.value));
 if(data.kind==='reply'){pending.get(data.id)?.(data.response);pending.delete(data.id);}
});
worker.addEventListener('error',error=>{document.body.dataset.workerError=error.message;});
worker.postMessage({type:'bootstrap',page:location.pathname.split('/').pop(),seed:JSON.parse(localStorage.getItem('parker-browser-test')||'{}')});
async function send(message,type='message'){
 await ready;const id=++next;return new Promise(resolve=>{pending.set(id,resolve);worker.postMessage({type,id,message,page:location.pathname.split('/').pop()||'options.html'});});
}
const uiEvents=Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(name=>[name,{addListener(){}}]));
window.chrome={runtime:{sendMessage:message=>send(message),openOptionsPage:async()=>{location.href='/options.html';}},tabs:uiEvents};
const repro=document.getElementById('repro');
if(repro)repro.addEventListener('click',async()=>{const response=await send({},'repro');document.getElementById('result').textContent=response.ok?response.data:response.error;});
