import test from 'node:test';
import assert from 'node:assert/strict';
import {harness, copy} from './helpers.js';

async function parked(count = 2) {
  const h = harness(count, 1); await h.restart(); await h.parkAll(); return h;
}
const empty = async (h, id = 1) => { await h.api.tabs.remove(id * 100); };

// Exercise the real background queue and synchronous signals with Chrome-like
// create/remove/activation events, including events emitted during an API call.
async function worker(h, run, firstMessage) {
  const old = {chrome:globalThis.chrome, now:Date.now, setTimeout:globalThis.setTimeout,
    clearTimeout:globalThis.clearTimeout, error:console.error};
  const errors = [];
  const event = () => { const listeners=[]; return {addListener:f=>listeners.push(f),emit:(...a)=>listeners.forEach(f=>f(...a))}; };
  for (const [ns,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],
    tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],
    alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))
    for (const name of names) h.api[ns][name]=event();
  const create=h.api.tabs.create, update=h.api.tabs.update, remove=h.api.tabs.remove;
  h.api.tabs.create=async props=>{const t=await create(props);h.api.tabs.onCreated.emit(t);return t;};
  h.api.tabs.update=async(id,props)=>{const t=await update(id,props);if(props.active)h.api.tabs.onActivated.emit({windowId:t.windowId,tabId:id});return t;};
  h.api.tabs.remove=async id=>{
    const windowId=h.tab(id)?.windowId;await remove(id);
    h.api.tabs.onRemoved.emit(id,{windowId,isWindowClosing:false});
    const w=h.windows.find(w=>w.id===windowId);
    if(!w)h.api.windows.onRemoved.emit(windowId);
  };
  globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;
  globalThis.clearTimeout=h.clock.clearTimeout;console.error=(...args)=>errors.push(args);
  const send=msg=>new Promise(resolve=>h.api.runtime.onMessage.emit(msg,{id:'test',url:h.api.runtime.getURL('popup.html')},resolve));
  const drain=async()=>{for(let i=0;i<6;i++)assert((await send({type:'settings'})).ok);};
  try {
    await import(`../background.js?empty=${Math.random()}`);
    if(firstMessage)await firstMessage(send);
    await drain();await run({send,drain});await drain();assert.deepEqual(errors,[]);
  } finally {
    globalThis.chrome=old.chrome;Date.now=old.now;globalThis.setTimeout=old.setTimeout;
    globalThis.clearTimeout=old.clearTimeout;console.error=old.error;
  }
}

test('natural close removes only its own shell and keeps other parked windows unchanged',async()=>{
  const h=await parked(), other=copy(h.windows[1]), token=h.p.states[1].token;
  await worker(h,async({drain})=>{
    await h.api.tabs.remove(100);await drain();
    assert.equal(h.windows.length,1);assert.deepEqual(h.windows[0],other);
    assert(!h.local.parkingRecords[token]);assert(!h.session.runtimeState.states[1]);
  });
});

for(const returns of [false,true])test(`detach waits for attach; final tab returns to source=${returns}`,async()=>{
  const h=await parked(), moved=h.tab(100), source=h.windows[0], destination=h.windows[1];
  await worker(h,async({drain})=>{
    source.tabs=source.tabs.filter(t=>t.id!==moved.id);
    h.api.tabs.onDetached.emit(moved.id,{oldWindowId:1,oldPosition:0});await drain();
    assert(h.windows.includes(source),'do not close during the detached interval');
    const target=returns?source:destination;moved.windowId=target.id;moved.index=target.tabs.length;moved.active=false;
    target.tabs.push(moved);const before=copy(destination);
    h.api.tabs.onAttached.emit(moved.id,{newWindowId:target.id,newPosition:moved.index});await drain();
    assert.equal(h.windows.includes(source),returns);assert(h.tab(100));
    assert.deepEqual(destination,before,'destination tabs and activation are untouched');
  });
});

test('detached tab closed before attach still cleans only its former source',async()=>{
  const h=await parked();await worker(h,async({drain})=>{
    h.windows[0].tabs=h.windows[0].tabs.filter(t=>t.id!==100);
    h.api.tabs.onDetached.emit(100,{oldWindowId:1,oldPosition:0});await drain();
    h.api.tabs.onRemoved.emit(100,{windowId:1,isWindowClosing:false});await drain();
    assert.deepEqual(h.windows.map(w=>w.id),[2]);
  });
});

for(const signal of ['creation','activation','removal','detach','attach','move','replacement','navigation','window close','settings','Clear'])
test(`real worker ${signal} signal cancels an already captured empty snapshot`,async()=>{
  const h=await parked();await worker(h,async({send,drain})=>{
    const get=h.api.windows.get;let reads=0, pending;
    const parking=h.windows[0].tabs.find(t=>t.url.includes('parked.html#'));
    h.hooks.remove=id=>{
      if(id===parking.id)assert(h.windows.find(w=>w.id===1).tabs.some(t=>t.id===777&&t.active),
        'only Clear/restoration may clean a page after selecting the newly arrived real tab');
    };
    h.api.windows.get=async id=>{
      const snapshot=await get(id);
      if(id===1&&++reads===2){
        // The API response was captured before this change. The synchronous
        // event signal must invalidate it before the queued event handler runs.
        const added={id:777,windowId:1,index:1,url:'https://example.org/new',active:false,status:'complete',autoDiscardable:true};
        h.windows.find(w=>w.id===1).tabs.push(added);
        if(signal==='creation')h.api.tabs.onCreated.emit(copy(added));
        if(signal==='activation')h.api.tabs.onActivated.emit({windowId:1,tabId:parking.id});
        if(signal==='removal')h.api.tabs.onRemoved.emit(888,{windowId:1,isWindowClosing:false});
        if(signal==='detach')h.api.tabs.onDetached.emit(888,{oldWindowId:1,oldPosition:0});
        if(signal==='attach')h.api.tabs.onAttached.emit(777,{newWindowId:1,newPosition:1});
        if(signal==='move')h.api.tabs.onMoved.emit(777,{windowId:1,fromIndex:0,toIndex:1});
        if(signal==='replacement')h.api.tabs.onReplaced.emit(777,888);
        if(signal==='navigation')h.api.tabs.onUpdated.emit(parking.id,{url:parking.url,status:'complete'},copy(parking));
        if(signal==='window close')h.api.windows.onRemoved.emit(1);
        if(signal==='settings')pending=send({type:'configure',settings:{...h.local.settings,delayMinutes:30}});
        if(signal==='Clear')pending=send({type:'close-parked'});
      }
      return snapshot;
    };
    await h.api.tabs.remove(100);await drain();if(pending)assert((await pending).ok);
    assert(h.tab(777));assert(h.windows.some(w=>w.id===1));
    if(signal!=='Clear')assert(h.tab(parking.id),'stale cleanup must leave the page alone');
  });
});

for(const invalid of ['missing journal','unknown token','pending navigation','foreign extension','real page','wrong window'])
test(`empty cleanup refuses unverified ownership: ${invalid}`,async()=>{
  const h=await parked();await empty(h);const s=h.p.states[1],t=h.tab(s.parkingId);
  if(invalid==='missing journal')delete h.p.records[s.token];
  if(invalid==='unknown token')t.url=h.p.parkingURL+'#unknown-token';
  if(invalid==='pending navigation')t.pendingUrl='https://example.org/new';
  if(invalid==='foreign extension')t.url='chrome-extension://other/parked.html#foreign-token';
  if(invalid==='real page')t.url='about:blank';
  if(invalid==='wrong window')t.windowId=2;
  assert.equal(await h.p.cleanupEmptyParked(1),false);assert(h.tab(t.id));
});

test('duplicate journaled pages clean up without losing a shared live recovery record',async()=>{
  const h=await parked();const s=h.p.states[1],url=h.tab(s.parkingId).url;
  await h.api.tabs.create({windowId:1,active:false,url});h.tab(h.p.states[2].parkingId).url=url;
  await empty(h);assert(await h.p.cleanupEmptyParked(1));assert.equal(h.windows.length,1);
  assert(h.local.parkingRecords[s.token]);
  await empty(h,2);await h.restart();assert.equal(h.windows.length,0);assert(!h.local.parkingRecords[s.token]);
});

for(const newSession of [false,true])test(`restart validates live shell, not stale IDs; new session=${newSession}`,async()=>{
  const h=await parked();await empty(h);const real=copy(h.windows[1]);
  if(newSession){h.windows[0].id=9;h.windows[0].tabs.forEach(t=>{t.windowId=9;t.id+=900;});}
  await h.restart(newSession);assert.deepEqual(h.windows,[real]);
  assert.deepEqual(Object.keys(h.session.runtimeState.states),['2']);
});

test('restart leaves a real tab and unknown shell intact despite stale parked state',async()=>{
  const h=await parked();await empty(h);delete h.local.parkingRecords[h.p.states[1].token];
  const before=copy(h.windows);await h.restart();assert.deepEqual(h.windows,before);
});

test('Clear queued during startup preserves a known shell while paused',async()=>{
  const h=await parked(1);await empty(h);h.local.settings={enabled:false};
  await worker(h,async()=>{
    assert.equal(h.windows.length,1);assert.equal(h.windows[0].tabs.length,1);
    assert.equal(h.windows[0].tabs[0].url,'about:blank');assert(h.windows[0].tabs[0].active);
    assert(!h.calls.some(c=>c[0]==='discard'));assert.equal(h.local.settings.enabled,false);
  },async send=>{const result=await send({type:'close-parked'});assert(result.ok);assert.equal(result.data.remaining,0);});
});

test('manual parking-page removal and repeated cleanup are harmless',async()=>{
  const h=await parked();const id=h.p.states[1].parkingId,other=copy(h.windows[1]);
  await h.api.tabs.remove(id);await h.p.removed(id,{windowId:1});
  assert.equal(await h.p.cleanupEmptyParked(1),false);assert.equal(await h.p.cleanupEmptyParked(1),false);
  assert(h.tab(100));assert.deepEqual(h.windows[1],other);
});

test('busy shell removal fails closed and a later sweep retries; unexpected errors surface',async()=>{
  const h=await parked();await empty(h);h.hooks.remove=()=>{throw Error('Tabs cannot be edited right now');};
  assert.equal(await h.p.cleanupEmptyParked(1),false);assert.equal(h.windows.length,2);
  h.hooks.remove=()=>{throw new TypeError('Unexpected failure');};
  await assert.rejects(()=>h.p.cleanupEmptyParked(1),/Unexpected failure/);
  h.hooks.remove=undefined;await h.p.sweep();assert.deepEqual(h.windows.map(w=>w.id),[2]);
});

for(const settled of [false,true])test(`worker restart recovers an interrupted transfer; settled=${settled}`,async()=>{
  const h=await parked(), moved=copy(h.tab(100));
  await empty(h);h.p.detachedTabs.set(100,1);await h.p.save();
  const get=h.api.tabs.get;h.api.tabs.get=async id=>id===100?copy(moved):get(id);
  if(settled){moved.windowId=2;moved.index=h.windows[1].tabs.length;h.windows[1].tabs.push(moved);}
  await h.restart();
  assert.equal(h.windows.some(w=>w.id===1),!settled);
  assert.equal(h.p.detachedTabs.has(100),!settled);
  if(!settled){
    moved.windowId=2;h.windows[1].tabs.push(moved);h.p.detachedTabs.delete(100);h.p.signalTab(2);
    await h.p.cleanupEmptyParked(1);assert.deepEqual(h.windows.map(w=>w.id),[2]);
  }
  assert(h.tab(100));
});

for(const jump of [-1,5001])test(`empty cleanup rejects clock jump ${jump} between reads`,async()=>{
  const h=await parked();await empty(h);let reads=0;
  h.hooks.getWindow=id=>{if(id===1&&++reads===2)h.jump(jump);};
  assert.equal(await h.p.cleanupEmptyParked(1),false);assert(h.windows.some(w=>w.id===1));
});

for(const variant of ['distinct journaled token','unrelated extension page','parking page moved away'])
test(`multiple-page cleanup respects every page and its source: ${variant}`,async()=>{
  const h=await parked(),s=h.p.states[1];await empty(h);
  const extra=await h.api.tabs.create({windowId:1,active:false,url:h.p.parkingURL+'#second-valid-token'});
  h.p.records['second-valid-token']={...h.p.records[s.token]};await h.p.saveRecords();
  const other=copy(h.windows[1]);
  if(variant==='unrelated extension page')h.tab(extra.id).url='chrome-extension://other/page';
  if(variant==='parking page moved away'){
    let reads=0;h.hooks.getWindow=id=>{
      if(id!==1||++reads!==2)return;
      const t=h.tab(extra.id);h.windows[0].tabs=h.windows[0].tabs.filter(x=>x.id!==t.id);
      t.windowId=2;h.windows[1].tabs.push(t);h.p.signalTab(1);
    };
  }
  const before=h.calls.length;await h.p.cleanupEmptyParked(1);
  if(variant==='distinct journaled token'){
    assert.deepEqual(h.windows,[other]);assert(!h.local.parkingRecords[s.token]);assert(!h.local.parkingRecords['second-valid-token']);
  }else{
    assert(h.windows.some(w=>w.id===1));assert(h.tab(extra.id));assert.equal(h.calls.length,before);
  }
});

test('paused worker persists a detached transfer before waiting for attachment',async()=>{
  const h=await parked();h.local.settings={enabled:false};await worker(h,async({drain})=>{
    h.windows[0].tabs=h.windows[0].tabs.filter(t=>t.id!==100);
    h.api.tabs.onDetached.emit(100,{oldWindowId:1,oldPosition:0});await drain();
    assert.deepEqual(h.session.runtimeState.detachedTabs,[[100,1]]);assert(h.windows.some(w=>w.id===1));
  });
});
