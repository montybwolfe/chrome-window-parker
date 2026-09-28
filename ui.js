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
  let timer, stopped = false;
  const listeners = [];
  const changed = id => {
    if (stopped || (windowId() !== undefined && windowId() !== id) || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (!stopped) refresh().catch(error => { if (!stopped) report(error); });
    }, 100);
  };
  const listen = (name, fn) => { chrome.tabs[name].addListener(fn); listeners.push([name, fn]); };
  listen('onUpdated', (id, change, tab) => { if (change.discarded !== undefined || change.url) changed(tab.windowId); });
  listen('onCreated', tab => changed(tab.windowId));
  listen('onRemoved', (id, info) => changed(info.windowId));
  listen('onActivated', info => changed(info.windowId));
  listen('onAttached', (id, info) => changed(info.newWindowId));
  listen('onDetached', (id, info) => changed(info.oldWindowId));
  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    for (const [name, fn] of listeners) chrome.tabs[name].removeListener?.(fn);
    globalThis.window?.removeEventListener?.('pagehide', stop);
  };
  globalThis.window?.addEventListener('pagehide', stop, {once: true});
  return stop;
}
