import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';

function event() { const listeners=[]; return {addListener: fn=>listeners.push(fn),emit: (...args)=>listeners.map(fn=>fn(...args))}; }

test('worker queue retries failed initialization, caches successful init and preserves original errors', async()=>{
  const h=harness();
  for(const [namespace,names] of Object.entries({windows:['onFocusChanged','onRemoved','onCreated'],tabs:['onActivated','onRemoved','onCreated','onAttached','onDetached','onReplaced','onUpdated'],alarms:['onAlarm'],downloads:['onCreated','onChanged'],runtime:['onStartup','onInstalled','onMessage']}))
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
