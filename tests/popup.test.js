import test from 'node:test';
import assert from 'node:assert/strict';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('popup keeps close available for paused inactive leftovers and refreshes counters after completion',async()=>{
 const original={document:globalThis.document,chrome:globalThis.chrome};const elements=new Map(),messages=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{disabled:true,textContent:'',classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn;}});return elements.get(id);};
 let data={enabled:false,parkingTabs:1,currentTab:{id:100,protected:false},windows:[{parked:false,sleeping:2}]},finish;
 globalThis.document={getElementById:el};
 globalThis.chrome={tabs:Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(k=>[k,{addListener(){}}])),runtime:{async sendMessage(msg){
  messages.push(msg.type);
  if(msg.type==='close-parked'){await new Promise(resolve=>{finish=resolve;});data={...data,parkingTabs:0};return {ok:true,data:{closed:1,remaining:0,failed:0}};}
  return {ok:true,data:structuredClone(data)};
 }}};
 try{
  await import(`../popup.js?test=${Math.random()}`);await flush();
  assert.equal(el('closeParked').disabled,false);assert.equal(el('parkedCount').textContent,0);
  assert.equal(el('toggle').textContent,'Resume automatic parking');
  const action=el('closeParked').click();await flush();assert(el('closeParked').disabled);assert(el('toggle').disabled);
  await el('closeParked').click();assert.equal(messages.filter(m=>m==='close-parked').length,1);
  finish();await action;
  assert(el('closeParked').disabled);assert.equal(el('sleepingCount').textContent,2);assert.equal(el('toggle').disabled,false);
  assert.equal(el('mode').textContent,'Parking paused');assert.equal(el('status').textContent,'Cleared 1 parking tab.');
  assert(!messages.includes('configure'));
 }finally{Object.assign(globalThis,original);}
});

test('popup Settings icon opens Settings exactly as the old Settings link did',async()=>{
 const original={document:globalThis.document,chrome:globalThis.chrome};const elements=new Map();let opened=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{disabled:true,textContent:'',classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn;}});return elements.get(id);};
 globalThis.document={getElementById:el};
 globalThis.chrome={tabs:Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(k=>[k,{addListener(){}}])),
  runtime:{openOptionsPage:async()=>{opened++;},async sendMessage(){return {ok:true,data:{enabled:true,parkingTabs:0,currentTab:null,windows:[]}};}}};
 try{await import(`../popup.js?settings=${Math.random()}`);await flush();await el('options').click();assert.equal(opened,1);}
 finally{Object.assign(globalThis,original);}
});

test('popup has a main landmark after its header, like Settings and the parking page',async()=>{
 const {readFileSync}=await import('node:fs');const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 assert.match(read('popup.html'),/<\/header>\n<main>\n<dl class="stats">[\s\S]*<p id="status" role="status" aria-live="polite"><\/p>\n<\/main><\/body>/);
 for(const page of ['options.html','parked.html'])assert.match(read(page),/<main\b/,page);
});
