import test from 'node:test';
import assert from 'node:assert/strict';
import {harness, copy} from './helpers.js';
const sender = h => ({id:'test',url:h.api.runtime.getURL('popup.html')});
const status = h => h.p.message({type:'status'},sender(h));
const close = h => h.p.message({type:'close-parked'},sender(h));
const setup = async (count=3,tabs=3) => {const h=harness(count,tabs);await h.restart();await h.parkAll();return h;};

test('global close restores all windows in place, removes only own pages and preserves sleeping neighbors',async()=>{
  const h=await setup(); const real=h.windows.flatMap(w=>w.tabs.filter(t=>h.p.real(t))).map(copy);
  h.tab(101).discarded=true;h.tab(202).pinned=true;
  const geometry=h.windows.map(({tabs,...w})=>copy(w)),settings=copy(h.p.settings);
  const ids=h.windows.flatMap(w=>w.tabs.filter(t=>h.p.token(t)).map(t=>t.id));
  const start=h.calls.length;h.jump(60000);const now=h.clock.now();
  assert.deepEqual(await close(h),{closed:3,remaining:0,failed:0});
  assert.deepEqual(h.windows.map(({tabs,...w})=>w),geometry);
  assert.deepEqual(h.windows.flatMap(w=>w.tabs.map(t=>t.id)),real.map(t=>t.id));
  assert(h.tab(101).discarded);assert(h.tab(202).pinned);
  for(const w of h.windows){assert(w.tabs[0].active);assert.equal(h.p.states[w.id].lastUse,now);assert.equal(h.p.states[w.id].parked,false);}
  assert.deepEqual(h.calls.slice(start).filter(c=>c[0]==='remove').map(c=>c[1]),ids);
  assert.deepEqual(h.p.settings,settings);assert.deepEqual(h.local.parkingRecords,{});
  assert.equal((await status(h)).parkingTabs,0);
  assert.equal((await status(h)).windows.filter(w=>w.parked).length,0);
  assert(!h.calls.slice(start).some(c=>c[0]==='discard'));
  await h.p.sweep();assert.equal((await status(h)).parkingTabs,0);
  h.jump(15*60000);await h.p.sweep();assert.equal((await status(h)).parkingTabs,3);
});

test('explicit close works while paused and does not change any settings or protected tabs',async()=>{
  const h=await setup();await h.p.configure({...h.p.settings,enabled:false,delayMinutes:30,debug:false});
  await h.p.message({type:'protect',tabId:101,protected:true},sender(h));
  const settings=copy(h.local.settings);await close(h);
  assert.deepEqual(h.local.settings,settings);assert.equal(h.p.settings.enabled,false);assert.deepEqual(h.p.protectedIds,[101]);
  assert.equal(h.alarms.has('parking'),false);await h.p.sweep();assert.equal((await status(h)).parkingTabs,0);
});

test('zero actual pages is an idempotent no-op even with stale counters and records',async()=>{
  const h=harness();await h.restart();h.p.states[1].parked=true;h.p.states[1].parkingId=100;
  h.p.records.staletoken={url:'https://example.org',title:'Old',index:0,updated:0};
  const before=copy(h.windows),n=h.calls.length;
  assert.equal((await status(h)).parkingTabs,0);assert.deepEqual(await close(h),{closed:0,remaining:0,failed:0});
  assert.deepEqual(h.windows,before);assert.equal(h.calls.length,n);assert.deepEqual(h.local.parkingRecords,{});assert.equal(h.p.states[1].parked,false);
});

test('inactive leftovers are actionable and preserve the manually selected real tab',async()=>{
  const h=await setup(1);await h.api.tabs.update(102,{active:true});
  const snapshot=await status(h);assert.equal(snapshot.windows[0].parked,false);assert.equal(snapshot.parkingTabs,1);
  await close(h);assert(h.tab(102).active);assert(h.tab(100).discarded);assert.equal((await status(h)).parkingTabs,0);
});

test('only parking tabs create one inactive blank tab before removal and keep their window',async()=>{
  const h=await setup(1,1),id=h.p.states[1].parkingId;
  await h.api.tabs.remove(100);await h.p.removed(100,{windowId:1});const start=h.calls.length;
  await h.api.tabs.create({windowId:1,active:false,url:h.tab(id).url});
  h.hooks.remove=()=>{assert(h.windows[0].tabs.some(t=>h.p.real(t)&&t.active));assert(h.windows[0].tabs.length>=2);};
  assert.deepEqual(await close(h),{closed:2,remaining:0,failed:0});
  assert.equal(h.windows.length,1);assert.equal(h.windows[0].tabs.length,1);assert.equal(h.windows[0].tabs[0].url,'about:blank');
  const creates=h.calls.slice(start).filter(c=>c[0]==='create'&&c[1].url==='about:blank');
  assert.equal(creates.length,1);assert.deepEqual(creates[0][1],{windowId:1,active:false,url:'about:blank'});
});

test('closed original target uses same-window fallback without touching other sleeping tabs',async()=>{
  const h=await setup(1);await h.api.tabs.remove(100);h.tab(102).discarded=true;
  await close(h);assert(h.tab(101).active);assert(h.tab(102).discarded);assert.equal(h.windows.length,1);
});

test('target disappearing at activation is retried with a current fallback',async()=>{
  const h=await setup(1),update=h.api.tabs.update;
  h.api.tabs.update=async(id,props)=>{if(id===100){await h.api.tabs.remove(100);throw Error('No tab with id: 100');}return update(id,props);};
  assert.equal((await close(h)).closed,1);assert(h.tab(101).active);
});

test('manual selection during target lookup wins over the saved target',async()=>{
  const h=await setup(1);h.hooks.getTab=async id=>{if(id===100){await h.api.tabs.update(102,{active:true});h.p.signalTab(1);}};
  await close(h);assert(h.tab(102).active);assert(h.tab(100).discarded);assert.equal((await status(h)).parkingTabs,0);
});

test('window disappearing mid-operation does not abort the remaining windows',async()=>{
  const h=await setup();let once=false;
  h.hooks.getWindow=id=>{if(id===1&&!once){once=true;h.windows.splice(0,1);}};
  assert.equal((await close(h)).remaining,0);assert.deepEqual(h.windows.map(w=>w.id),[2,3]);assert(!h.p.states[1]);
});

test('parking page disappearing after enumeration is harmless',async()=>{
  const h=await setup(1);const id=h.p.states[1].parkingId;let once=false;
  h.hooks.getWindow=async()=>{if(!once){once=true;await h.api.tabs.remove(id);}};
  assert.equal((await close(h)).remaining,0);assert.equal(h.windows.length,1);
});

test('busy page does not abort others; retry finishes without changing enabled state',async()=>{
  const h=await setup();const blocked=h.p.states[1].parkingId;
  h.hooks.remove=id=>{if(id===blocked)throw Error('Tabs cannot be edited right now');};
  assert.deepEqual(await close(h),{closed:2,remaining:1,failed:0});assert(h.tab(blocked));
  h.hooks.remove=undefined;assert.deepEqual(await close(h),{closed:1,remaining:0,failed:0});
  assert.equal(h.p.settings.enabled,true);
});

test('unexpected failure is reported but does not abort independent windows',async()=>{
  const h=await setup(),error=console.error,errors=[];console.error=(...args)=>errors.push(args);
  const blocked=h.p.states[1].parkingId;h.hooks.remove=id=>{if(id===blocked)throw Error('Unexpected API failure');};
  try{assert.deepEqual(await close(h),{closed:2,remaining:1,failed:1});assert.equal(errors.length,1);}finally{console.error=error;}
});

test('navigation away, unrelated extensions, incognito and non-normal windows are untouched',async()=>{
  const h=await setup(5);h.windows[0].incognito=true;h.windows[1].type='popup';
  h.tab(h.p.states[3].parkingId).url='chrome-extension://other/parked.html#other-token';
  h.tab(h.p.states[4].parkingId).pendingUrl='https://example.org/user-work';
  const before=copy(h.windows.slice(0,4));assert.equal((await close(h)).closed,1);
  assert.deepEqual(h.windows.slice(0,4),before);
});

test('a real page navigating toward a parking URL is never removed before commit',async()=>{
  const h=harness(1);await h.restart();h.tab(101).pendingUrl=h.p.parkingURL+'#incoming-token';
  assert.equal((await close(h)).closed,0);assert(h.tab(101));
});

test('worker and browser restart recover the actual pages for explicit close',async()=>{
  for(const newSession of [false,true]){const h=await setup();await h.restart(newSession);assert.equal((await close(h)).closed,3);assert.deepEqual(h.local.parkingRecords,{});}
});

test('duplicate tokens retain recovery until the last live copy is removed',async()=>{
  const h=await setup(2);const token=h.p.states[1].token;
  h.tab(h.p.states[2].parkingId).url=h.p.parkingURL+'#'+token;
  await h.api.tabs.update(100,{active:true});await h.p.cleanupParking(1);assert(h.local.parkingRecords[token]);
  await close(h);assert(!h.local.parkingRecords[token]);
});

test('malformed saved state cannot prevent startup or cause immediate parking',async()=>{
  const h=harness();h.local.parkingRecords={badtoken:null,othertoken:'invalid'};
  h.session.runtimeState={states:{1:null,2:{lastUse:'invalid'}},protectedIds:{bad:true}};
  await h.restart();assert.deepEqual(h.p.records,{});assert.deepEqual(h.p.protectedIds,[]);
  await h.p.sweep();assert.equal(h.calls.length,0);
});

test('only extension UI pages can invoke global close and malformed messages fail cleanly',async()=>{
  const h=await setup(1),id=h.p.states[1].parkingId;
  await assert.rejects(()=>h.p.message({type:'close-parked'},{id:'test',url:h.tab(id).url,tab:{id}}),/Unsupported parking action/);
  await assert.rejects(()=>h.p.message({type:'close-parked'},{id:'other',url:sender(h).url}),/Invalid sender/);
  await assert.rejects(()=>h.p.message(null,sender(h)),/Invalid message/);
  await assert.rejects(()=>h.p.message({type:'protect',tabId:100,protected:'false'},sender(h)),/Invalid tab protection/);
  assert(h.tab(id));
});

for(const mutation of ['selection','parking navigation','parking detach'])test(`parking revalidates after the final download check: ${mutation}`,async()=>{
  const h=harness(2);await h.restart();let checks=0;
  h.hooks.downloads=async()=>{if(++checks!==2)return;const parking=h.windows[1].tabs.find(t=>h.p.token(t));
    if(mutation==='selection'){await h.api.tabs.update(202,{active:true});h.p.signalTab(2);}
    if(mutation==='parking navigation')parking.url='https://example.org/user-work';
    if(mutation==='parking detach')h.windows[1].tabs=h.windows[1].tabs.filter(t=>t.id!==parking.id);
  };
  await h.p.park(2);assert(!h.calls.some(c=>c[0]==='discard'));assert(!h.calls.some(c=>c[0]==='update'&&c[1]>=10000));
});

test('the last real target disappearing at activation creates a safe replacement on retry',async()=>{
 const h=await setup(1,1),update=h.api.tabs.update;
 h.api.tabs.update=async(id,props)=>{if(id===100){await h.api.tabs.remove(100);throw Error('No tab with id: 100');}return update(id,props);};
 await close(h);assert.equal(h.windows.length,1);assert.equal(h.windows[0].tabs.length,1);assert.equal(h.windows[0].tabs[0].url,'about:blank');
});

test('global close clears a pending dwell without changing focus',async()=>{
 const h=await setup(1);await h.focus(1);assert(h.p.dwell);const focus=h.p.focus;
 await close(h);assert.equal(h.p.dwell,null);assert.equal(h.alarms.has('dwell-recovery'),false);assert.equal(h.p.focus,focus);
 await h.advance(5000);assert.equal((await status(h)).parkingTabs,0);
});

test('missing ownership metadata on a created tab cannot authorize parking or discarding',async()=>{
 const h=harness();await h.restart();h.hooks.create=tab=>{delete tab.url;};
 await h.p.park(2);assert(!h.calls.some(c=>c[0]==='update'||c[0]==='discard'));assert.deepEqual(h.p.records,{});
});
