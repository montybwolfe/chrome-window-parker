import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';

// A terminated MV3 worker is woken by the focus event itself. background.js
// signals that event synchronously, while the new worker's queued init() is
// still waiting for persisted state. Model exactly that ordering.
async function coldWorker(h, run, {warm = false} = {}) {
  const old = {chrome:globalThis.chrome, now:Date.now, setTimeout:globalThis.setTimeout,
    clearTimeout:globalThis.clearTimeout, error:console.error};
  const errors = [];
  const event = () => { const listeners=[]; return {addListener:f=>listeners.push(f),emit:(...a)=>listeners.forEach(f=>f(...a))}; };
  for (const [ns,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],
    tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onMoved','onReplaced','onUpdated'],
    alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))
    for (const name of names) h.api[ns][name]=event();
  const update=h.api.tabs.update, create=h.api.tabs.create;
  h.api.tabs.create=async props=>{const t=await create(props);h.api.tabs.onCreated.emit(t);return t;};
  h.api.tabs.update=async(id,props)=>{const t=await update(id,props);if(props.active)h.api.tabs.onActivated.emit({windowId:t.windowId,tabId:id});return t;};
  let release;
  const gate=new Promise(resolve=>{release=resolve;}), get=h.api.storage.session.get;
  h.api.storage.session.get=async keys=>{await gate;return get(keys);};
  h.timers.clear(); // The previous worker and its dwell timer are gone.
  globalThis.chrome=h.api;Date.now=h.clock.now;globalThis.setTimeout=h.clock.setTimeout;
  globalThis.clearTimeout=h.clock.clearTimeout;console.error=(...args)=>errors.push(args);
  const send=msg=>new Promise(resolve=>h.api.runtime.onMessage.emit(msg,{id:'test',url:h.api.runtime.getURL('options.html')},resolve));
  const drain=async()=>{for(let i=0;i<6;i++)assert((await send({type:'settings'})).ok);};
  const focus=id=>{for(const w of h.windows)w.focused=w.id===id;h.api.windows.onFocusChanged.emit(id);};
  const alarm=async()=>{h.api.alarms.onAlarm.emit({name:'parking'});await drain();};
  const state=id=>h.session.runtimeState.states[id];
  const parked=id=>h.windows.find(w=>w.id===id).tabs.some(t=>t.active&&h.p.token(t));
  try {
    await import(`../background.js?cold=${Math.random()}`);
    if(warm){release();await drain();}
    await run({focus,release,drain,alarm,state,parked});
    release();await drain();assert.deepEqual(errors,[]);
  } finally {
    globalThis.chrome=old.chrome;Date.now=old.now;globalThis.setTimeout=old.setTimeout;
    globalThis.clearTimeout=old.clearTimeout;console.error=old.error;
  }
}

// Window 1 passes the dwell, then is used for 20 minutes without any extension
// event (reading or typing in one page), long enough for Chrome to stop the worker.
async function usedWindow(sleepingMode='chrome', count=2) {
  const h=harness(count,3);h.local.settings={sleepingMode};await h.restart();
  await h.advance(2000);assert(h.p.states[1].qualified);
  await h.advance(20*60000);return h;
}

for(const sleepingMode of ['chrome','immediate'])for(const [target,where] of [[2,'another Chrome window'],[-1,'another app']])
for(const warm of [false,true])
test(`${warm?'warm':'cold'} worker, ${sleepingMode}: leaving a used window for ${where} starts a full inactivity interval`,async()=>{
  const h=await usedWindow(sleepingMode);
  const discards=()=>h.calls.filter(c=>c[0]==='discard'&&c[1]<200).map(c=>c[1]);
  await coldWorker(h,async({focus,release,drain,alarm,state,parked})=>{
    const left=h.clock.now();focus(target);release();await drain();
    assert.equal(state(1).lastUse,left);assert.equal(state(1).qualified,false);
    await h.advance(35000);await alarm();
    assert(!parked(1),'a just-used window must not park at the next 30-second alarm');
    assert.deepEqual(discards(),[],'no discard may target the just-used window');
    await h.advance(15*60000);await alarm();
    assert(parked(1),'the normal delay still applies after the departure');
    assert.deepEqual(discards(),sleepingMode==='immediate'?[100,101,102]:[]);
  },{warm});
});

test('cold worker: brief pass-through windows still do not count as use',async()=>{
  const h=await usedWindow('chrome',4);
  await coldWorker(h,async({focus,release,drain,alarm,state,parked})=>{
    // Swipe 1 → 2 → 3 quickly, stopping on 3, before the worker has loaded.
    const left=h.clock.now();focus(2);await h.advance(400);focus(3);release();await drain();
    assert.equal(state(1).lastUse,left);
    const stale=h.clock.now()-20*60000-2000;
    assert(state(2).lastUse<=stale&&state(4).lastUse<=stale,'traversed and untouched windows keep their old activity');
    assert(!state(2).qualified);
    await h.advance(35000);await alarm();
    assert(parked(2)&&parked(4),'overdue windows, including one briefly crossed, still park');
    assert(!parked(1)&&!parked(3));
  });
});

test('cold worker: departure is recorded once at the first focus change, even when focus returns',async()=>{
  const h=await usedWindow();
  await coldWorker(h,async({focus,release,drain,state})=>{
    const left=h.clock.now();focus(2);await h.advance(500);focus(1);release();await drain();
    // Same result as a warm worker: leaving stamped the window and cleared its
    // qualification; returning requires a fresh full dwell before it counts again.
    assert.equal(state(1).lastUse,left);assert.equal(state(1).qualified,false);
    await h.advance(2000);await drain();assert.equal(state(1).qualified,true);
  });
});

test('cold worker never qualifies or restores a parked window early',async()=>{
  const h=harness(2,2);await h.restart();await h.advance(2000);
  await h.focus(-1);await h.advance(16*60000);await h.p.sweep();assert(h.p.states[2].parked);
  await h.focus(1);await h.advance(2000);assert(h.p.states[1].qualified);await h.advance(10*60000);
  const parking=h.p.states[2].parkingId;
  await coldWorker(h,async({focus,release,drain,state,parked})=>{
    // Brief return to the parked window, then away before the dwell completes.
    focus(2);release();await drain();
    assert(parked(2));assert.equal(state(2).qualified,false);
    await h.advance(1000);focus(-1);await drain();await h.advance(3000);await drain();
    assert(parked(2),'a brief visit does not restore');assert.equal(h.tab(parking).active,true);
    // A full dwell still restores normally.
    focus(2);await drain();await h.advance(1999);await drain();assert(parked(2));
    await h.advance(1);await drain();assert(!parked(2));assert(h.tab(200).active);
  });
});

test('cold worker with no focus change keeps the still-focused used window qualified',async()=>{
  const h=await usedWindow();
  await coldWorker(h,async({release,drain,state})=>{
    // Woken by an unrelated event while the user remains in window 1.
    release();await drain();assert.equal(state(1).qualified,true);
  });
});

// Chrome gives a tab a new ID when it unloads it (Memory Saver, or Discard
// immediately) and reports tabs.onReplaced. "cold": it happened while the worker
// was stopped and the event that wakes it arrives before state loads; "late": the
// same, but the event arrives after state loads (Chrome 154 does both);
// "starting": it happens while a starting worker loads state; "warm": running.
const replaceTab = (h, from, to) => { const t = h.tab(from); t.id = to; t.discarded = true; };
for (const when of ['cold', 'late', 'starting', 'warm'])
test(`${when} worker: protection follows a tab Chrome unloads and gives a new ID`, async () => {
  const h = harness(2, 3); await h.restart();
  h.p.protectedIds.push(101); await h.p.save();
  if (when === 'cold' || when === 'late') replaceTab(h, 101, 999);
  await coldWorker(h, async ({focus, release, drain, alarm, parked}) => {
    if (when === 'late') { release(); await drain(); }
    if (when === 'starting' || when === 'warm') replaceTab(h, 101, 999);
    h.api.tabs.onReplaced.emit(999, 101); release(); await drain();
    assert.deepEqual(h.session.runtimeState.protectedIds, [999]);
    // Selecting it later reloads it, and it still keeps its window awake.
    await h.api.tabs.update(999, {active: true}); await drain();
    focus(2); await drain(); await h.advance(16 * 60000); await alarm();
    assert(!parked(1), 'the protected tab still keeps its window awake');
  }, {warm: when === 'warm'});
});

for (const when of ['cold', 'warm'])
test(`${when} worker: the remembered tab follows its new ID beside another copy of its page`, async () => {
  const h = harness(2, 3), [first, , second] = h.windows[0].tabs;
  first.active = false; second.active = true; second.url = first.url; second.title = first.title;
  await h.restart(); await h.parkAll(); assert.equal(h.p.states[1].previousId, 102);
  // Chrome unloads the selected copy, then it is dragged to the front.
  const unloadAndMove = () => {
    replaceTab(h, 102, 997);
    const w = h.windows[0], moved = w.tabs.splice(w.tabs.findIndex(t => t.id === 997), 1)[0];
    w.tabs.unshift(moved); w.tabs.forEach((t, i) => { t.index = i; });
  };
  if (when === 'cold') unloadAndMove();
  await coldWorker(h, async ({focus, release, drain, parked}) => {
    if (when === 'warm') unloadAndMove();
    h.api.tabs.onReplaced.emit(997, 102); h.api.tabs.onMoved.emit(997, {windowId: 1, fromIndex: 2, toIndex: 0});
    release(); await drain();
    focus(1); await drain(); await h.advance(2000); await drain();
    assert(!parked(1)); assert(h.tab(997).active, 'the tab that was selected comes back, not the other copy');
  }, {warm: when === 'warm'});
});

// PRIVACY.md: a parked window's recovery record (its tab's address and title)
// is deleted when the window closes. People usually close parked windows long
// after parking, while the worker is stopped; the close events then wake it.
test('cold worker: closing a parked window deletes its recovery record', async () => {
  const h = harness(2, 3); await h.restart(); await h.parkAll();
  const closing = h.p.states[2].token, other = h.p.states[1].token;
  assert(h.local.parkingRecords[closing] && h.local.parkingRecords[other]);
  const gone = h.windows.splice(1, 1)[0]; // Chrome closed it while no worker ran
  await coldWorker(h, async ({release, drain}) => {
    for (const t of gone.tabs) h.api.tabs.onRemoved.emit(t.id, {windowId: 2, isWindowClosing: true});
    h.api.windows.onRemoved.emit(2); release(); await drain();
    assert(!h.local.parkingRecords[closing], 'the closed window\'s record is gone');
    assert(h.local.parkingRecords[other], 'the other window keeps its record');
    assert(!h.session.runtimeState.states[2]);
  });
});

test('after a browser restart, records for windows Chrome may still restore are kept', async () => {
  const h = harness(2, 3); await h.restart(); await h.parkAll();
  const token = h.p.states[2].token; h.windows.splice(1, 1); // not (yet) restored
  await h.restart(true); // a browser restart: no session state
  assert(h.local.parkingRecords[token], 'kept, in case Chrome restores the window later');
});

test('warm worker: a closing window still listed while its tabs close loses its record once it is gone', async () => {
  const h = harness(2, 3); await h.restart(); await h.parkAll();
  const closing = h.p.states[2].token, other = h.p.states[1].token;
  await coldWorker(h, async ({drain}) => {
    // Chrome reports each tab closing while the window still lists them...
    for (const t of h.windows[1].tabs) h.api.tabs.onRemoved.emit(t.id, {windowId: 2, isWindowClosing: true});
    await drain();
    // ...then the window is gone.
    h.windows.splice(1, 1); h.api.windows.onRemoved.emit(2); await drain();
    assert(!h.local.parkingRecords[closing], 'deleted when the window closes'); assert(h.local.parkingRecords[other]);
  }, {warm: true});
});
