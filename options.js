import {cleanUpRules, simplifyRule, validateSettings} from './settings.js';
import {bindIssues, bindSupport} from './support.js';
import {request, report} from './ui.js';
const $ = id => document.getElementById(id);
// The installed version, from the manifest, so it can never go stale.
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
const flags = ['enabled', 'discardPinned', 'protectAudio', 'debug'];
const themes = [...document.querySelectorAll('input[name=appearance]')];
const syncNames = {delayMinutes: 'Park windows after', dwellSeconds: 'Restore delay', sleepingMode: 'Tab sleeping',
  appearance: 'Theme', discardPinned: 'Pinned tabs', protectAudio: 'Audio tabs', exclusions: 'Sites to exclude'};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let saved = null, resetting = false, fade;
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
function status(text, target = 'status') {
  if (target === 'status') clearTimeout(fade);
  $(target).classList.remove('error'); $(target).textContent = text;
}
function problem(text, target) { status(text, target); $(target).classList.add('error'); }
// Disabling a focused button drops keyboard focus to the page; put it back.
const refocus = element => { if (element && document.activeElement !== element) element.focus?.(); };

// Settings save themselves, one at a time, so what the page shows is what's in
// use. Only what changed is sent, so a value changed meanwhile on another page
// or computer is kept (see configure). Boxes and menus save straight away. A
// number saves when you press Enter or leave it, a moment later, because the
// arrow keys change it a step at a time. The site list saves when you leave it.
// Nothing invalid or half-typed is saved.
const numbers = ['delayMinutes', 'dwellSeconds'];
// Each part of the page says what went wrong next to it.
const line = key => ['enabled', 'sleepingMode', ...numbers].includes(key) ? 'parkingStatus' : key === 'exclusions' ? 'sitesStatus' : 'status';
const limits = {delayMinutes: 'The parking delay must be between 1 minute and 7 days, in steps of half a minute, so it wasn’t changed.',
  dwellSeconds: 'The restore delay must be between 0.5 and 20 seconds, in steps of half a second, so it wasn’t changed.'};
const pending = new Map();
let sending = false, flying = {}, wait = null;
// The settings as stored. Chrome's change notices and replies can arrive in
// any order, but reads are answered in order, so the page never steps back to
// an older copy by reading after each one.
const stored = async () => (await chrome.storage.local.get('settings')).settings;
// Chrome's own messages can lack a full stop.
const sentence = text => /[.!?]$/.test(text) ? text : `${text}.`;
// Show the value in use again. A number box that's showing keeps showing, so it keeps the focus.
function putBack(key) {
  if (key === 'dwellSeconds' || (key === 'delayMinutes' && !$('customLabel').hidden)) $(key).value = saved[key];
  else show(key, saved[key]);
}
// Check a change and queue it. Returns false if it can't be saved, and says why.
function queue(key) {
  if (!saved || resetting) return false;
  status('', line(key));
  if (numbers.includes(key) && !$(key).validity.valid) { pending.delete(key); putBack(key); problem(limits[key], line(key)); return false; }
  if (key === 'exclusions') {
    // A list that can't be used stays as you typed it, to fix or copy.
    try { validateSettings({...saved, exclusions: formValue(key)}); $(key).ariaInvalid = null; }
    catch (error) { pending.delete(key); $(key).ariaInvalid = 'true'; problem(`${sentence(error.message)} The previous list is still in use.`, line(key)); return false; }
  }
  pending.set(key, formValue(key));
  return true;
}
// Nothing was saved. Settings show the values in use again, except the site
// list, which keeps your text to try again or copy.
function unsaved(changes, error) {
  const keys = Object.keys(changes);
  for (const key of keys) if (key !== 'exclusions' && !pending.has(key) && same(formValue(key), changes[key])) putBack(key);
  for (const target of new Set(keys.map(line)))
    problem(target === 'sitesStatus' ? `${sentence(error.message)} The previous list is still in use.` : error.message, target);
}
function keep(key, pause = 0) {
  if (!queue(key)) return;
  clearTimeout(wait); wait = null;
  if (pause) wait = setTimeout(() => { wait = null; send(); }, pause);
  else send();
}
// One request at a time, so each compares with what's really saved.
async function send() {
  if (sending || !saved) return;
  const changes = Object.fromEntries([...pending].filter(([key, value]) => !same(value, saved[key])));
  pending.clear();
  const keys = Object.keys(changes);
  if (!keys.length) return;
  sending = true; flying = changes;
  try {
    const reply = await request('configure', {settings: {...saved, ...changes}, shown: saved});
    // It was saved: a read that fails can't undo that, so fall back to the reply.
    const result = await stored().catch(() => null) || reply;
    // Saving drops repeated sites; show the list as saved.
    for (const key of keys) if (!pending.has(key) && same(formValue(key), changes[key]) && !same(result[key], changes[key])) show(key, result[key]);
    refreshFields(result);
    // Chrome can refuse to sync a value, which turns its sync off; say so there.
    if (keys.some(key => policy[key])) await refreshSync().catch(error => report(error, 'syncStatus'));
  } catch (error) { unsaved(changes, error); }
  finally {
    sending = false; flying = {};
    if (pending.size && wait === null) send();
  }
}
for (const key of ['enabled', 'sleepingMode', ...numbers, 'discardPinned', 'protectAudio', 'exclusions', 'debug'])
  $(key).addEventListener('change', () => keep(key, numbers.includes(key) ? 500 : 0));
$('delayPreset').addEventListener('change', () => {
  $('customLabel').hidden = $('delayPreset').value !== 'custom';
  if ($('delayPreset').value !== 'custom') { $('delayMinutes').value = $('delayPreset').value; keep('delayMinutes'); }
});
// Leaving the page (closing it, say) saves what you were typing, as leaving the
// box would, without waiting for a save in progress.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || !saved || resetting) return;
  const base = {...saved, ...flying};
  for (const key of [...numbers, 'exclusions']) if (!pending.has(key) && !same(formValue(key), base[key])) queue(key);
  clearTimeout(wait); wait = null;
  if (!sending) { send(); return; }
  const changes = Object.fromEntries([...pending].filter(([key, value]) => !same(value, base[key])));
  pending.clear();
  if (Object.keys(changes).length) request('configure', {settings: {...base, ...changes}, shown: base}).catch(error => unsaved(changes, error));
});
// Nothing here submits: Enter in a box saves it like leaving it.
$('settings').addEventListener('submit', event => event.preventDefault());
// A confirmation clears after a few seconds. A newer message cancels that, so
// it never clears an error.
function briefly(text) { status(text); fade = setTimeout(() => status(''), 8000); }
$('reset').addEventListener('click', async () => {
  // A custom site list has no undo, so ask first.
  if (!confirm('Restore all settings to their defaults? Your excluded sites go back to the built-in list, and sync turns off on this computer.')) return;
  if (asking) { closeChoice(); syncLocked(false); }
  // The defaults replace any change still waiting to be saved.
  resetting = true; pending.clear(); clearTimeout(wait); wait = null;
  const focused = document.activeElement;
  locked(true);
  try {
    fill(await request('reset'));
    $('exclusions').ariaInvalid = null;
    for (const target of ['parkingStatus', 'sitesStatus', 'syncStatus']) status('', target);
    briefly('Defaults restored. Sync is now off on this computer; your other computers keep their settings.');
  } catch (error) { problem(error.message, 'status'); }
  finally { resetting = false; locked(false); if (focused?.id === 'reset') refocus(focused); }
  await refreshSync().catch(error => report(error, 'syncStatus'));
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
// Chrome reports a change only if you edited the list since entering it, so a
// list that couldn't be saved is tried again whenever you leave it.
sites.addEventListener('blur', () => {
  if (!pending.has('exclusions') && !same(formValue('exclusions'), {...saved, ...flying}.exclusions)) keep('exclusions');
});
// Clean up sorts the list and removes repeats (see cleanUpRules), and saves it
// like any edit. It changes nothing else, and leaves a list that is already
// clean exactly as it is. The new list replaces the old one as an edit, so Undo
// in the box brings the old list back (saved when you leave the box); focus
// stays on the button.
$('cleanUpSites').addEventListener('click', () => {
  const lines = sites.value.split('\n').map(line => line.trim()).filter(Boolean), cleaned = cleanUpRules(lines);
  if (same(cleaned, lines)) return;
  sites.focus(); sites.select();
  if (!document.execCommand?.('insertText', false, cleaned.join('\n'))) sites.value = cleaned.join('\n');
  sites.scrollTop = 0; $('cleanUpSites').focus();
  keep('exclusions');
});
for (const input of themes) input.addEventListener('change', async () => {
  if (!input.checked || !saved) return;
  try { saved = {...saved, appearance: (await request('appearance', {appearance: input.value})).appearance}; }
  catch (error) { show('appearance', saved.appearance); problem(error.message, 'status'); }
});
// Another Settings page, the popup or a synced computer changed something.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !saved) return;
  if (changes.settings) stored().then(settings => { if (settings) refreshFields(settings); }).catch(() => {});
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
// Show new values in fields you haven't edited, and remember them as saved. A
// change you made that is still waiting to be saved counts as edited.
function refreshFields(settings) {
  for (const key of Object.keys(settings))
    if (!same(settings[key], saved[key]) && same(formValue(key), saved[key]) && !pending.has(key)) show(key, settings[key]);
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
    if (result.status !== 'on') throw new Error('Chrome sync isn’t available right now. Try again later.');
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
    if (!data.tabs.length) $('tabs').textContent = 'No web pages are open.';
  } catch (error) { report(error, 'tabStatus'); }
  finally { $('refresh').disabled = false; scrollCue(); if (focused) refocus($('refresh')); }
}
$('refresh').addEventListener('click', refresh);
$('individual').addEventListener('toggle', () => { if ($('individual').open) refresh(); });
request('settings').then(async s => {
  fill(s); locked(false); syncLocked(false);
  try { await refreshSync(); } catch (error) { report(error, 'syncStatus'); }
}).catch(error => { $('loadError').hidden = false; report(error, 'loadError'); });

bindSupport(document.getElementById('support'), error => report(error, 'supportStatus'));
bindIssues($('reportBug'), error => report(error, 'supportStatus'));
