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
chrome.windows.onRemoved.addListener(id => enqueue(() => parker.closed(id)));
chrome.windows.onCreated.addListener(() => enqueue(() => parker.sweep()));
chrome.tabs.onActivated.addListener(({windowId, tabId}) => {
  parker.signalTab(windowId, tabId);
  enqueue(() => parker.activated(windowId, tabId));
});
chrome.tabs.onRemoved.addListener((id, info) => {
  parker.signalTab(info.windowId); enqueue(() => parker.removed(id, info));
});
// A tab created during Clear (the window-preserving blank page) must not
// trigger parking/discard in an unrelated overdue window.
chrome.tabs.onCreated.addListener(tab => enqueue(() => parker.sweep(tab.windowId)));
chrome.tabs.onAttached.addListener((id, info) => {
  parker.signalTab(info.newWindowId); enqueue(() => parker.sweep());
});
chrome.tabs.onDetached.addListener((id, info) => {
  parker.signalTab(info.oldWindowId); enqueue(() => parker.sweep());
});
chrome.tabs.onReplaced.addListener(() => enqueue(() => parker.sweep()));
chrome.tabs.onUpdated.addListener((id, change, tab) => {
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
}));
chrome.downloads.onCreated.addListener(() => {
  parker.safetyEpoch++; // Stop a batch even if its last download check just finished.
  enqueue(() => parker.schedule());
});
chrome.downloads.onChanged.addListener(delta => {
  if (delta.state?.current === 'in_progress') parker.safetyEpoch++;
  if (delta.state) enqueue(() => parker.schedule());
});
chrome.runtime.onStartup.addListener(() => enqueue(() => parker.schedule()));
chrome.runtime.onInstalled.addListener(() => enqueue(() => parker.schedule()));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Cancel any in-flight parking before queued settings / protection changes.
  if (sender.id === chrome.runtime.id && ['configure', 'reset', 'protect', 'close-parked'].includes(msg?.type))
    parker.safetyEpoch++;
  enqueue(() => parker.message(msg, sender)).then(data => reply({ok: true, data}), error => reply({ok: false, error: error.message}));
  return true;
});
enqueue(() => {});
