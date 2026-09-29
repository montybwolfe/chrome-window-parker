import {request, report, watchTabState} from './ui.js';
const $ = id => document.getElementById(id);
let data, current, busy = false, revision = 0;
function controls() {
  $('protect').disabled = busy || !current;
  $('toggle').disabled = busy || !data;
  $('closeParked').disabled = busy || !data?.parkingTabs;
}
async function refresh() {
  const ownRevision = ++revision, next = await request('status');
  if (ownRevision !== revision) return;
  data = next; current = data.currentTab;
  $('parkedCount').textContent = data.windows.filter(w => w.parked).length;
  $('sleepingCount').textContent = data.windows.reduce((n, w) => n + w.sleeping, 0);
  $('protect').textContent = current?.protected ? 'Unprotect this tab' : 'Protect this tab';
  $('toggle').textContent = data.enabled ? 'Pause automatic parking' : 'Resume automatic parking';
  $('mode').textContent = data.enabled ? 'Parking on' : 'Parking paused';
  controls();
}
async function act(operation) {
  if (busy) return;
  busy = true; controls(); $('status').textContent = ''; $('status').classList.remove('error');
  try { await operation(); }
  catch (error) { report(error); }
  finally {
    try { await refresh(); } catch (error) { report(error); }
    busy = false; controls();
  }
}
$('closeParked').addEventListener('click', () => act(async () => {
  const result = await request('close-parked');
  $('status').textContent = result.remaining ?
    `${result.closed} cleared; ${result.remaining} still open. Try again when Chrome is ready.` :
    result.closed ? `Cleared ${result.closed} parking ${result.closed === 1 ? 'tab' : 'tabs'}.` : 'No parked tabs to clear.';
  if (result.failed) $('status').classList.add('error');
}));
$('protect').addEventListener('click', () => act(async () => {
  if (current) await request('protect', {tabId: current.id, protected: !current.protected});
}));
$('toggle').addEventListener('click', () => act(async () => {
  const settings = await request('settings');
  await request('configure', {settings: {...settings, enabled: !settings.enabled}});
}));
$('options').addEventListener('click', () => chrome.runtime.openOptionsPage().catch(report));
refresh().catch(report);
watchTabState(refresh);
