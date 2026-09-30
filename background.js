import {Parker} from './engine.js';

let queue = Promise.resolve();
const parker = new Parker(chrome, undefined, work => enqueue(work));
let ready;
function enqueue(work) {
  const next = queue.then(async () => {
    await (ready ||= parker.init().catch(error => { ready = null; throw error; }));
    return work();
  });
  // Keep the queue usable after a failure, while preserving the originating stack.
  // Return `next` so message callers still receive failure instead of false success.
  queue = next.catch(error => console.error('[Chrome Window Parker]', error));
  return next;
}
// Register synchronously, before initialization or any await.
chrome.windows.onFocusChanged.addListener(id => {
  const epoch = parker.signalFocus(id), at = Date.now();
  enqueue(() => parker.focusChanged(id, at, epoch));
});
chrome.windows.onRemoved.addListener(id => {
  parker.shellEpoch++; enqueue(() => parker.closed(id));
});
chrome.windows.onCreated.addListener(() => enqueue(() => parker.sweep()));
chrome.tabs.onActivated.addListener(({windowId, tabId}) => {
  parker.signalTab(windowId, tabId);
  enqueue(async () => {
    await parker.activated(windowId, tabId); await parker.cleanupEmptyParked(windowId);
    await parker.cleanupStray(windowId);
  });
});
chrome.tabs.onRemoved.addListener((id, info) => {
  const source = parker.detachedTabs.get(id); parker.detachedTabs.delete(id);
  parker.signalTab(info.windowId);
  enqueue(async () => {
    await parker.removed(id, info);
    if (source !== undefined && source !== info.windowId) await parker.cleanupEmptyParked(source);
  });
});
// A tab created during Clear (the window-preserving blank page) must not
// trigger parking/discard in an unrelated overdue window.
chrome.tabs.onCreated.addListener(tab => {
  parker.shellEpoch++; enqueue(() => parker.sweep(tab.windowId));
});
chrome.tabs.onAttached.addListener((id, info) => {
  const source = parker.detachedTabs.get(id); parker.detachedTabs.delete(id);
  parker.signalTab(info.newWindowId);
  enqueue(async () => {
    if (source !== undefined) await parker.cleanupEmptyParked(source);
    // A parking page moved into this window (by drag or the tab menu) is removed.
    await parker.cleanupStray(info.newWindowId);
    await parker.save(); await parker.sweep();
  });
});
chrome.tabs.onDetached.addListener((id, info) => {
  // Wait for attach (or removal) to settle a cross-window drag, without a timer.
  parker.detachedTabs.set(id, info.oldWindowId);
  parker.signalTab(info.oldWindowId);
  enqueue(async () => { await parker.save(); await parker.sweep(); });
});
chrome.tabs.onMoved.addListener((id, info) => {
  parker.shellEpoch++; enqueue(() => parker.cleanupEmptyParked(info.windowId));
});
chrome.tabs.onReplaced.addListener((addedId, removedId) => {
  const source = parker.detachedTabs.get(removedId);
  if (source !== undefined) { parker.detachedTabs.delete(removedId); parker.detachedTabs.set(addedId, source); }
  parker.shellEpoch++; enqueue(async () => { await parker.save(); await parker.sweep(); });
});
chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.url || change.status) parker.shellEpoch++;
  if (parker.token(tab) && (change.url || change.status === 'complete'))
    enqueue(async () => { await parker.cleanupEmptyParked(tab.windowId); await parker.cleanupStray(tab.windowId); });
  if (!parker.token(tab) && (change.url || change.status === 'loading')) parker.signalTab(tab.windowId);
  if (change.url && tab.active && !parker.token(tab)) {
    enqueue(() => parker.activated(tab.windowId, id));
    return;
  }
  if (change.url || change.audible !== undefined || change.pinned !== undefined || change.autoDiscardable !== undefined)
    enqueue(() => parker.schedule());
});
chrome.alarms.onAlarm.addListener(alarm => enqueue(() => {
  if (alarm.name === 'parking') return parker.sweep();
  if (alarm.name === 'dwell-recovery') return parker.startDwell();
  if (alarm.name === 'cleanup-retry') return parker.tidy();
}));
chrome.downloads.onCreated.addListener(() => {
  parker.safetyEpoch++; // Stop a batch even if its last download check just finished.
  enqueue(() => parker.schedule());
});
chrome.downloads.onChanged.addListener(delta => {
  if (delta.state?.current === 'in_progress') parker.safetyEpoch++;
  if (delta.state) enqueue(() => parker.schedule());
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  // A synced settings change this device uses cancels in-flight work, like a local one.
  if (parker.syncRelevant(changes)) parker.safetyEpoch++;
  enqueue(() => parker.syncChanged(changes));
});
chrome.runtime.onStartup.addListener(() => enqueue(() => parker.schedule()));
chrome.runtime.onInstalled.addListener(() => enqueue(() => parker.schedule()));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Cancel any in-flight parking before queued settings / protection changes.
  if (sender.id === chrome.runtime.id && ['configure', 'reset', 'protect', 'close-parked', 'sync-enable'].includes(msg?.type))
    parker.safetyEpoch++;
  // A Clear request arriving during initialization/cleanup takes priority before
  // its queued handler runs. Release the guard even when initialization fails.
  const clearing = sender.id === chrome.runtime.id && msg?.type === 'close-parked';
  if (clearing) parker.clearRequests++;
  enqueue(() => parker.message(msg, sender)).then(data => reply({ok: true, data}), error => reply({ok: false, error: error.message}))
    .finally(() => { if (clearing) parker.clearRequests--; });
  return true;
});
enqueue(() => {});
