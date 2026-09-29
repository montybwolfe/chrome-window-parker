import test from 'node:test';
import assert from 'node:assert/strict';
import {Parker} from '../engine.js';
import {DEFAULTS, matchesRule, skipReason, validateSettings} from '../settings.js';
import {readFileSync, readdirSync} from 'node:fs';

import {harness, copy} from './helpers.js';

test('defaults and setting validation',()=>{
  assert.equal(DEFAULTS.delayMinutes,15);assert.equal(DEFAULTS.dwellSeconds,2);assert.equal(DEFAULTS.discardPinned,false);
  for(const input of [{delayMinutes:0},{delayMinutes:Infinity},{dwellSeconds:21},{enabled:'yes'},{exclusions:['bad rule']}])assert.throws(()=>validateSettings(input));
});
test('domain boundaries and literal URL glob matching',()=>{
  assert(matchesRule('https://sub.mail.google.com/inbox','mail.google.com'));
  assert(!matchesRule('https://evilmail.google.com','mail.google.com'));
  assert(!matchesRule('https://mail.google.com.evil.test','mail.google.com'));
  assert(matchesRule('https://example.com/work/a?x=1','https://example.com/work/*'));
  assert(!matchesRule('https://exampleXcom/work/a','https://example.com/work/*'));
});
test('park same window, discard eligible real tabs, preserving layout',async()=>{
  const h=harness();h.local.settings={sleepingMode:'immediate'};await h.restart();await h.advance(16*60000);
  const before=copy(h.windows);await h.p.sweep();
  assert(!h.p.states[1].parked);assert(h.p.states[2].parked);
  const w=h.windows[1];assert(w.tabs[0].discarded);assert(w.tabs.slice(1,3).every(t=>t.discarded));
  assert.deepEqual(w.tabs.slice(0,3).map(t=>[t.id,t.url,t.index,t.groupId,t.pinned]),before[1].tabs.map(t=>[t.id,t.url,t.index,t.groupId,t.pinned]));
  for(const key of ['left','top','width','height','state','id','focused'])assert.equal(w[key],before[1][key]);
  assert.deepEqual(h.calls.find(c=>c[0]==='update')[2],{active:true});
  assert.equal(h.calls.find(c=>c[0]==='create')[1].active,false);
});
test('ten windows, rapid traversal restores only final stop',async()=>{
  const h=harness(10);await h.restart();await h.parkAll();assert.equal(Object.values(h.p.states).filter(s=>s.parked).length,10);
  for(const id of [1,2,3]){await h.focus(id);await h.advance(700);}
  await h.focus(4);await h.advance(1999);assert(h.p.states[4].parked);
  await h.advance(1);assert(!h.p.states[4].parked);
  for(const id of [1,2,3,5,6,7,8,9,10])assert(h.p.states[id].parked);
});
test('brief focus does not reset inactivity; sustained focus loss does',async()=>{
  const h=harness();await h.restart();const initial=h.p.states[2].lastUse;
  await h.advance(10000);await h.focus(2);await h.advance(500);await h.focus(1);
  assert.equal(h.p.states[2].lastUse,initial);
  await h.focus(2);await h.advance(2500);await h.advance(100000);await h.focus(-1);
  assert.equal(h.p.states[2].lastUse,h.clock.now());
});
test('one real tab and recreated parking tab',async()=>{
  const h=harness(1,1);h.local.settings={sleepingMode:'immediate'};await h.restart();await h.parkAll();assert.equal(h.windows[0].tabs.length,2);
  await h.focus(1);await h.advance(2000);assert.equal(h.windows[0].tabs[0].active,true);
  await h.parkAll();assert.equal(h.windows[0].tabs.length,2);assert(h.tab(100).discarded);
});
for(const sleepingMode of ['chrome','immediate']) for(const [name,patch] of Object.entries({audio:{audible:true},pinned:{pinned:true},internal:{url:'chrome://settings'},extension:{url:'chrome-extension://other/page.html'},nonDiscardable:{autoDiscardable:false},loading:{status:'loading'},splitView:{splitViewId:8}})){
  test(`${sleepingMode}: protected active ${name} leaves entire window alone`,async()=>{
    const h=harness();h.local.settings={sleepingMode};Object.assign(h.tab(200),patch);await h.restart();await h.advance(16*60000);await h.p.sweep();
    assert(!h.p.states[2].parked);assert.equal(h.calls.length,0);
  });
  test(`${sleepingMode}: protected background ${name} remains loaded`,async()=>{
    const h=harness();h.local.settings={sleepingMode};Object.assign(h.tab(201),patch);await h.restart();await h.advance(16*60000);await h.p.sweep();
    assert(h.p.states[2].parked);assert(!h.tab(201).discarded);assert.equal(!!h.tab(202).discarded,sleepingMode==='immediate');
  });
}
test('explicit pinned opt-in retains pin',async()=>{
  const h=harness();h.local.settings={sleepingMode:'immediate'};h.tab(200).pinned=true;await h.restart();await h.p.configure({...DEFAULTS,sleepingMode:'immediate',discardPinned:true});await h.advance(16*60000);await h.p.sweep();assert(h.tab(200).discarded);assert(h.tab(200).pinned);
});
test('domain and individual exclusions',async()=>{
  const h=harness();h.local.settings={sleepingMode:'immediate'};await h.restart();h.p.protectedIds=[201];h.p.settings.exclusions=['https://example.com/1/2'];await h.advance(16*60000);await h.p.sweep();assert(h.tab(200).discarded);assert(!h.tab(201).discarded);assert(!h.tab(202).discarded);
});
test('downloads pause globally; downloads API error fails closed',async()=>{
  const h=harness();await h.restart();await h.advance(16*60000);h.hooks.downloading=true;await h.p.sweep();assert.equal(h.calls.length,0);
  h.hooks.downloading=false;h.hooks.downloads=()=>{throw Error('unavailable');};await h.advance(60000);await h.p.sweep();assert.equal(h.calls.length,0);
});
test('download beginning mid-pass stops remaining discards',async()=>{
  const h=harness();h.local.settings={sleepingMode:'immediate'};await h.restart();h.hooks.discard=()=>{h.hooks.downloading=true;};await h.advance(16*60000);await h.p.sweep();assert.equal(h.calls.filter(c=>c[0]==='discard').length,1);
});
test('closing parking tab recovers and recreates later',async()=>{
  const h=harness();await h.restart();await h.parkAll();const id=h.p.states[2].parkingId;
  h.windows[1].tabs=h.windows[1].tabs.filter(t=>t.id!==id);h.tab(200).active=true;h.tab(200).discarded=false;
  await h.p.removed(id,{windowId:2});assert(!h.p.states[2].parked);await h.advance(16*60000);await h.p.sweep();assert(h.p.states[2].parked);assert.notEqual(h.p.states[2].parkingId,id);
});
test('closing previous tab restores fallback; a later empty parking shell closes',async()=>{
  const h=harness();await h.restart();await h.parkAll();h.windows[1].tabs=h.windows[1].tabs.filter(t=>t.id!==200);await h.p.removed(200,{windowId:2});await h.focus(2);await h.advance(2000);assert(h.tab(201).active);
  await h.focus(-1);await h.advance(16*60000);await h.p.sweep();h.windows[1].tabs=h.windows[1].tabs.filter(t=>h.p.token(t));await h.focus(2);await h.advance(2000);assert(!h.p.states[2]);assert(!h.windows.some(w=>w.id===2));
});
test('manual tab selection cancels restoration',async()=>{
  const h=harness();await h.restart();await h.parkAll();await h.focus(2);await h.advance(700);await h.api.tabs.update(202,{active:true});await h.p.activated(2,202);await h.advance(3000);assert(h.tab(202).active);assert(!h.p.states[2].parked);
});
test('closing window removes runtime and record',async()=>{
  const h=harness();await h.restart();await h.parkAll();const token=h.p.states[2].token;h.windows.splice(1,1);await h.p.closed(2);assert(!h.p.states[2]);assert(!h.p.records[token]);
});
test('service worker restart preserves parking and resets partial dwell',async()=>{
  const h=harness();await h.restart();await h.parkAll();await h.focus(2);await h.advance(1500);await h.restart();await h.advance(500);assert(h.p.states[2].parked);await h.advance(1500);assert(h.tab(200).active);
});
test('browser restart remaps IDs using parking token, never old numeric IDs',async()=>{
  const h=harness();await h.restart();await h.parkAll();
  for(const w of h.windows){w.id+=20;for(const t of w.tabs){t.windowId=w.id;t.id+=50000;}}
  await h.restart(true);assert.equal(h.calls.filter(c=>c[0]==='update').length,2);assert(h.p.states[22].parked);
  await h.focus(22);await h.advance(2000);assert(h.tab(50200).active);assert(h.p.states[21].parked);
});
test('extension reload and lost alarms rebuild without a reload storm',async()=>{
  const h=harness();await h.restart();await h.parkAll();h.alarms.clear();const before=h.calls.length;await h.restart(true);assert.equal(h.calls.length,before);assert(Object.values(h.p.states).every(s=>s.parked));
});
test('sleep-delayed dwell requires fresh full dwell after wake',async()=>{
  const h=harness();await h.restart();await h.parkAll();await h.focus(2);const d=h.p.dwell;h.jump(3600000);await h.p.finishDwell(d.epoch);assert(h.p.states[2].parked);await h.advance(2000);assert(h.tab(200).active);
});
test('focus gained during parking creation aborts activation/discards',async()=>{
  const h=harness();await h.restart();h.hooks.create=()=>{h.windows[1].focused=true;h.p.signalFocus(2);};await h.advance(16*60000);await h.p.sweep();assert.equal(h.calls.filter(c=>c[0]==='update'||c[0]==='discard').length,0);
});
test('focus lost during restore validation aborts restoration',async()=>{
  const h=harness();await h.restart();await h.parkAll();await h.focus(2);h.hooks.getWindow=()=>{h.p.signalFocus(-1);};await h.advance(2000);assert(h.p.states[2].parked);
});
test('active tab changed during parking preparation aborts operation',async()=>{
  const h=harness();await h.restart();h.hooks.create=()=>{h.tab(200).active=false;h.tab(201).active=true;h.p.signalTab(2);};await h.advance(16*60000);await h.p.sweep();assert.equal(h.calls.filter(c=>c[0]==='discard').length,0);assert(h.tab(201).active);
});
test('disabled state leaves parked windows asleep and cancels alarms',async()=>{
  const h=harness();await h.restart();await h.parkAll();await h.p.configure({...DEFAULTS,enabled:false});await h.focus(2);await h.advance(5000);assert(h.p.states[2].parked);assert(!h.alarms.has('parking'));assert(!h.alarms.has('dwell-recovery'));
  assert(await h.p.restore(2));assert(h.tab(200).active);
});
test('ignore incognito and popup windows',async()=>{
  const h=harness(3);h.windows[1].incognito=true;h.windows[2].type='popup';await h.restart();await h.parkAll();assert(!h.p.states[2]);assert(!h.p.states[3]);assert(!h.tab(200).discarded);assert(!h.tab(300).discarded);
});
test('permission, network and destructive API audit',()=>{
  const root=new URL('../',import.meta.url);const manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
  assert.equal(manifest.manifest_version,3);assert.deepEqual(manifest.permissions,['tabs','storage','alarms','downloads']);assert.equal(manifest.host_permissions,undefined);assert.equal(manifest.content_scripts,undefined);
  const code=readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>readFileSync(new URL(f,root),'utf8')).join('\n');
  assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(code));
  assert.equal((code.match(/this\.api\.tabs\.remove\(/g)||[]).length,2); // restoration and verified empty-shell cleanup
  assert(!/this\.api\.windows\.(update|create|remove)|this\.api\.tabs\.(move|group|ungroup)/.test(code));
});

test('actual worker listeners: self-created page events do not cancel parking; navigation cancels dwell',async()=>{
  const h=harness();h.local.settings={sleepingMode:'immediate'};
  const event=()=>{const listeners=[];return {addListener:fn=>listeners.push(fn),emit:(...args)=>listeners.map(fn=>fn(...args))};};
  for(const [namespace,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))
    for(const name of names)h.api[namespace][name]=event();
  const create=h.api.tabs.create, update=h.api.tabs.update;
  h.api.tabs.create=async props=>{const tab=await create(props);h.api.tabs.onCreated.emit(tab);h.api.tabs.onUpdated.emit(tab.id,{url:tab.url,status:'loading'},tab);return tab;};
  h.api.tabs.update=async(id,props)=>{const tab=await update(id,props);if(props.active)h.api.tabs.onActivated.emit({windowId:tab.windowId,tabId:id});return tab;};
  const original={chrome:globalThis.chrome,now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
  globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;globalThis.clearTimeout=h.clock.clearTimeout;
  const send=msg=>new Promise(resolve=>h.api.runtime.onMessage.emit(msg,{id:'test',url:h.api.runtime.getURL('options.html')},resolve));
  try{
    await import(`../background.js?test=${Math.random()}`);assert((await send({type:'settings'})).ok);
    h.jump(16*60000);h.api.alarms.onAlarm.emit({name:'parking'});await send({type:'settings'});await send({type:'settings'});
    assert(h.tab(200).discarded);assert(h.windows[1].tabs.at(-1).active);
    for(const w of h.windows)w.focused=w.id===2;h.api.windows.onFocusChanged.emit(2);await send({type:'settings'});
    const parked=h.windows[1].tabs.at(-1);parked.url='https://example.com/new-destination';
    h.api.tabs.onUpdated.emit(parked.id,{url:parked.url},copy(parked));await send({type:'settings'});
    assert.equal(h.session.runtimeState.states[2].parked,false);
    assert.equal(h.session.runtimeState.pendingDwell,null);
  }finally{globalThis.chrome=original.chrome;Date.now=original.now;globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;}
});

test('safety-setting change during preparation cancels the pending park',async()=>{
  const h=harness();await h.restart();h.hooks.create=()=>{h.p.safetyEpoch++;};await h.advance(16*60000);await h.p.sweep();assert(!h.tab(200).discarded);assert(h.tab(200).active);
});

test('Chrome refusal leaves the refused tab loaded and continues safe neighbors',async()=>{
  const h=harness();h.local.settings={sleepingMode:'immediate'};await h.restart();h.hooks.discard=tab=>{if(tab.id===200)throw Error('Cannot discard tab with id: 200');};await h.advance(16*60000);await h.p.sweep();assert(!h.tab(200).discarded);assert(h.tab(201).discarded);assert(h.tab(202).discarded);assert(h.p.states[2].parked);
});

test('unauthorized messages and malformed settings cannot mutate state',async()=>{
  const h=harness();await h.restart();await assert.rejects(()=>h.p.message({type:'configure',settings:{enabled:false}},{id:'other',url:'https://example.com'}));
  await assert.rejects(()=>h.p.message({type:'configure',settings:{enabled:false}},{id:'test',url:h.p.parkingURL,tab:{id:100}}));
  await assert.rejects(()=>h.p.configure({delayMinutes:NaN}));assert(h.p.settings.enabled);
});
