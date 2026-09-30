import {compareRules, simplifyRule} from './settings.js';
import {bindIssues, bindSupport} from './support.js';
import {request, report} from './ui.js';
const $ = id => document.getElementById(id);
const flags = ['enabled', 'discardPinned', 'protectAudio', 'debug'];
const themes = [...document.querySelectorAll('input[name=appearance]')];
const syncNames = {delayMinutes: 'Park windows after', dwellSeconds: 'Restore delay', sleepingMode: 'Tab sleeping',
  appearance: 'Theme', discardPinned: 'Pinned tabs', protectAudio: 'Audio tabs', exclusions: 'Sites to exclude'};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let saving = false, saved = null;
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
// Disabling a focused button drops keyboard focus to the page; put it back.
const refocus = element => { if (element && document.activeElement !== element) element.focus?.(); };
async function save(operation, success) {
  if (saving) return;
  const focused = document.activeElement;
  saving = true; locked(true); status('Saving…');
  try { fill(await operation()); status(success); }
  catch (error) { report(error); }
  finally { saving = false; locked(false); if (['save', 'reset'].includes(focused?.id)) refocus(focused); }
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
  // Only fields changed from what this page shows are saved, so a value that
  // changed meanwhile elsewhere is kept, and only real changes count as chosen here.
  save(() => request('configure', {settings, shown: saved}), 'Settings saved.');
});
$('reset').addEventListener('click', () => {
  if (asking) { closeChoice(); syncLocked(false); }
  save(async () => { const settings = await request('reset'); status('', 'syncStatus'); return settings; }, 'Defaults restored. Sync is now off on this computer; your other computers keep their settings.');
});
// Excluded sites. A pasted home-page address becomes the plain website (see
// simplifyRule), for whole lines only, so pasting into part of a line stays as is.
const sites = $('exclusions');
sites.addEventListener('paste', event => {
  const text = event.clipboardData?.getData('text/plain') || '', {value, selectionStart: start, selectionEnd: end} = sites;
  const next = value.indexOf('\n', end), lineStart = value.lastIndexOf('\n', start - 1) + 1;
  if (value.slice(lineStart, start).trim() || value.slice(end, next < 0 ? value.length : next).trim()) return;
  const cleaned = [...new Set(text.split(/\r?\n/).map(simplifyRule).filter(Boolean))].join('\n');
  if (!cleaned || cleaned === text) return;
  event.preventDefault();
  // insertText keeps Undo working; where it isn't available, insert directly.
  if (!document.execCommand?.('insertText', false, cleaned)) sites.setRangeText(cleaned, start, end, 'end');
});
// A tidying action only: it changes nothing else, saves nothing, and leaves a
// list that is already in order exactly as it is.
$('sortSites').addEventListener('click', () => {
  const lines = sites.value.split('\n').map(line => line.trim()).filter(Boolean), sorted = lines.toSorted(compareRules);
  if (!same(sorted, lines)) sites.value = sorted.join('\n');
});
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
  if (changes.syncPolicy?.newValue) renderSync(changes.syncPolicy.newValue);
});

// Sync choices apply right away and belong to this computer only. "Sync all
// settings" and each group box show and change the choices of the settings
// they cover. They are never stored themselves.
const syncBoxes = [...document.querySelectorAll('input[data-sync]')];
const groupBoxes = [...document.querySelectorAll('input[data-sync-group]')];
const groupNames = {all: 'All settings', parking: 'Parking settings', protection: 'Tab protection settings'};
const covers = box => box.dataset.sync ? [box.dataset.sync] : syncBoxes
  .filter(b => box.dataset.syncGroup === 'all' || b.dataset.group === box.dataset.syncGroup).map(b => b.dataset.sync);
let policy = {}, asking = null;
function describe(key, value) {
  if (key === 'delayMinutes') return value === 1 ? '1 minute' : value === 60 ? '1 hour' : `${value} minutes`;
  if (key === 'dwellSeconds') return value === 1 ? '1 second' : `${value} seconds`;
  if (key === 'sleepingMode') return value === 'immediate' ? 'Discard immediately' : 'Let Chrome decide';
  if (key === 'appearance') return {auto: 'Auto', light: 'Light', dark: 'Dark'}[value];
  if (key === 'exclusions') return value.length === 1 ? '1 site' : `${value.length} sites`;
  return value ? 'on' : 'off';
}
// "Park windows after", "Parking settings", or "Park windows after and Theme".
function named(keys) {
  const group = groupBoxes.find(box => same(covers(box).toSorted(), keys.toSorted()));
  if (keys.length > 1 && group) return groupNames[group.dataset.syncGroup];
  const names = keys.map(key => syncNames[key]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
}
function reason(key, code) {
  return {'too-large': `${syncNames[key]} is too long to sync, so it stays on this computer.`,
    'too-often': `${syncNames[key]} couldn’t sync because Chrome is limiting changes. Try again in a minute.`}[code] ||
    `${syncNames[key]} couldn’t sync because Chrome sync isn’t available right now. Try again later.`;
}
const reasons = failed => [...new Set(failed.map(({key, reason: code}) => reason(key, code)))].join(' ');
// A partly synced group shows a dash (indeterminate); clicking it syncs the rest.
function renderSync(next) {
  policy = next;
  if (asking) return; // Keep what the user just ticked until their choice is made.
  for (const box of [...syncBoxes, ...groupBoxes]) {
    const on = covers(box).filter(key => policy[key]).length;
    box.checked = on === covers(box).length; box.indeterminate = on > 0 && !box.checked;
  }
}
function syncLocked(value) { $('syncList').disabled = value || !saved; }
async function refreshSync() {
  const {policy: next, notice} = await request('sync-state');
  renderSync(next);
  if (notice?.length) { status(reasons(notice), 'syncStatus'); $('syncStatus').classList.add('error'); }
}
// Show new values in fields you haven't edited, and remember them as saved.
function refreshFields(settings) {
  for (const key of Object.keys(settings)) if (!same(settings[key], saved[key]) && same(formValue(key), saved[key])) show(key, settings[key]);
  saved = settings;
}
const syncs = (keys, verb) => `${named(keys)} now ${verb}${keys.length > 1 ? '' : 's'}`;
async function enableSync(keys, origin, choices = {}) {
  // Values before the request: Chrome may report the new ones to this page first.
  const before = saved;
  syncLocked(true); $('applySync').disabled = $('cancelSync').disabled = true;
  try {
    const result = await request('sync-enable', {keys, choices});
    if (result.status === 'conflict') { askChoice(result.conflicts, {keys, origin, choices}, !!asking); return; }
    if (result.status !== 'on') throw new Error(reason(keys[0], result.reason));
    closeChoice(); renderSync(result.policy); refreshFields(result.settings);
    // Name what was ticked ("All settings") when all of it now syncs.
    const on = keys.filter(key => result.policy[key]), used = on.filter(key => !same(result.settings[key], before[key]));
    const covered = covers(origin).every(key => result.policy[key]) ? covers(origin) : on;
    const kept = keys.filter(key => choices[key]?.use === 'off');
    status([covered.length ? `${syncs(covered, 'sync')}.` : '',
      used.length ? `Updated here from your synced settings: ${used.map(key => `${syncNames[key]} (${describe(key, result.settings[key])})`).join(', ')}.` : '',
      kept.length ? `${named(kept)} stay${kept.length > 1 ? '' : 's'} on this computer.` : '', reasons(result.failed)].filter(Boolean).join(' '), 'syncStatus');
    if (result.failed.length) $('syncStatus').classList.add('error');
  } catch (error) { closeChoice(); renderSync(policy); report(error, 'syncStatus'); }
  finally {
    $('cancelSync').disabled = false; readyToApply();
    // Locking the list can drop keyboard focus; return it to the box you used.
    if (!asking) { syncLocked(false); origin.focus(); }
  }
}
async function disableSync(keys, origin) {
  syncLocked(true);
  try {
    renderSync((await request('sync-disable', {keys})).policy);
    status(`${syncs(covers(origin), 'stay')} on this computer.`, 'syncStatus');
  } catch (error) { renderSync(policy); report(error, 'syncStatus'); }
  finally { syncLocked(false); origin.focus(); }
}
for (const box of [...groupBoxes, ...syncBoxes]) box.addEventListener('change', () => {
  const keys = covers(box).filter(key => box.checked ? !policy[key] : policy[key]);
  if (!keys.length) renderSync(policy);
  else if (box.checked) enableSync(keys, box);
  else disableSync(keys, box);
});
// Settings that differ from the synced ones and need a choice are asked about
// together, one choice each. Nothing changes until Apply; Cancel changes nothing.
function readyToApply() { $('applySync').disabled = !asking?.shown.every(key => asking.choices[key]); }
function askChoice(conflicts, pending, changed) {
  asking = {...pending, shown: conflicts.map(({key}) => key)};
  for (const {key} of conflicts) delete asking.choices[key];
  const single = conflicts.length === 1 && !changed;
  $('syncChoiceText').textContent = changed ? 'A setting changed while you were choosing. Please choose again.' : single ?
    `${syncNames[conflicts[0].key]} is different on this computer and in your synced settings. Which should your computers use?` :
    'Some settings are different on this computer and in your synced settings. Choose which to use for each one.';
  const radios = [];
  $('syncChoices').replaceChildren(...conflicts.map(({key, local, synced, unusable}) => {
    const set = document.createElement('fieldset'), legend = document.createElement('legend');
    set.className = 'sync-conflict'; legend.textContent = syncNames[key];
    if (single) legend.className = 'visually-hidden';
    set.append(legend);
    if (synced === null) {
      const note = document.createElement('p'); note.className = 'hint';
      note.textContent = 'The synced value can’t be used by this version of Chrome Window Parker.'; set.append(note);
    }
    const options = synced === null ? [['local', `Use this computer’s: ${describe(key, local)}`], ['off', 'Don’t sync this setting']] :
      [['synced', `Use synced: ${describe(key, synced)}`], ['local', `Use this computer’s: ${describe(key, local)}`]];
    for (const [use, text] of options) {
      const label = document.createElement('label'), radio = document.createElement('input'), span = document.createElement('span');
      label.className = 'check-row'; radio.type = 'radio'; radio.name = `sync-${key}`; radio.value = use; span.textContent = text;
      radio.addEventListener('change', () => { asking.choices[key] = {use, local, synced, ...(synced === null ? {unusable} : {})}; readyToApply(); });
      label.append(radio, span); set.append(label); radios.push(radio);
    }
    return set;
  }));
  $('applySync').textContent = conflicts.length > 1 ? 'Apply choices' : 'Apply';
  $('syncChoice').hidden = false; status('', 'syncStatus'); syncLocked(true); readyToApply();
  radios[0].focus();
}
function closeChoice() { asking = null; $('syncChoice').hidden = true; $('syncChoices').replaceChildren(); }
function cancelChoice() {
  const origin = asking?.origin; closeChoice(); renderSync(policy); syncLocked(false);
  status('Nothing changed.', 'syncStatus'); origin?.focus();
}
$('applySync').addEventListener('click', () => { if (asking) enableSync(asking.keys, asking.origin, asking.choices); });
$('cancelSync').addEventListener('click', cancelChoice);
$('syncChoice').addEventListener('keydown', event => { if (event.key === 'Escape' && asking) cancelChoice(); });

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
  const focused = document.activeElement === $('refresh');
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
  finally { $('refresh').disabled = false; scrollCue(); if (focused) refocus($('refresh')); }
}
$('refresh').addEventListener('click', refresh);
$('individual').addEventListener('toggle', () => { if ($('individual').open) refresh(); });
// These lists sit inside the form but apply immediately: Enter on one of their
// checkboxes or choices must not implicitly submit (save) the settings form.
// Enter still presses a button (Apply, Cancel).
for (const id of ['tabs', 'syncList', 'syncChoice']) $(id).addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target?.tagName !== 'BUTTON') event.preventDefault();
});
request('settings').then(async s => {
  fill(s); locked(false); syncLocked(false);
  try { await refreshSync(); } catch (error) { report(error, 'syncStatus'); }
}).catch(error => { $('loadError').hidden = false; report(error, 'loadError'); });

bindSupport(document.getElementById('support'), error => report(error, 'supportStatus'));
bindIssues($('reportBug'), error => report(error, 'supportStatus'));
