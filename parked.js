import {request, report, watchTabState} from './ui.js';
let ownWindow;
async function refresh() {
  try {
    const info = await request('parked-info');
    ownWindow = info.windowId;
    document.title = info.title ? `Parked · ${info.title}` : 'Parked';
    document.getElementById('previous').textContent = info.title;
    document.getElementById('detail').textContent = `${info.sleeping} sleeping ${info.sleeping === 1 ? 'tab' : 'tabs'} in this window. ` +
      (info.enabled ? `Restores after ${info.dwellSeconds} seconds of focus.` : 'Automatic restoration is paused.');
  } catch (error) { report(error); }
}
document.getElementById('restore').addEventListener('click', async () => {
  try {
    const {restored} = await request('restore');
    if (!restored) document.getElementById('status').textContent = 'No tab is available to restore. Select a tab or open a new one.';
  } catch (error) { report(error); }
});
window.addEventListener('focus', refresh);
refresh();
watchTabState(refresh, () => ownWindow);
