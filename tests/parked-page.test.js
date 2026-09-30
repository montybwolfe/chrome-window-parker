import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {harness} from './helpers.js';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const flush = () => new Promise(resolve => setImmediate(resolve));

test('parking page title refreshes on reuse, renders site text safely and keeps restore action', async () => {
  const previous = {document: globalThis.document, window: globalThis.window, chrome: globalThis.chrome};
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {textContent:'', hidden:true, dataset:{}, classes:new Set(), addEventListener(type, fn) {this[type] = fn;},
      get classList() { const c = this.classes; return {add: x => c.add(x), remove: x => c.delete(x)}; }});
    return elements.get(id);
  };
  const focus = {};
  let title = 'Research & notes <script>sample</script>', url = '', sleeping = 3, dwellSeconds = 2, enabled = true, restored = true;
  const messages = [];
  globalThis.document = {title:'Parked', getElementById:element};
  globalThis.window = {addEventListener(type, fn) {const old=focus[type];focus[type]=(...args)=>{old?.(...args);return fn(...args);};}};
  globalThis.chrome = {
    tabs: Object.fromEntries(['onUpdated','onCreated','onRemoved','onActivated','onAttached','onDetached'].map(k=>[k,{addListener(){}}])),
    runtime: {async sendMessage(msg) {
      messages.push(msg.type);
      return {ok:true, data:msg.type === 'restore' ? {restored} : {windowId:2,title,url,sleeping,enabled,dwellSeconds}};
    }}
  };
  try {
    await import('../parked.js'); await flush();
    assert.equal(document.title, `Parked · ${title}`);
    assert.equal(element('previous').textContent, title);
    // What happens next, in plain words, with singular and plural done properly.
    const detail = () => element('detail').textContent;
    assert.equal(detail(), '3 sleeping tabs in this window. Stay\u00a02\u00a0seconds and your tab comes back.');
    sleeping = 1; dwellSeconds = 1; await focus.focus();
    assert.equal(detail(), '1 sleeping tab in this window. Stay\u00a01\u00a0second and your tab comes back.');
    sleeping = 0; dwellSeconds = 0.5; await focus.focus();
    assert.equal(detail(), 'No sleeping tabs in this window. Stay\u00a00.5\u00a0seconds and your tab comes back.');
    enabled = false; await focus.focus(); assert.equal(detail(), 'No sleeping tabs in this window. Automatic return is paused.');
    enabled = true;
    title = 'A different saved tab'; await focus.focus();
    assert.equal(document.title, 'Parked · A different saved tab');
    title = ''; await focus.focus(); assert.equal(document.title, 'Parked');
    // The saved page's icon comes only from Chrome's local favicon copy, by address; it shows once it loads.
    const icon = element('favicon'); assert.equal(icon.src, undefined, 'no address, no icon'); assert(icon.hidden);
    url = 'https://example.com/a?b=1&c="><img src=x>#top'; await focus.focus();
    assert.equal(icon.src, `/_favicon/?pageUrl=${encodeURIComponent(url).replace(/%20/g, '+')}&size=64`);
    assert(icon.hidden, 'hidden until it loads'); icon.load(); assert.equal(icon.hidden, false);
    const src = icon.src; icon.src = 'unchanged'; await focus.focus(); assert.equal(icon.src, 'unchanged', 'same page: not reloaded'); icon.src = src;
    icon.error(); assert(icon.hidden, 'an icon that cannot load is left out');
    // A restore that doesn't happen says so without guessing why, and the note clears on the next try.
    restored = false; await element('restore').click();
    assert.equal(element('status').textContent, 'Couldn’t restore your tab. Select a tab or open a new one.');
    restored = true; const retry = element('restore').click(); assert.equal(element('status').textContent, '', 'cleared as soon as you try again'); await retry;
    assert.equal(messages.at(-1),'restore');
    // Chrome may defer removing an inactive parking page. It must stay usable.
    assert.equal(element('restore').disabled,false);title='Retained page';await focus.focus();assert.equal(element('previous').textContent,title);
    focus.pagehide();const count=messages.length;await focus.focus();assert.equal(messages.length,count);
  } finally {Object.assign(globalThis, previous);}
});

test('saved title follows a recreated parking tab and survives worker restart without changing target', async () => {
  const h=harness(); await h.restart(); await h.parkAll();
  const parkingId=h.p.states[2].parkingId;
  let sender={id:'test',url:h.api.runtime.getURL('parked.html'),tab:{id:parkingId}};
  assert.equal((await h.p.message({type:'parked-info'},sender)).title,h.tab(200).title);
  await h.focus(2); await h.advance(2000);
  await h.api.tabs.update(201,{active:true}); await h.p.activated(2,201);
  h.tab(201).title='Second document'; await h.focus(-1); await h.advance(16*60000); await h.p.sweep();
  assert.notEqual(h.p.states[2].parkingId,parkingId);
  assert.equal(h.tab(parkingId),undefined);
  sender={...sender,tab:{id:h.p.states[2].parkingId}};
  await h.restart();
  assert.equal((await h.p.message({type:'parked-info'},sender)).title,'Second document');
  await h.focus(2); await h.advance(2000); assert(h.tab(201).active);
  assert(!h.calls.some(c=>c[0]==='update' && 'pinned' in c[2]));
});

test('parking page asks for the saved page address for its icon; the tab itself keeps the Window Parker icon', async () => {
  const h=harness(); await h.restart(); await h.parkAll();
  const parkingId=h.p.states[2].parkingId, sender={id:'test',url:h.api.runtime.getURL('parked.html'),tab:{id:parkingId}};
  const info=await h.p.message({type:'parked-info'},sender);
  assert.equal(info.url,h.tab(200).url);assert.equal(info.title,h.tab(200).title);
  delete h.p.records[h.p.token(h.tab(parkingId))];
  const fallback=await h.p.message({type:'parked-info'},sender);
  assert.equal(fallback.title,'Your previous tab');assert.equal(fallback.url,'');
  const html=read('parked.html');
  assert.match(html,/<link rel="icon" href="icons\/parker-timer-32.png">/,'the parking tab is Window Parker, not the site');
  assert.match(html,/<h1 class="previous-title"><img class="favicon" id="favicon" alt="" [^>]*hidden><span id="previous" dir="auto">/,'decorative icon; the title is the text, in its own direction');
});
