import test from 'node:test';
import assert from 'node:assert/strict';
import {harness, copy} from './helpers.js';

const REFUSED = 'Tabs cannot be edited right now (user may be dragging a tab).';

// Windows 1 and 2 are parked; window 3 is in use. Parking happened long ago, so
// the post-parking retry window has passed (the case that re-parked sources).
async function setup(count = 3, tabs = 3) {
  const h = harness(count, tabs); await h.restart(); await h.focus(count); await h.advance(2000);
  await h.advance(16 * 60000); await h.p.sweep(); h.jump(10 * 60000);
  assert(h.p.states[1].parked && h.p.states[2].parked && !h.p.states[count].parked);
  return h;
}
const pageOf = (h, id) => h.windows.find(w => w.id === id).tabs.find(t => t.url.includes('/parked.html#'));
const state = (h, id) => h.session.runtimeState.states[id];
const shape = tabs => tabs.map(t => ({id: t.id, url: t.url, pinned: t.pinned, groupId: t.groupId}));

// Move a tab the way Chrome does: the move completes, then events follow in
// Chrome's order (observed live: window created, detached, the source selects
// a neighbour, attached, the moved tab selected, focus), or a stress order.
const ORDERS = {
  chrome: ['created', 'detached', 'source', 'emptied', 'attached', 'selected', 'focused'],
  'late window event': ['detached', 'source', 'emptied', 'attached', 'selected', 'created', 'focused'],
  'focus first': ['focused', 'created', 'detached', 'emptied', 'attached', 'source', 'selected'],
  'no source selection event': ['created', 'detached', 'emptied', 'attached', 'selected', 'focused']
};
function move(h, id, to, {selected = true, focus = false, order = 'chrome'} = {}) {
  const t = h.tab(id), from = h.windows.find(w => w.id === t.windowId), oldPosition = t.index;
  from.tabs = from.tabs.filter(x => x.id !== id); from.tabs.forEach((x, i) => { x.index = i; });
  let next = null;
  if (t.active && from.tabs.length) { next = from.tabs[Math.min(oldPosition, from.tabs.length - 1)]; next.active = true; next.discarded = false; }
  const emptied = !from.tabs.length; if (emptied) h.windows.splice(h.windows.indexOf(from), 1);
  let dest = h.windows.find(w => w.id === to);
  const created = !dest;
  if (created) { dest = {id: to, type: 'normal', incognito: false, focused: false, state: 'normal', tabs: []}; h.windows.push(dest); }
  const active = selected || !dest.tabs.length;
  if (active) dest.tabs.forEach(x => { x.active = false; });
  Object.assign(t, {windowId: to, index: dest.tabs.length, active}); dest.tabs.push(t);
  if (focus) h.windows.forEach(w => { w.focused = w.id === to; });
  const events = {
    created: () => created && h.api.windows.onCreated.emit(copy(dest)),
    detached: () => h.api.tabs.onDetached.emit(id, {oldWindowId: from.id, oldPosition}),
    source: () => next && h.api.tabs.onActivated.emit({windowId: from.id, tabId: next.id}),
    emptied: () => emptied && h.api.windows.onRemoved.emit(from.id),
    attached: () => h.api.tabs.onAttached.emit(id, {newWindowId: to, newPosition: t.index}),
    selected: () => active && h.api.tabs.onActivated.emit({windowId: to, tabId: id}),
    focused: () => focus && h.api.windows.onFocusChanged.emit(to)
  };
  for (const name of ORDERS[order] || []) events[name](); // 'none': no events delivered
}

// Run the real background.js queue with Chrome-like events. Events emitted by
// `before` arrive while a cold worker is still initializing.
async function worker(h, run, before) {
  const old = {chrome: globalThis.chrome, now: Date.now, setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout, error: console.error};
  const errors = [];
  const event = () => { const listeners = []; return {addListener: f => listeners.push(f), emit: (...a) => listeners.forEach(f => f(...a))}; };
  for (const [ns, names] of Object.entries({windows: ['onFocusChanged', 'onRemoved', 'onCreated'],
    tabs: ['onActivated', 'onRemoved', 'onCreated', 'onAttached', 'onDetached', 'onMoved', 'onReplaced', 'onUpdated'],
    alarms: ['onAlarm'], downloads: ['onCreated', 'onChanged'], runtime: ['onStartup', 'onInstalled', 'onMessage']}))
    for (const name of names) h.api[ns][name] = event();
  const create = h.api.tabs.create, update = h.api.tabs.update, remove = h.api.tabs.remove;
  h.api.tabs.create = async props => { const t = await create(props); h.api.tabs.onCreated.emit(t); return t; };
  h.api.tabs.update = async (id, props) => { const t = await update(id, props); if (props.active) h.api.tabs.onActivated.emit({windowId: t.windowId, tabId: id}); return t; };
  h.api.tabs.remove = async id => {
    const windowId = h.tab(id)?.windowId, wasActive = h.tab(id)?.active; await remove(id);
    h.api.tabs.onRemoved.emit(id, {windowId, isWindowClosing: false});
    const w = h.windows.find(w => w.id === windowId);
    if (!w) h.api.windows.onRemoved.emit(windowId);
    else if (wasActive) h.api.tabs.onActivated.emit({windowId, tabId: w.tabs.find(t => t.active).id});
  };
  globalThis.chrome = h.api; Date.now = h.clock.now; globalThis.setTimeout = h.clock.setTimeout;
  globalThis.clearTimeout = h.clock.clearTimeout; console.error = (...args) => errors.push(args);
  const send = msg => new Promise(resolve => h.api.runtime.onMessage.emit(msg, {id: 'test', url: h.api.runtime.getURL('popup.html')}, resolve));
  const drain = async () => { for (let i = 0; i < 8; i++) assert((await send({type: 'settings'})).ok); };
  const retry = async () => { await h.advance(500); await drain(); };
  try {
    await import(`../background.js?moved=${Math.random()}`);
    before?.();
    await drain(); await run({send, drain, retry}); await drain(); assert.deepEqual(errors, []);
  } finally {
    globalThis.chrome = old.chrome; Date.now = old.now; globalThis.setTimeout = old.setTimeout;
    globalThis.clearTimeout = old.clearTimeout; console.error = old.error;
  }
}

for (const order of Object.keys(ORDERS))
test(`parking page dragged into its own new window: removed there, the window closes, and the source is not parked again (${order})`, async () => {
  const h = await setup(), page = pageOf(h, 1), token = h.p.states[1].token;
  const tabs = shape(h.windows[0].tabs.filter(t => t.id !== page.id));
  await worker(h, async ({drain}) => {
    const before = h.calls.length;
    move(h, page.id, 9, {focus: true, order}); await drain();
    assert(!h.windows.some(w => w.id === 9), 'the parking-only window closes naturally');
    assert.deepEqual(shape(h.windows[0].tabs), tabs, 'the source keeps its tabs, order, pins and groups');
    const calls = h.calls.slice(before);
    assert(!calls.some(c => c[0] === 'create'), 'no blank tab and no new parking page');
    assert(!calls.some(c => c[0] === 'update' || c[0] === 'discard'), 'nothing is selected, focused or discarded');
    assert.deepEqual(calls.filter(c => c[0] === 'remove').map(c => c[1]), [page.id], 'only our own page is removed');
    assert.equal(state(h, 1).parked, false); assert.equal(state(h, 1).parkingId, null); assert.equal(state(h, 1).token, null);
    assert(!h.local.parkingRecords[token]); assert(!(token in h.session.runtimeState.owners));
    // Moving the page counts as using the source: it parks again only after the full delay.
    h.api.alarms.onAlarm.emit({name: 'parking'}); await drain();
    assert(!pageOf(h, 1), 'not parked again straight away');
    await h.advance(16 * 60000); h.api.alarms.onAlarm.emit({name: 'parking'}); await drain();
    assert(pageOf(h, 1), 'parks normally once idle again');
  });
});

test('a held drag: Chrome refuses edits until the drop, then the leftover window closes within half a second', async () => {
  const h = await setup(); let dragging = true;
  h.hooks.remove = () => { if (dragging) throw Error(REFUSED); };
  const page = pageOf(h, 1);
  await worker(h, async ({drain, retry}) => {
    move(h, page.id, 9, {focus: true}); await drain();
    assert(h.windows.some(w => w.id === 9), 'nothing can be removed while the tab is held');
    assert(h.alarms.has('cleanup-retry'), 'an alarm covers a worker that stops mid-drag');
    for (let i = 0; i < 4; i++) { await retry(); assert(h.windows.some(w => w.id === 9)); }
    assert(!pageOf(h, 1), 'the source is not parked again while waiting');
    dragging = false; await retry();
    assert(!h.windows.some(w => w.id === 9)); assert(!h.alarms.has('cleanup-retry'));
    assert(!h.local.parkingRecords[h.p.states[1].token]);
  });
});

test('the retry alarm alone finishes the cleanup (the worker lost its timer)', async () => {
  const h = await setup(); let dragging = true;
  h.hooks.remove = () => { if (dragging) throw Error(REFUSED); };
  await worker(h, async ({drain}) => {
    move(h, pageOf(h, 1).id, 9, {focus: true}); await drain();
    dragging = false; h.api.alarms.onAlarm.emit({name: 'cleanup-retry'}); await drain();
    assert(!h.windows.some(w => w.id === 9));
  });
});

test('a worker that stops during the drag removes the page when it starts again', async () => {
  const h = await setup(), page = pageOf(h, 1), token = h.p.states[1].token;
  h.hooks.remove = () => { throw Error(REFUSED); };
  move(h, page.id, 9, {focus: true, order: 'none'}); // no events delivered
  await h.p.cleanupStray(9); assert(h.windows.some(w => w.id === 9)); await h.p.save();
  h.hooks.remove = undefined; await h.restart();
  assert(!h.windows.some(w => w.id === 9)); assert(!h.local.parkingRecords[token]);
  assert.equal(h.windows.find(w => w.id === 1).tabs.length, 3);
});

test('a cold worker woken by the move resolves ownership from saved state', async () => {
  const h = await setup(), page = pageOf(h, 1);
  await worker(h, async () => {
    assert(!h.windows.some(w => w.id === 9)); assert(!pageOf(h, 1));
  }, () => move(h, page.id, 9, {focus: true}));
});

test('after a browser restart, a leftover moved page is an empty parked window and is removed', async () => {
  const h = await setup(), page = pageOf(h, 1);
  move(h, page.id, 9, {focus: true, order: 'none'});
  await h.restart(true); // session storage is cleared: the page is claimed by its window, then cleaned
  assert(!h.windows.some(w => w.id === 9)); assert.equal(h.windows.find(w => w.id === 1).tabs.length, 3);
});

for (const selected of [false, true])
test(`parking page moved into an existing window (selected=${selected}): only that page is removed`, async () => {
  const h = await setup(), page = pageOf(h, 1), token = h.p.states[1].token, other = copy(h.windows[1]);
  const dest = copy(h.windows[2].tabs);
  await worker(h, async ({drain}) => {
    const before = h.calls.length;
    move(h, page.id, 3, {selected, focus: selected}); await drain();
    const now = h.windows.find(w => w.id === 3).tabs;
    assert.deepEqual(shape(now), shape(dest), 'destination tabs and order are untouched');
    if (!selected) assert.deepEqual(now.map(t => t.active), dest.map(t => t.active), 'and so is its selection');
    assert.equal(state(h, 3).parked, false, 'the destination is never treated as parked');
    assert.deepEqual(h.calls.slice(before).filter(c => c[0] !== 'sync').map(c => c.slice(0, 2)), [['remove', page.id]]);
    assert(!h.local.parkingRecords[token]); assert.equal(state(h, 1).parked, false);
    assert.deepEqual(h.windows[1], other, 'an unrelated parked window is untouched');
  });
});

test('a page dropped into another parked window is removed; that window keeps its own page and journal', async () => {
  const h = await setup(), page = pageOf(h, 1), own = pageOf(h, 2), ownToken = h.p.states[2].token;
  await worker(h, async ({drain}) => {
    move(h, page.id, 2, {selected: false}); await drain();
    assert(!h.tab(page.id)); assert(h.tab(own.id)); assert(h.local.parkingRecords[ownToken]);
    assert.equal(state(h, 2).parked, true); assert.equal(state(h, 2).parkingId, own.id);
    assert.deepEqual(h.windows.find(w => w.id === 2).tabs.filter(t => !t.url.includes('parked')).map(t => t.id), [200, 201, 202]);
  });
});

for (const selected of [true, false])
test(`a page dragged out and back into its own window is its own again (selected=${selected})`, async () => {
  const h = await setup(); let dragging = true;
  h.hooks.remove = () => { if (dragging) throw Error(REFUSED); };
  const page = pageOf(h, 1), token = h.p.states[1].token;
  await worker(h, async ({drain, retry}) => {
    move(h, page.id, 9, {focus: true}); await drain();
    move(h, page.id, 1, {selected, focus: true}); await drain();
    assert(!h.windows.some(w => w.id === 9));
    dragging = false; await retry();
    if (selected) {
      assert(h.tab(page.id), 'our page is kept in its own window');
      assert.equal(state(h, 1).parked, true); assert.equal(state(h, 1).token, token); assert(h.local.parkingRecords[token]);
    } else {
      assert(!h.tab(page.id), 'an unselected page beside a real tab is the usual stale page');
      assert.equal(state(h, 1).parked, false);
    }
  });
});

for (const variant of ['duplicate page', 'unknown token', 'other extension', 'navigating away', 'real tab'])
test(`moved-page cleanup is conservative: ${variant}`, async () => {
  const h = await setup(), page = pageOf(h, 1), token = h.p.states[1].token;
  await worker(h, async ({drain}) => {
    let moved = page.id;
    if (variant === 'duplicate page') moved = (await h.api.tabs.create({windowId: 1, active: false, url: page.url})).id;
    if (variant === 'unknown token') moved = (await h.api.tabs.create({windowId: 1, active: false, url: h.api.runtime.getURL('parked.html') + '#unknown-token'})).id;
    if (variant === 'other extension') moved = (await h.api.tabs.create({windowId: 1, active: false, url: 'chrome-extension://other/parked.html#' + token})).id;
    if (variant === 'real tab') moved = 101;
    await drain();
    if (variant === 'navigating away') h.tab(moved).pendingUrl = 'https://example.org/next';
    const before = h.calls.length;
    move(h, moved, 3, {selected: false}); await drain();
    const removed = h.calls.slice(before).filter(c => c[0] === 'remove').map(c => c[1]);
    if (variant === 'duplicate page') {
      assert.deepEqual(removed, [moved], 'only the copy that left is removed');
      assert(h.tab(page.id)); assert.equal(state(h, 1).parked, true); assert(h.local.parkingRecords[token], 'the shared journal stays');
    } else {
      assert.deepEqual(removed, [], 'no ownership proof, so nothing is removed');
      assert(h.tab(moved));
    }
  });
});

test('paused parking still removes a moved page', async () => {
  const h = await setup(); h.local.settings = {...h.local.settings, enabled: false};
  await worker(h, async ({drain}) => {
    move(h, pageOf(h, 1).id, 9, {focus: true}); await drain();
    assert(!h.windows.some(w => w.id === 9)); assert.equal(h.local.settings.enabled, false);
  });
});

test('Clear parked tabs still keeps windows: a leftover moved page becomes a blank tab, and nothing is discarded', async () => {
  const h = await setup(); let dragging = true;
  h.hooks.remove = id => { if (dragging && h.tab(id)?.windowId === 9) throw Error(REFUSED); };
  await worker(h, async ({send, drain}) => {
    move(h, pageOf(h, 1).id, 9, {focus: true}); await drain();
    dragging = false;
    const result = await send({type: 'close-parked'}); assert(result.ok);
    assert.equal(result.data.remaining, 0);
    const kept = h.windows.find(w => w.id === 9);
    assert.equal(kept.tabs.length, 1); assert.equal(kept.tabs[0].url, 'about:blank');
    assert(!h.calls.some(c => c[0] === 'discard'));
  });
});

test('a held drag of the last real tab out of a parked window: the parking-only window closes after the drop', async () => {
  const h = await setup(3, 1); let dragging = true;
  h.hooks.remove = () => { if (dragging) throw Error(REFUSED); };
  await worker(h, async ({drain, retry}) => {
    move(h, 100, 9, {focus: true}); await drain();
    assert(h.windows.some(w => w.id === 1), 'refused while held');
    dragging = false; await retry();
    assert(!h.windows.some(w => w.id === 1)); assert(h.tab(100)); assert.equal(h.tab(100).windowId, 9);
  });
});

test('a held drag of a real tab into a parked window: its parking page goes after the drop', async () => {
  const h = await setup(); let dragging = true;
  h.hooks.remove = () => { if (dragging) throw Error(REFUSED); };
  const page = pageOf(h, 1);
  await worker(h, async ({drain, retry}) => {
    move(h, 301, 1, {focus: true}); await drain();
    assert(h.tab(page.id), 'refused while held');
    dragging = false; await retry();
    assert(!h.tab(page.id)); assert(h.tab(301).active); assert.equal(state(h, 1).parked, false);
  });
});
