import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';

function event() { const listeners=[]; return {addListener: fn=>listeners.push(fn),emit: (...args)=>listeners.map(fn=>fn(...args))}; }

test('worker queue retries failed initialization, caches successful init and preserves original errors', async()=>{
  const h=harness();
  for(const [namespace,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))
    for(const name of names)h.api[namespace][name]=event();
  const original={chrome:globalThis.chrome,now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,error:console.error};
  const errors=[], failure=new Error('Transient storage failure');let attempts=0;
  const get=h.api.storage.local.get;
  h.api.storage.local.get=async function(keys){if(++attempts===1)throw failure;return get.call(this,keys);};
  globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;globalThis.clearTimeout=h.clock.clearTimeout;
  console.error=(...args)=>errors.push(args);
  const send=msg=>new Promise(resolve=>h.api.runtime.onMessage.emit(msg,{id:'test',url:h.api.runtime.getURL('options.html')},resolve));
  try {
    await import(`../background.js?queue=${Math.random()}`);
    const loaded=await send({type:'settings'});assert(loaded.ok);assert.equal(attempts,2);
    assert.equal(errors[0][1],failure);
    const invalid=await send({type:'configure',settings:{delayMinutes:0}});assert.equal(invalid.ok,false);
    assert.match(invalid.error,/Parking delay/);
    const saved=await send({type:'configure',settings:{...loaded.data,delayMinutes:30}});assert(saved.ok);assert.equal(h.local.settings.delayMinutes,30);
    const reset=await send({type:'reset'});assert(reset.ok);assert.equal(h.local.settings.delayMinutes,15);
    assert.equal(attempts,2);assert(!errors.some(args=>String(args[1]).includes('Illegal invocation')));
  }finally{globalThis.chrome=original.chrome;Date.now=original.now;globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;console.error=original.error;}
});

test('open-page metric updates coalesce tab events, ignore unrelated windows and never poll', async()=>{
  const original={chrome:globalThis.chrome,setTimeout:globalThis.setTimeout};
  const tabs=Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(k=>[k,event()]));
  const timers=[];let refreshes=0;
  globalThis.chrome={tabs};globalThis.setTimeout=fn=>{timers.push(fn);return timers.length;};
  try {
    const {watchTabState}=await import('../ui.js');watchTabState(async()=>{refreshes++;},()=>2);
    tabs.onUpdated.emit(5,{discarded:true},{windowId:1});assert.equal(timers.length,0);
    tabs.onUpdated.emit(6,{title:'unrelated'},{windowId:2});assert.equal(timers.length,0);
    tabs.onUpdated.emit(6,{discarded:true},{windowId:2});tabs.onRemoved.emit(6,{windowId:2});tabs.onActivated.emit({windowId:2});
    assert.equal(timers.length,1);timers[0]();await Promise.resolve();assert.equal(refreshes,1);assert.equal(timers.length,1);
  }finally{globalThis.chrome=original.chrome;globalThis.setTimeout=original.setTimeout;}
});

test('real worker queue handles its own activation/removal events and a second parking cycle',async()=>{
  const h=harness(2,1);h.local.settings={sleepingMode:'immediate'};
  for(const [namespace,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))
    for(const name of names)h.api[namespace][name]=event();
  const original={chrome:globalThis.chrome,now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,error:console.error};
  const errors=[];const update=h.api.tabs.update,remove=h.api.tabs.remove,create=h.api.tabs.create;
  h.api.tabs.update=async(id,props)=>{const tab=await update(id,props);if(props.active)h.api.tabs.onActivated.emit({windowId:tab.windowId,tabId:id});return tab;};
  h.api.tabs.remove=async id=>{const windowId=h.tab(id).windowId;await remove(id);h.api.tabs.onRemoved.emit(id,{windowId,isWindowClosing:false});};
  h.api.tabs.create=async props=>{const tab=await create(props);h.api.tabs.onCreated.emit(tab);return tab;};
  globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;globalThis.clearTimeout=h.clock.clearTimeout;console.error=(...args)=>errors.push(args);
  const send=msg=>new Promise(resolve=>h.api.runtime.onMessage.emit(msg,{id:'test',url:h.api.runtime.getURL('options.html')},resolve));
  const drain=async()=>{for(let i=0;i<5;i++)assert((await send({type:'settings'})).ok);};
  try{
    await import(`../background.js?lifecycle=${Math.random()}`);await drain();
    h.jump(16*60000);h.api.alarms.onAlarm.emit({name:'parking'});await drain();const first=h.windows[1].tabs.at(-1).id;
    for(const w of h.windows)w.focused=w.id===2;h.api.windows.onFocusChanged.emit(2);await drain();await h.advance(2000);await drain();
    assert(!h.tab(first));assert(h.tab(200).active);assert.equal(h.windows[1].tabs.length,1);
    for(const w of h.windows)w.focused=false;h.api.windows.onFocusChanged.emit(-1);await drain();h.jump(16*60000);h.api.alarms.onAlarm.emit({name:'parking'});await drain();
    const second=h.windows[1].tabs.at(-1);assert.notEqual(second.id,first);assert(second.active);assert(h.tab(200).discarded);assert.deepEqual(errors,[]);
    const settings=(await send({type:'settings'})).data;
    assert((await send({type:'configure',settings:{...settings,enabled:false}})).ok);
    const closed=await send({type:'close-parked'});assert(closed.ok);assert.equal(closed.data.remaining,0);assert.equal(closed.data.closed,2);
    await drain();const status=(await send({type:'status'})).data;
    assert.equal(status.parkingTabs,0);assert.equal(status.enabled,false);assert.equal(h.windows.length,2);
    assert(h.windows.every(w=>w.tabs.length===1));assert.equal(h.alarms.has('parking'),false);assert.deepEqual(errors,[]);
  }finally{globalThis.chrome=original.chrome;Date.now=original.now;globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;console.error=original.error;}
});

test('queued mode changes cancel stale discards and removed-page requests never log lifecycle errors',async()=>{
 const h=harness();h.local.settings={sleepingMode:'immediate'};
 for(const [ns,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))for(const name of names)h.api[ns][name]=event();
 const previous={chrome:globalThis.chrome,now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,error:console.error};const errors=[];
 globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;globalThis.clearTimeout=h.clock.clearTimeout;console.error=(...a)=>errors.push(a);
 const sender={id:'test',url:h.api.runtime.getURL('options.html')};
 const send=(message,from=sender)=>new Promise(resolve=>h.api.runtime.onMessage.emit(message,from,resolve));
 try{
  await import(`../background.js?v15=${Math.random()}`);const settings=(await send({type:'settings'})).data;
  let changed;h.hooks.update=()=>{if(!changed)changed=send({type:'configure',settings:{...settings,sleepingMode:'chrome'}});};
  h.jump(16*60000);h.api.alarms.onAlarm.emit({name:'parking'});await send({type:'settings'});await changed;
  assert(!h.calls.some(c=>c[0]==='discard'));assert.equal(h.local.settings.sleepingMode,'chrome');h.hooks.update=null;
  const parking=h.windows[1].tabs.at(-1);const from={id:'test',url:parking.url,tab:parking};
  const clearing=send({type:'close-parked'});const info=send({type:'parked-info'},from),restore=send({type:'restore'},from);
  assert((await clearing).ok);assert.deepEqual(await info,{ok:true,data:{gone:true}});assert.deepEqual(await restore,{ok:true,data:{gone:true}});assert.deepEqual(errors,[]);
  const fault=new Error('Unexpected storage fault');h.api.tabs.get=async()=>{throw fault;};
  assert.equal((await send({type:'parked-info'},from)).ok,false);assert(errors.some(a=>a.includes(fault)));
 }finally{globalThis.chrome=previous.chrome;Date.now=previous.now;globalThis.setTimeout=previous.setTimeout;globalThis.clearTimeout=previous.clearTimeout;console.error=previous.error;}
});

test('page teardown cancels pending refresh and removes all tab listeners',async()=>{
 const previous={chrome:globalThis.chrome,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const make=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...a)=>[...listeners].forEach(f=>f(...a)),listeners};};
 const tabs=Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(n=>[n,make()]));const timers=new Map();const hide=make();let calls=0;
 globalThis.chrome={tabs};globalThis.window={addEventListener:(_,f)=>hide.addListener(f),removeEventListener:(_,f)=>hide.removeListener(f)};globalThis.setTimeout=f=>{timers.set(1,f);return 1;};globalThis.clearTimeout=id=>timers.delete(id);
 try{const {watchTabState}=await import('../ui.js');const stop=watchTabState(async()=>{calls++;});tabs.onActivated.emit({windowId:1});assert.equal(timers.size,1);hide.emit();assert.equal(timers.size,0);assert(Object.values(tabs).every(e=>!e.listeners.size));stop();assert.equal(calls,0);}
 finally{Object.assign(globalThis,previous);}
});

for(const action of ['none','mode','pause','protect','clear','focus','select','download'])test(`real worker queue: bulk discard with ${action} after first candidate`,async()=>{
 const h=harness();h.local.settings={sleepingMode:'immediate'};
 for(const [ns,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))for(const name of names)h.api[ns][name]=event();
 const old={chrome:globalThis.chrome,now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,error:console.error};const errors=[];
 const create=h.api.tabs.create,update=h.api.tabs.update,remove=h.api.tabs.remove;
 h.api.tabs.create=async props=>{const t=await create(props);h.api.tabs.onCreated.emit(t);return t;};
 h.api.tabs.update=async(id,props)=>{const t=await update(id,props);if(props.active)h.api.tabs.onActivated.emit({windowId:t.windowId,tabId:id});return t;};
 h.api.tabs.remove=async id=>{const windowId=h.tab(id).windowId;await remove(id);h.api.tabs.onRemoved.emit(id,{windowId,isWindowClosing:false});};
 globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;globalThis.clearTimeout=h.clock.clearTimeout;console.error=(...a)=>errors.push(a);
 const send=message=>new Promise(resolve=>h.api.runtime.onMessage.emit(message,{id:'test',url:h.api.runtime.getURL('options.html')},resolve));
 try{
  await import(`../background.js?bulk=${action}-${Math.random()}`);await send({type:'settings'});await h.advance(2000);await send({type:'settings'});const settings=(await send({type:'settings'})).data;let pending;
  h.hooks.discard=async t=>{if(t.id!==200)return;
   if(action==='mode')pending=send({type:'configure',settings:{...settings,sleepingMode:'chrome'}});
   if(action==='pause')pending=send({type:'configure',settings:{...settings,enabled:false}});
   if(action==='protect')pending=send({type:'protect',tabId:201,protected:true});
   if(action==='clear')pending=send({type:'close-parked'});
   if(action==='focus'){h.windows.forEach(w=>{w.focused=w.id===2;});h.api.windows.onFocusChanged.emit(2);}
   if(action==='select')await h.api.tabs.update(201,{active:true});
   if(action==='download'){h.hooks.downloading=true;h.api.downloads.onCreated.emit({id:1,state:'in_progress'});}
  };
  h.jump(16*60000);h.api.alarms.onAlarm.emit({name:'parking'});
  for(let i=0;i<6;i++)assert((await send({type:'settings'})).ok);
  if(pending)assert((await pending).ok);
  assert.deepEqual(h.calls.filter(c=>c[0]==='discard').map(c=>c[1]),action==='none'?[200,201,202]:[200]);assert.deepEqual(errors,[]);
  if(action==='clear'){assert(h.tab(200).active);assert(!h.tab(201).discarded);assert(!h.tab(202).discarded);assert.equal(h.windows[1].tabs.length,3);}
  if(action==='select'){h.jump(3000);h.api.alarms.onAlarm.emit({name:'dwell-recovery'});await send({type:'settings'});assert(h.tab(201).active);assert(h.tab(200).discarded);}
 }finally{globalThis.chrome=old.chrome;Date.now=old.now;globalThis.setTimeout=old.setTimeout;globalThis.clearTimeout=old.clearTimeout;console.error=old.error;}
});

test('Clear parking-only window does not trigger discards in another overdue window through its blank-tab event',async()=>{
 const h=harness(3);h.local.settings={sleepingMode:'immediate'};
 for(const [ns,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))for(const name of names)h.api[ns][name]=event();
 const old={chrome:globalThis.chrome,now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,error:console.error};const errors=[];
 const create=h.api.tabs.create,update=h.api.tabs.update,remove=h.api.tabs.remove;
 h.api.tabs.create=async props=>{const t=await create(props);h.api.tabs.onCreated.emit(t);return t;};
 h.api.tabs.update=async(id,props)=>{const t=await update(id,props);if(props.active)h.api.tabs.onActivated.emit({windowId:t.windowId,tabId:id});return t;};
 h.api.tabs.remove=async id=>{const windowId=h.tab(id).windowId;await remove(id);h.api.tabs.onRemoved.emit(id,{windowId,isWindowClosing:false});};
 globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;globalThis.clearTimeout=h.clock.clearTimeout;console.error=(...a)=>errors.push(a);
 const send=message=>new Promise(resolve=>h.api.runtime.onMessage.emit(message,{id:'test',url:h.api.runtime.getURL('options.html')},resolve));
 try{
  h.windows[1].tabs=[{id:299,windowId:2,index:0,active:true,url:h.api.runtime.getURL('parked.html')+'#orphan-token',status:'complete'}];
  await import(`../background.js?clear-orphan=${Math.random()}`);await send({type:'settings'});await h.advance(2000);await send({type:'settings'});
  h.jump(16*60000);const result=await send({type:'close-parked'});assert(result.ok);assert.equal(result.data.remaining,0);
  for(let i=0;i<6;i++)assert((await send({type:'settings'})).ok);
  assert.equal(h.windows.length,3);assert.equal(h.windows[1].tabs.length,1);assert.equal(h.windows[1].tabs[0].url,'about:blank');assert(h.windows[1].tabs[0].active);
  assert.deepEqual(h.calls.filter(c=>c[0]==='discard'),[]);assert(h.tab(300).active);assert.deepEqual(errors,[]);
  // The unrelated window can still park when the next ordinary alarm fires.
  h.api.alarms.onAlarm.emit({name:'parking'});for(let i=0;i<6;i++)await send({type:'settings'});
  assert.deepEqual(h.calls.filter(c=>c[0]==='discard').map(c=>c[1]),[300,301,302]);
 }finally{globalThis.chrome=old.chrome;Date.now=old.now;globalThis.setTimeout=old.setTimeout;globalThis.clearTimeout=old.clearTimeout;console.error=old.error;}
});
