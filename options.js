import {bindIssues, bindSupport} from './support.js';
import {request, report} from './ui.js';
const $ = id => document.getElementById(id);
const flags = ['enabled', 'discardPinned', 'protectAudio', 'debug'];
const themes = [...document.querySelectorAll('input[name=appearance]')];
const syncBoxes = [...document.querySelectorAll('input[data-sync]')];
const syncNames = {delayMinutes: 'Park windows after', dwellSeconds: 'Restore delay', sleepingMode: 'Tab sleeping',
  appearance: 'Theme', discardPinned: 'Pinned tabs', protectAudio: 'Audio tabs', exclusions: 'Sites to exclude'};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let saving = false, saved = null, conflict = null;
// Settings unlock together. Individual-tab protection applies immediately and
// stays usable even if settings cannot be loaded.
function locked(value) { for (const group of document.querySelectorAll('.settings-fields')) group.disabled = value; }
function sleepingHelp() {
  $('sleepingHelp').textContent = $('sleepingMode').value === 'immediate' ?
    'Unload eligible tabs as soon as their window is parked.' : 'Chrome decides when background tabs are unloaded.';
}
$('sleepingMode').addEventListener('change', sleepingHelp);
// One field at a time, so a change from another page or computer only updates
// fields you haven't edited.
function formValue(key) {
  if (flags.includes(key)) return $(key).checked;
  if (key === 'delayMinutes' || key === 'dwellSeconds') return Number($(key).value);
  if (key === 'exclusions') return $('exclusions').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (key === 'appearance') return themes.find(input => input.checked)?.value;
  return $(key).value;
}
function show(key, value) {
  if (flags.includes(key)) $(key).checked = value;
  else if (key === 'delayMinutes') {
    $('delayMinutes').value = value;
    $('delayPreset').value = [5,10,15,30,60].includes(value) ? String(value) : 'custom';
    $('customLabel').hidden = $('delayPreset').value !== 'custom';
  } else if (key === 'exclusions') $('exclusions').value = value.join('\n');
  else if (key === 'appearance') for (const input of themes) input.checked = input.value === value;
  else { $(key).value = value; if (key === 'sleepingMode') sleepingHelp(); }
}
function fill(s) { for (const key of Object.keys(s)) show(key, s[key]); saved = s; }
function status(text, target = 'status') { $(target).classList.remove('error'); $(target).textContent = text; }
async function save(operation, success) {
  if (saving) return;
  saving = true; locked(true); status('Saving…');
  try { fill(await operation()); status(success); }
  catch (error) { report(error); }
  finally { saving = false; locked(false); }
  // A save can switch sync off for a setting Chrome refused; say so, separately.
  await refreshSync().catch(error => report(error, 'syncStatus'));
}
$('delayPreset').addEventListener('change', () => {
  $('customLabel').hidden = $('delayPreset').value !== 'custom';
  if ($('delayPreset').value !== 'custom') $('delayMinutes').value = $('delayPreset').value;
});
$('settings').addEventListener('submit', event => {
  event.preventDefault();
  // The theme control saves itself; everything else here is saved together.
  const settings = Object.fromEntries(Object.keys(saved).map(key => [key, key === 'appearance' ? saved.appearance : formValue(key)]));
  save(() => request('configure', {settings}), 'Settings saved.');
});
$('reset').addEventListener('click', () => save(() => request('reset'), 'Defaults restored. Sync is now off on this computer.'));
for (const input of themes) input.addEventListener('change', async () => {
  if (!input.checked || !saved) return;
  try { saved = {...saved, appearance: (await request('appearance', {appearance: input.value})).appearance}; }
  catch (error) { show('appearance', saved.appearance); report(error); }
});
// Another Settings page, the popup or a synced computer changed something.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !saved) return;
  const next = changes.settings?.newValue;
  if (next) {
    for (const key of Object.keys(next))
      if (!same(next[key], saved[key]) && same(formValue(key), saved[key])) show(key, next[key]);
    saved = next;
  }
  if (changes.syncPolicy?.newValue && !conflict) renderSync(changes.syncPolicy.newValue);
});

// Sync choices apply right away and belong to this computer only.
function describe(key, value) {
  if (value === null) return 'a value this version can’t use';
  if (key === 'delayMinutes') return value === 1 ? '1 minute' : value === 60 ? '1 hour' : `${value} minutes`;
  if (key === 'dwellSeconds') return value === 1 ? '1 second' : `${value} seconds`;
  if (key === 'sleepingMode') return value === 'immediate' ? 'Discard immediately' : 'Let Chrome decide';
  if (key === 'appearance') return {auto: 'Auto', light: 'Light', dark: 'Dark'}[value];
  if (key === 'exclusions') return value.length === 1 ? '1 site' : `${value.length} sites`;
  return value ? 'on' : 'off';
}
function reason(key, code) {
  const name = syncNames[key];
  return {'too-large': `${name} is too long to sync, so it stays on this computer.`,
    'too-often': 'Chrome is limiting sync changes right now. Try again in a minute.',
    unusable: `The synced ${name} setting can’t be used by this version.`,
    changed: `The synced ${name} setting just changed. Try again.`}[code] ||
    'Chrome sync storage isn’t available right now. Try again later.';
}
function renderSync(policy) { for (const box of syncBoxes) box.checked = policy[box.dataset.sync] === true; }
function syncLocked(value) { $('syncList').disabled = value || !saved; }
async function refreshSync() {
  const {policy, notice} = await request('sync-state');
  if (!conflict) renderSync(policy);
  if (notice) { status(notice.keys.map(key => reason(key, notice.reason)).join(' '), 'syncStatus'); $('syncStatus').classList.add('error'); }
}
function closeConflict() { conflict = null; $('syncChoice').hidden = true; syncLocked(false); }
function askConflict(result) {
  conflict = result; const name = syncNames[result.key];
  $('syncChoiceText').textContent = result.synced === null ?
    `The synced ${name} setting can’t be used by this version. Share this computer’s value instead?` :
    `${name} is ${describe(result.key, result.local)} here and ${describe(result.key, result.synced)} in sync. Which should all your computers use?`;
  $('useSynced').hidden = result.synced === null;
  $('useSynced').textContent = `Use synced: ${describe(result.key, result.synced)}`;
  $('useLocal').textContent = `Use this computer’s: ${describe(result.key, result.local)}`;
  $('syncChoice').hidden = false; status('', 'syncStatus');
  (result.synced === null ? $('useLocal') : $('useSynced')).focus();
}
function finish(key, result) {
  if (result.status === 'error') throw new Error(reason(key, result.reason));
  renderSync(result.policy);
  for (const k of Object.keys(result.settings)) if (!same(result.settings[k], saved[k]) && same(formValue(k), saved[k])) show(k, result.settings[k]);
  saved = result.settings;
  status(result.status === 'on' ? `${syncNames[key]} now syncs.` : `${syncNames[key]} now stays on this computer.`, 'syncStatus');
}
for (const box of syncBoxes) box.addEventListener('change', async () => {
  const key = box.dataset.sync;
  syncLocked(true);
  try {
    const result = await request(box.checked ? 'sync-enable' : 'sync-disable', {key});
    if (result.status === 'conflict') { askConflict(result); return; }
    finish(key, result);
  } catch (error) { box.checked = !box.checked; report(error, 'syncStatus'); }
  finally { if (!conflict) syncLocked(false); }
});
async function resolve(use) {
  const {key} = conflict, box = syncBoxes.find(b => b.dataset.sync === key);
  for (const id of ['useSynced', 'useLocal', 'cancelSync']) $(id).disabled = true;
  try { const result = await request('sync-resolve', {key, use}); closeConflict(); finish(key, result); }
  catch (error) { closeConflict(); box.checked = false; report(error, 'syncStatus'); }
  finally { for (const id of ['useSynced', 'useLocal', 'cancelSync']) $(id).disabled = false; box.focus(); }
}
$('useSynced').addEventListener('click', () => resolve('synced'));
$('useLocal').addEventListener('click', () => resolve('local'));
$('cancelSync').addEventListener('click', () => {
  const box = syncBoxes.find(b => b.dataset.sync === conflict.key);
  box.checked = false; closeConflict(); status('Nothing changed.', 'syncStatus'); box.focus();
});

// The tab list scrolls inside its panel, but macOS hides scrollbars until you
// scroll. Fade the edges, and offer a chevron, only while there is more to see.
const tabList = $('tabs'), tabScroll = $('tabScroll');
function scrollCue() {
  const below = tabList.scrollHeight - tabList.clientHeight - tabList.scrollTop > 1;
  tabScroll.classList.toggle('more-above', tabList.scrollTop > 1);
  tabScroll.classList.toggle('more-below', below);
  $('moreTabs').hidden = !below;
  // Keep the fades clear of a scrollbar that takes up space (Windows, Linux).
  tabScroll.style.setProperty('--scrollbar', `${Math.max(0, tabList.offsetWidth - tabList.clientWidth - 2)}px`);
}
tabList.addEventListener('scroll', scrollCue, {passive: true});
new ResizeObserver(scrollCue).observe(tabList);
$('moreTabs').addEventListener('click', () => tabList.scrollBy({top: tabList.clientHeight * 0.8,
  behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}));
async function refresh() {
  $('refresh').disabled = true;
  try {
    const data = await request('status', {includeTabs: true}); $('tabs').replaceChildren();
    // Chrome's window IDs are long internal numbers; number windows in order instead.
    const windows = [...new Set(data.tabs.map(tab => tab.windowId))];
    for (const tab of data.tabs) {
      const label = document.createElement('label'); label.className = 'check-row tab-row';
      const box = document.createElement('input'); box.type = 'checkbox'; box.checked = data.protectedIds.includes(tab.id);
      const text = document.createElement('span'); text.className = 'tab-text';
      const title = document.createElement('span'); title.className = 'tab-title'; title.textContent = tab.title;
      const windowLabel = document.createElement('span'); windowLabel.className = 'hint'; windowLabel.textContent = `Window ${windows.indexOf(tab.windowId) + 1}`;
      text.append(title, windowLabel); label.title = tab.title;
      box.addEventListener('change', async () => {
        box.disabled = true;
        try { await request('protect', {tabId: tab.id, protected: box.checked}); status('Tab protection updated.', 'tabStatus'); }
        catch (error) { box.checked = !box.checked; report(error, 'tabStatus'); }
        finally { box.disabled = false; }
      });
      label.append(box, text); $('tabs').append(label);
    }
    if (!data.tabs.length) $('tabs').textContent = 'No regular tabs are open.';
  } catch (error) { report(error, 'tabStatus'); }
  finally { $('refresh').disabled = false; scrollCue(); }
}
$('refresh').addEventListener('click', refresh);
$('individual').addEventListener('toggle', () => { if ($('individual').open) refresh(); });
// These lists sit inside the form but apply immediately: Enter on one of their
// checkboxes must not implicitly submit (save) the settings form.
for (const id of ['tabs', 'syncList']) $(id).addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
request('settings').then(async s => {
  fill(s); locked(false); syncLocked(false);
  try { await refreshSync(); } catch (error) { report(error, 'syncStatus'); }
}).catch(error => { $('loadError').hidden = false; report(error, 'loadError'); });

bindSupport(document.getElementById('support'), error => report(error, 'supportStatus'));
bindIssues($('reportBug'), error => report(error, 'supportStatus'));
