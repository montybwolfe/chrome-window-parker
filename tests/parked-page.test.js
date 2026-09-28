import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

test('parking page title refreshes on reuse, renders site text safely and keeps restore action', async () => {
  const previous = {document: globalThis.document, window: globalThis.window, chrome: globalThis.chrome};
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {textContent:'', addEventListener(type, fn) {this[type] = fn;}});
    return elements.get(id);
  };
  const focus = {};
  let title = 'Research & notes <script>sample</script>';
  const messages = [];
  globalThis.document = {title:'Parked', getElementById:element};
  globalThis.window = {addEventListener(type, fn) {focus[type] = fn;}};
  globalThis.chrome = {
    tabs: Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(k=>[k,{addListener(){}}])),
    runtime: {async sendMessage(msg) {
      messages.push(msg.type);
      return {ok:true, data:msg.type === 'restore' ? {restored:true} : {windowId:2,title,sleeping:3,enabled:true,dwellSeconds:2}};
    }}
  };
  try {
    await import('../parked.js'); await flush();
    assert.equal(document.title, `Parked · ${title}`);
    assert.equal(element('previous').textContent, title);
    title = 'A different saved tab'; await focus.focus();
    assert.equal(document.title, 'Parked · A different saved tab');
    title = ''; await focus.focus(); assert.equal(document.title, 'Parked');
    await element('restore').click(); assert.equal(messages.at(-1),'restore');
  } finally {Object.assign(globalThis, previous);}
});

test('saved title follows a reused parking tab and survives worker restart without changing target', async () => {
  const h=harness(); await h.restart(); await h.parkAll();
  const parkingId=h.p.states[2].parkingId;
  const sender={id:'test',url:h.api.runtime.getURL('parked.html'),tab:{id:parkingId}};
  assert.equal((await h.p.message({type:'parked-info'},sender)).title,h.tab(200).title);
  await h.focus(2); await h.advance(2000);
  await h.api.tabs.update(201,{active:true}); await h.p.activated(2,201);
  h.tab(201).title='Second document'; await h.focus(-1); await h.advance(16*60000); await h.p.sweep();
  assert.equal(h.p.states[2].parkingId,parkingId);
  await h.restart();
  assert.equal((await h.p.message({type:'parked-info'},sender)).title,'Second document');
  await h.focus(2); await h.advance(2000); assert(h.tab(201).active);
  assert(!h.calls.some(c=>c[0]==='update' && 'pinned' in c[2]));
});
