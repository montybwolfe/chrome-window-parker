import {request, report, watchTabState} from './ui.js';
let ownWindow, gone = false, restoring = false;
let stopWatching = () => {};
function finish() { gone = true; stopWatching(); window.removeEventListener?.('focus', refresh); }
async function refresh() {
  if (gone || restoring) return;
  try {
    const info = await request('parked-info');
    if (gone) return;
    if (info.gone) { finish(); return; }
    ownWindow = info.windowId;
    document.title = info.title ? `Parked · ${info.title}` : 'Parked';
    document.getElementById('previous').textContent = info.title;
    document.getElementById('detail').textContent = `${info.sleeping} sleeping ${info.sleeping === 1 ? 'tab' : 'tabs'} in this window. ` +
      (info.enabled ? `Returns to your tab after ${info.dwellSeconds} seconds here.` : 'Automatic return is paused.');
  } catch (error) { if (!gone) report(error); }
}
document.getElementById('restore').addEventListener('click', async () => {
  if (gone || restoring) return;
  restoring = true; stopWatching();
  const button = document.getElementById('restore'); button.disabled = true;
  try {
    const result = await request('restore');
    if (result.gone) finish();
    else if (!result.restored) document.getElementById('status').textContent = 'No tab is available to restore. Select a tab or open a new one.';
  } catch (error) { if (!gone) report(error); }
  finally {
    restoring = false;
    if (!gone) { button.disabled = false; stopWatching = watchTabState(refresh, () => ownWindow); }
  }
});
window.addEventListener('focus', refresh);
window.addEventListener('pagehide', finish, {once: true});
stopWatching = watchTabState(refresh, () => ownWindow);
refresh();
