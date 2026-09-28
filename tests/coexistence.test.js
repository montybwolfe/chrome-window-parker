import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';
import {Parker} from '../engine.js';
import {DEFAULTS} from '../settings.js';

const sender = {id: 'test', url: 'chrome-extension://test/options.html'};

test('native timer receiver regression: old wrapper fails, real engine default works', async () => {
  const h = harness(), previous = {setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout};
  let scheduled = 0, cleared = 0;
  globalThis.setTimeout = function () { if (this !== globalThis) throw new TypeError('Illegal invocation'); scheduled++; return 42; };
  globalThis.clearTimeout = function () { if (this !== globalThis) throw new TypeError('Illegal invocation'); cleared++; };
  try {
    const legacyClock = {setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout};
    assert.throws(() => legacyClock.setTimeout(() => {}, 2), /Illegal invocation/);
    assert.throws(() => legacyClock.clearTimeout(42), /Illegal invocation/);
    const p = new Parker(h.api); await p.init();
    await p.message({type: 'configure', settings: {...DEFAULTS, delayMinutes: 30}}, sender);
    assert(scheduled >= 2); assert(cleared >= 1); assert.equal(h.local.settings.delayMinutes, 30);
  } finally { Object.assign(globalThis, previous); }
});

test('every Chrome API retains its owning namespace through init, save, reset, park and restore', async () => {
  const h = harness();
  for (const owner of [h.api.runtime, h.api.windows, h.api.tabs, h.api.storage.local, h.api.storage.session, h.api.alarms, h.api.downloads]) {
    for (const [key, method] of Object.entries(owner)) {
      if (typeof method !== 'function') continue;
      owner[key] = function (...args) { assert.equal(this, owner, `${key} receiver`); return method.apply(owner, args); };
    }
  }
  await h.restart();
  const edits = [{delayMinutes: 30}, {dwellSeconds: 3}, {discardPinned: true}, {protectAudio: false},
    {exclusions: ['mail.google.com', 'https://example.org/private/*']}, {sleepingMode: 'immediate'}, {appearance: 'dark'}, {debug: true}];
  let expected = {...DEFAULTS};
  for (const edit of edits) {
    expected = {...expected, ...edit};
    await h.p.message({type: 'configure', settings: expected}, sender);
    const originalDebug = console.debug; console.debug = () => {};
    try { await h.restart(); assert.deepEqual(await h.p.message({type:'settings'},sender), expected); }
    finally { console.debug = originalDebug; }
  }
  await h.p.message({type:'reset'},sender); await h.restart();
  assert.deepEqual(h.local.settings, DEFAULTS);
  await h.parkAll(); await h.focus(2); await h.advance(2000); assert(h.tab(200).active);
});

test('failed persistent settings write does not mutate the live settings', async () => {
  const h = harness(); await h.restart();
  h.api.storage.local.set = async () => { throw new Error('Storage failed'); };
  await assert.rejects(() => h.p.configure({...DEFAULTS, enabled:false}), /Storage failed/);
  assert(h.p.settings.enabled);
});

test('Chrome sleeping backgrounds never reload or receive redundant discard calls', async () => {
  const h = harness(2,5);h.local.settings={sleepingMode:'immediate'}; h.tab(201).discarded = true; h.tab(203).discarded = true;
  await h.restart(); await h.advance(16*60000); await h.p.sweep();
  assert.deepEqual(h.calls.filter(c=>c[0]==='discard').map(c=>c[1]), [200]);
  assert(h.tab(201).discarded); assert(h.tab(203).discarded);
  assert(!h.tab(202).discarded); // Chrome retains control of ordinary backgrounds.
  const parkingId=h.p.states[2].parkingId;
  await h.focus(2); await h.advance(2000);
  assert(h.tab(200).active); assert(!h.tab(200).discarded);
  assert(h.tab(201).discarded); assert(h.tab(203).discarded);
  assert.deepEqual(h.calls.filter(c=>c[0]==='update').map(c=>c[1]), [parkingId,200]);
});

test('already sleeping selected tab is left entirely untouched', async () => {
  const h = harness(); h.tab(200).discarded = true; await h.restart(); await h.advance(16*60000); await h.p.sweep();
  assert.equal(h.calls.length,0); assert(h.tab(200).discarded); assert(h.tab(200).active);
});

test('Chrome discards previous tab during parking activation: no second discard', async () => {
  const h = harness();h.local.settings={sleepingMode:'immediate'}; await h.restart(); h.hooks.update = () => { h.tab(200).discarded = true; };
  await h.advance(16*60000); await h.p.sweep();
  assert.equal(h.calls.filter(c=>c[0]==='discard').length,0); assert(h.tab(200).discarded);
});

test('Chrome wins final discard race: read authoritative state, no retries or errors', async () => {
  const h = harness();h.local.settings={sleepingMode:'immediate'}; await h.restart();
  h.hooks.discard = tab => { tab.discarded = true; throw new Error('Cannot discard tab with id: '+tab.id); };
  await h.advance(16*60000); await assert.doesNotReject(()=>h.p.sweep());
  assert(h.tab(200).discarded); assert.equal(h.calls.filter(c=>c[0]==='discard').length,1);
  assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
});

test('unexpected discard exceptions remain visible, with their original error', async () => {
  const h = harness();h.local.settings={sleepingMode:'immediate'}; await h.restart(); const error = new TypeError('Illegal invocation');
  h.hooks.discard = () => { throw error; }; await h.advance(16*60000);
  await assert.rejects(()=>h.p.sweep(), e=>e===error);
});

test('unknown getTab/getWindow failures are not misclassified as closed objects', async () => {
  const h = harness(); await h.restart();
  h.api.tabs.get = async () => { throw new TypeError('Illegal invocation'); };
  h.api.windows.get = async () => { throw new TypeError('Illegal invocation'); };
  await assert.rejects(()=>h.p.getTab(200), /Illegal invocation/);
  await assert.rejects(()=>h.p.getWindow(2), /Illegal invocation/);
});

test('rapid focus traversal does not reload/discard Chrome sleeping backgrounds', async () => {
  const h = harness(4); for (const w of h.windows) w.tabs[1].discarded=true;
  await h.restart(); await h.parkAll(); const discards=h.calls.filter(c=>c[0]==='discard').length;
  for (let round=0;round<3;round++) for(const id of [1,2,3]) {await h.focus(id);await h.advance(400);}
  assert(Object.values(h.p.states).every(s=>s.parked));
  await h.focus(4);await h.advance(2000);assert(!h.p.states[4].parked);
  assert.equal(h.calls.filter(c=>c[0]==='discard').length,discards);
  for(const w of h.windows)assert(w.tabs[1].discarded);
});

test('sleeping metrics are live state, exclude parking tabs and make no provenance claims', async () => {
  const h=harness();h.local.settings={sleepingMode:'immediate'}; await h.restart(); h.tab(101).discarded=true;
  let status=await h.p.message({type:'status'},sender);
  assert.equal(status.windows[0].sleeping,1); assert.equal(status.windows[0].parked,false);
  assert(!('tabs' in status));assert(!('discardedByParker' in status));
  h.tab(102).discarded=true;status=await h.p.message({type:'status'},sender);assert.equal(status.windows[0].sleeping,2);
  h.tab(101).discarded=false;status=await h.p.message({type:'status'},sender);assert.equal(status.windows[0].sleeping,1);
  await h.parkAll();await h.focus(2);await h.advance(2000);
  h.tab(h.p.states[1].parkingId).discarded=true;
  status=await h.p.message({type:'status'},sender);assert.equal(status.windows[1].sleeping,0);
  await h.restart();status=await h.p.message({type:'status'},sender);assert.equal(status.windows[0].sleeping,2);
});

test('closing sleeping tabs/windows removes them from the next status snapshot', async()=>{
  const h=harness();await h.restart();h.tab(201).discarded=true;
  h.windows[1].tabs=h.windows[1].tabs.filter(t=>t.id!==201);await h.p.removed(201,{windowId:2});
  let data=await h.p.message({type:'status'},sender);assert.equal(data.windows[1].sleeping,0);
  h.windows.splice(1,1);await h.p.closed(2);data=await h.p.message({type:'status'},sender);assert.equal(data.windows.length,1);
});

test('unrelated events cannot postpone an overdue parking alarm indefinitely', async()=>{
  const h=harness();await h.restart();await h.advance(16*60000);await h.p.schedule();
  const due=h.alarms.get('parking').when;
  for(let i=0;i<20;i++){h.jump(1000);await h.p.schedule();assert.equal(h.alarms.get('parking').when,due);}
});
