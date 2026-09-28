export async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({type, ...payload});
  if (!response?.ok) throw new Error(response?.error || 'The extension is unavailable. Reload this page.');
  return response.data;
}
export function report(error, target = 'status') {
  const status = document.getElementById(typeof target === 'string' ? target : 'status');
  status.textContent = error.message || String(error); status.classList.add('error');
}

// Refresh only while a visible extension page exists, and only on relevant tab
// events. Burst coalescing is a page timer, not a persistent worker keepalive.
export function watchTabState(refresh, windowId = () => undefined) {
  let timer;
  const changed = id => {
    if (windowId() !== undefined && windowId() !== id) return;
    if (timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; refresh().catch(report); }, 100);
  };
  chrome.tabs.onUpdated.addListener((id, change, tab) => {
    if (change.discarded !== undefined || change.url) changed(tab.windowId);
  });
  chrome.tabs.onCreated.addListener(tab => changed(tab.windowId));
  chrome.tabs.onRemoved.addListener((id, info) => changed(info.windowId));
  chrome.tabs.onActivated.addListener(info => changed(info.windowId));
  chrome.tabs.onAttached.addListener((id, info) => changed(info.newWindowId));
  chrome.tabs.onDetached.addListener((id, info) => changed(info.oldWindowId));
}
