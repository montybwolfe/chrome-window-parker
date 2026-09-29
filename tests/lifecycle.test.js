import test from 'node:test';
import assert from 'node:assert/strict';
import {harness, copy} from './helpers.js';

const parked = async (tabs = 3) => {
  const h=harness(1,tabs);h.local.settings={sleepingMode:'immediate'}; await h.restart(); await h.parkAll();
  return {h, id:h.p.states[1].parkingId, token:h.p.states[1].token};
};

test('dwell restores the real tab before removing only the parking page; next cycle recreates it', async()=>{
  const {h,id,token}=await parked(1);
  h.hooks.remove=removed=>{assert.equal(removed,id);assert(h.tab(100).active);assert(!h.tab(id).active);assert.equal(h.windows[0].tabs.length,2);};
  await h.focus(1);await h.advance(1999);assert(h.tab(id));await h.advance(1);
  assert(!h.tab(id));assert(h.tab(100).active);assert.equal(h.windows.length,1);assert.equal(h.windows[0].tabs.length,1);
  assert(!h.local.parkingRecords[token]);assert.equal(h.p.states[1].parkingId,null);
  const activation=h.calls.findIndex(c=>c[0]==='update'&&c[1]===100);
  assert(activation<h.calls.findIndex(c=>c[0]==='remove'));
  h.hooks.remove=undefined;await h.parkAll();const next=h.p.states[1].parkingId;
  assert.notEqual(next,id);assert.notEqual(h.p.states[1].token,token);assert.equal(h.windows[0].tabs.length,2);
  await h.focus(1);await h.advance(2000);assert(!h.tab(next));assert(h.tab(100).active);
});

test('cleanup preserves sleeping backgrounds, real order, pins, groups and window geometry',async()=>{
  const {h,id}=await parked(4);h.tab(101).discarded=true;h.tab(102).pinned=true;
  const before=copy(h.windows[0]);await h.focus(1);await h.advance(2000);
  assert(!h.tab(id));assert(h.tab(101).discarded);
  assert.deepEqual(h.windows[0].tabs.map(t=>[t.id,t.index,t.groupId,t.pinned]),before.tabs.filter(t=>t.id!==id).map(t=>[t.id,t.index,t.groupId,t.pinned]));
  for(const key of ['id','left','top','width','height','state'])assert.equal(h.windows[0][key],before[key]);
});

test('closed original tab uses a real fallback before removing the parking page',async()=>{
  const {h,id}=await parked();await h.api.tabs.remove(100);await h.p.removed(100,{windowId:1});
  await h.focus(1);await h.advance(2000);assert(h.tab(101).active);assert(!h.tab(id));assert.equal(h.windows.length,1);
});

test('natural final real-tab removal closes only the parking shell and its recovery state',async()=>{
  const {h,id,token}=await parked(1);const calls=h.calls.length;
  await h.api.tabs.remove(100);await h.p.removed(100,{windowId:1});
  assert.equal(h.windows.length,0);assert(!h.tab(id));assert(!h.p.states[1]);
  assert(!h.local.parkingRecords[token]);assert(!h.session.runtimeState.states[1]);
  assert(!h.calls.slice(calls).some(c=>c[0]==='create'||c[0]==='discard'));
});

test('manually closed parking page is harmless and a later cycle recreates it',async()=>{
  const {h,id}=await parked(1);await h.api.tabs.remove(id);await h.p.removed(id,{windowId:1});
  await h.focus(1);await h.advance(2000);assert(h.tab(100).active);assert.equal(h.windows.length,1);
  await h.parkAll();assert.notEqual(h.p.states[1].parkingId,id);
});

test('manual real-tab selection removes the parking page without restoring the old target',async()=>{
  const {h,id}=await parked();await h.focus(1);await h.advance(400);
  await h.api.tabs.update(102,{active:true});await h.p.activated(1,102);await h.advance(3000);
  assert(h.tab(102).active);assert(h.tab(100).discarded);assert(!h.tab(id));
});

test('activation that does not actually select a real tab cannot remove the parking page',async()=>{
  const {h,id}=await parked();h.api.tabs.update=async tabId=>copy(h.tab(tabId));
  await h.focus(1);await h.advance(2000);assert(h.tab(id).active);assert(!h.calls.some(c=>c[0]==='remove'));
});

test('target closing at activation is re-read and a fallback restored',async()=>{
  const {h,id}=await parked();const update=h.api.tabs.update;
  h.api.tabs.update=async(tabId,props)=>{if(tabId===100){h.windows[0].tabs=h.windows[0].tabs.filter(t=>t.id!==100);throw Error('No tab with id: 100');}return update(tabId,props);};
  await h.focus(1);await h.advance(2000);assert(h.tab(101).active);assert(!h.tab(id));
});

test('temporary removal refusal retains recovery data and retries on later activity',async()=>{
  const {h,id,token}=await parked();h.hooks.remove=()=>{throw Error('Tabs cannot be edited right now');};
  await h.focus(1);await h.advance(2000);assert(h.tab(100).active);assert(h.tab(id));assert(h.local.parkingRecords[token]);
  h.hooks.remove=undefined;await h.p.sweep();assert(!h.tab(id));assert(!h.local.parkingRecords[token]);
});

test('worker restart cleans an interrupted restoration with a real tab already active',async()=>{
  const {h,id,token}=await parked();await h.api.tabs.update(100,{active:true});await h.restart();
  assert(!h.tab(id));assert(h.tab(100).active);assert(!h.local.parkingRecords[token]);
});

for (const change of ['navigation','target closure','parking activation','detach','focus']) {
  test(`cleanup aborts when ${change} invalidates its final snapshot`,async()=>{
    const {h,id}=await parked(1);await h.api.tabs.update(100,{active:true});let reads=0;
    h.hooks.getWindow=()=>{
      if(++reads!==2)return;
      if(change==='navigation')h.tab(id).pendingUrl='https://example.org/real-work';
      if(change==='target closure'){h.windows[0].tabs=h.windows[0].tabs.filter(t=>t.id!==100);h.tab(id).active=true;}
      if(change==='parking activation'){h.tab(id).active=true;h.tab(100).active=false;}
      if(change==='detach')h.windows[0].tabs=h.windows[0].tabs.filter(t=>t.id!==id);
      if(change==='focus')h.p.signalFocus(-1);
      h.p.signalTab(1);
    };
    assert.equal(await h.p.cleanupParking(1),false);assert(!h.calls.some(c=>c[0]==='remove'));assert.equal(h.windows.length,1);
  });
}

test('unexpected remove errors remain visible rather than silently claiming cleanup succeeded',async()=>{
  const {h,id}=await parked();await h.api.tabs.update(100,{active:true});h.hooks.remove=()=>{throw new TypeError('Illegal invocation');};
  await assert.rejects(()=>h.p.cleanupParking(1),/Illegal invocation/);assert(h.tab(id));
});

test('real pages and unrelated extension pages are never cleanup candidates',async()=>{
  const {h,id}=await parked();h.tab(id).url='chrome-extension://another-extension/parked.html#browser-test';
  await h.api.tabs.update(100,{active:true});assert.equal(await h.p.cleanupParking(1),false);assert(h.tab(id));
});
