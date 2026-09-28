import {request, report, watchTabState} from './ui.js';
const $ = id => document.getElementById(id);
let data, current;
async function refresh() {
  data = await request('status'); current = data.currentTab;
  $('parkedCount').textContent = data.windows.filter(w => w.parked).length;
  $('sleepingCount').textContent = data.windows.reduce((n, w) => n + w.sleeping, 0);
  $('protect').disabled = !current;
  $('protect').textContent = current?.protected ? 'Remove this tab’s protection' : 'Protect this tab for this session';
  $('toggle').disabled = false; $('toggle').textContent = data.enabled ? 'Pause automatic parking' : 'Enable automatic parking';
  $('mode').textContent = data.enabled ? 'Automatic parking on' : 'Automatic parking paused';
}
$('protect').addEventListener('click', async () => {
  $('protect').disabled = true;
  try { await request('protect', {tabId: current.id, protected: !current.protected}); await refresh(); }
  catch (error) { $('protect').disabled = !current; report(error); }
});
$('toggle').addEventListener('click', async () => {
  $('toggle').disabled = true;
  try { const settings = await request('settings'); await request('configure', {settings: {...settings, enabled: !settings.enabled}}); await refresh(); }
  catch (error) { $('toggle').disabled = false; report(error); }
});
$('options').addEventListener('click', () => chrome.runtime.openOptionsPage().catch(report));
refresh().catch(report);
watchTabState(refresh);
