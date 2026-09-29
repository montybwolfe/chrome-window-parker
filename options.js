import {bindSupport} from './support.js';
import {request, report} from './ui.js';
const $ = id => document.getElementById(id);
const flags = ['enabled', 'discardPinned', 'protectAudio', 'debug'];
let saving = false;
function sleepingHelp() {
  $('sleepingHelp').textContent = $('sleepingMode').value === 'immediate' ?
    'Unload eligible tabs as soon as their window is parked.' : 'Chrome decides when background tabs are unloaded.';
}
$('sleepingMode').addEventListener('change', sleepingHelp);
function fill(s) {
  for (const key of flags) $(key).checked = s[key];
  $('delayMinutes').value = s.delayMinutes; $('dwellSeconds').value = s.dwellSeconds;
  $('delayPreset').value = [5,10,15,30,60].includes(s.delayMinutes) ? String(s.delayMinutes) : 'custom';
  $('customLabel').hidden = $('delayPreset').value !== 'custom';
  $('exclusions').value = s.exclusions.join('\n');
  $('sleepingMode').value = s.sleepingMode; $('appearance').value = s.appearance; sleepingHelp();
}
function status(text) { $('status').classList.remove('error'); $('status').textContent = text; }
async function save(operation, success) {
  if (saving) return;
  saving = true; $('settingsFields').disabled = true; status('Saving…');
  try { fill(await operation()); status(success); }
  catch (error) { report(error); }
  finally { saving = false; $('settingsFields').disabled = false; }
}
$('delayPreset').addEventListener('change', () => {
  $('customLabel').hidden = $('delayPreset').value !== 'custom';
  if ($('delayPreset').value !== 'custom') $('delayMinutes').value = $('delayPreset').value;
});
$('settings').addEventListener('submit', event => {
  event.preventDefault();
  const settings = Object.fromEntries(flags.map(k => [k, $(k).checked]));
  settings.sleepingMode = $('sleepingMode').value; settings.appearance = $('appearance').value;
  settings.delayMinutes = Number($('delayMinutes').value);
  settings.dwellSeconds = Number($('dwellSeconds').value);
  settings.exclusions = $('exclusions').value.split('\n').map(s => s.trim()).filter(Boolean);
  save(() => request('configure', {settings}), 'Settings saved.');
});
$('reset').addEventListener('click', () => save(() => request('reset'), 'Defaults restored. Tab exclusions are unchanged.'));
async function refresh() {
  $('refresh').disabled = true;
  try {
    const data = await request('status', {includeTabs: true}); $('tabs').replaceChildren();
    for (const tab of data.tabs) {
      const label = document.createElement('label'); label.className = 'check-row tab-row';
      const box = document.createElement('input'); box.type = 'checkbox'; box.checked = data.protectedIds.includes(tab.id);
      const text = document.createElement('span'); text.textContent = tab.title;
      const windowLabel = document.createElement('span'); windowLabel.className = 'hint'; windowLabel.textContent = `Window ${tab.windowId}`;
      text.append(windowLabel);
      box.addEventListener('change', async () => {
        box.disabled = true;
        try { await request('protect', {tabId: tab.id, protected: box.checked}); $('tabStatus').classList.remove('error'); $('tabStatus').textContent = 'Tab protection updated.'; }
        catch (error) { box.checked = !box.checked; report(error, 'tabStatus'); }
        finally { box.disabled = false; }
      });
      label.append(box, text); $('tabs').append(label);
    }
    if (!data.tabs.length) $('tabs').textContent = 'No regular tabs are open.';
  } catch (error) { report(error, 'tabStatus'); }
  finally { $('refresh').disabled = false; }
}
$('refresh').addEventListener('click', refresh);
$('individual').addEventListener('toggle', () => { if ($('individual').open) refresh(); });
request('settings').then(s => { fill(s); $('settingsFields').disabled = false; }).catch(error => {
  $('loadError').hidden = false; report(error, 'loadError');
});

bindSupport(document.getElementById('support'), error => report(error, 'supportStatus'));
