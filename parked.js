import {request, report, watchTabState} from './ui.js';
let ownWindow, gone = false, restoring = false;
let stopWatching = () => {};
// The saved page's icon, from Chrome's own local copy (the favicon permission).
// A page Chrome has no icon for gets Chrome's usual default icon.
const favicon = document.getElementById('favicon');
favicon.addEventListener('load', () => { favicon.hidden = false; });
favicon.addEventListener('error', () => { favicon.hidden = true; });
function showIcon(page) {
  if (!page || favicon.dataset.page === page) return;
  favicon.dataset.page = page;
  favicon.src = `/_favicon/?${new URLSearchParams({pageUrl: page, size: '64'})}`;
}
function finish() { gone = true; stopWatching(); window.removeEventListener?.('focus', refresh); }
const count = (n, word, space = ' ') => `${n}${space}${word}${n === 1 ? '' : 's'}`;
async function refresh() {
  if (gone || restoring) return;
  try {
    const info = await request('parked-info');
    if (gone) return;
    if (info.gone) { finish(); return; }
    ownWindow = info.windowId;
    document.title = info.title ? `Parked · ${info.title}` : 'Parked';
    document.getElementById('previous').textContent = info.title;
    showIcon(info.url);
    document.getElementById('detail').textContent = `${info.sleeping ? count(info.sleeping, 'sleeping tab') : 'No sleeping tabs'} in this window. ` +
      // Non-breaking spaces keep "Stay 2 seconds" on one line when the text wraps.
      (info.enabled ? `Stay\u00a0${count(info.dwellSeconds, 'second', '\u00a0')} and your tab comes back.` : 'Automatic return is paused.');
  } catch (error) { if (!gone) report(error); }
}
document.getElementById('restore').addEventListener('click', async () => {
  if (gone || restoring) return;
  restoring = true; stopWatching();
  const button = document.getElementById('restore'), status = document.getElementById('status');
  button.disabled = true; status.textContent = ''; status.classList.remove('error');
  try {
    const result = await request('restore');
    if (result.gone) finish();
    else if (!result.restored) status.textContent = 'Couldn’t restore your tab. Select a tab or open a new one.';
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
