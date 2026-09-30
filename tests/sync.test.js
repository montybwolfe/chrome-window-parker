import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';
import {DEFAULTS, SYNCABLE} from '../settings.js';

const sender = {id: 'test', url: 'chrome-extension://test/options.html'};
const writes = h => h.calls.filter(c => c[0] === 'sync').map(c => c[1]);
const none = Object.fromEntries(SYNCABLE.map(key => [key, false]));
const ALL = [...SYNCABLE], PARKING = ['delayMinutes', 'dwellSeconds', 'sleepingMode'];
async function ready(settings = {}, {policy, customized, sync = {}} = {}) {
  const h = harness(2, 3); h.local.settings = {...DEFAULTS, ...settings};
  if (policy) h.local.syncPolicy = policy;
  if (customized) h.local.customized = customized;
  Object.assign(h.sync, sync);
  await h.restart(); return h;
}

test('sync is off for every setting by default, including after an upgrade', async () => {
  const h = await ready({delayMinutes: 30, exclusions: ['work.example']}); // an existing install
  assert.deepEqual(h.p.policy, none);
  await h.p.configure({...h.p.settings, delayMinutes: 45, exclusions: ['a.example']});
  await h.p.setAppearance('dark');
  assert.deepEqual(writes(h), []); assert.deepEqual(h.sync, {});
});

test('intent: nothing counts as chosen here until a syncable value really changes here', async () => {
  const h = await ready(); // no stored intent: every syncable setting is untouched
  assert.deepEqual(h.p.customized, none);
  await h.p.configure({...h.p.settings}); // Save without changes
  await h.p.configure({...h.p.settings, enabled: false, debug: true}); // not syncable
  assert.deepEqual(h.local.customized, none);
  await h.p.configure({...h.p.settings, delayMinutes: 30});
  assert.deepEqual(h.local.customized, {...none, delayMinutes: true}, 'only the setting that changed');
  // Saving the whole form again marks nothing else.
  await h.p.message({type: 'configure', settings: {...h.p.settings}, shown: {...h.p.settings}}, sender);
  assert.deepEqual(h.local.customized, {...none, delayMinutes: true});
  assert(!('customized' in h.sync)); assert.deepEqual(writes(h), []);
});

test('intent: a value changed back to its default is still chosen here (15 -> 30 -> 15)', async () => {
  const h = await ready();
  await h.p.configure({...h.p.settings, delayMinutes: 30}); await h.p.configure({...h.p.settings, delayMinutes: 15});
  assert.equal(h.p.settings.delayMinutes, DEFAULTS.delayMinutes); assert.equal(h.p.customized.delayMinutes, true);
  await h.restart(); assert.equal(h.p.customized.delayMinutes, true, 'kept across restarts');
});

test('intent: the header theme counts; a stale page copy neither undoes nor claims a synced change', async () => {
  const h = await ready({}, {policy: {delayMinutes: true}, sync: {delayMinutes: 15}});
  await h.p.message({type: 'appearance', appearance: 'dark'}, sender);
  assert.deepEqual(h.p.customized, {...none, appearance: true});
  const shown = {...h.p.settings}; // what an open Settings page shows
  h.sync.delayMinutes = 30; await h.p.syncChanged({delayMinutes: {newValue: 30}}); // then another computer changes the delay
  await h.p.message({type: 'configure', settings: {...shown, dwellSeconds: 5}, shown}, sender);
  assert.equal(h.p.settings.delayMinutes, 30, 'not undone'); assert.equal(h.sync.delayMinutes, 30);
  assert.equal(h.p.settings.dwellSeconds, 5);
  assert.deepEqual(h.p.customized, {...none, appearance: true, dwellSeconds: true});
  assert.deepEqual(writes(h), [], 'nothing stale shared');
});

test('intent: a synced value that replaces this value clears its choice; the same value leaves it alone', async () => {
  const h = await ready({delayMinutes: 30, dwellSeconds: 3},
    {policy: {delayMinutes: true, dwellSeconds: true}, customized: {delayMinutes: true, dwellSeconds: true}});
  await h.p.syncChanged({delayMinutes: {newValue: 30}, dwellSeconds: {newValue: 5}});
  assert.equal(h.p.customized.delayMinutes, true, 'the same value: still chosen here');
  assert.equal(h.p.customized.dwellSeconds, false, 'replaced by a synced value'); assert.equal(h.local.customized.dwellSeconds, false);
  await h.p.syncChanged({delayMinutes: {newValue: 45}});
  assert.deepEqual(h.p.customized, none, 'a synced value never counts as chosen here');
});

test('intent: a change here while syncing is chosen here and shared; its own echo changes nothing', async () => {
  const h = await ready({}, {policy: {delayMinutes: true}, sync: {delayMinutes: 15}});
  await h.p.configure({...h.p.settings, delayMinutes: 25});
  assert.equal(h.sync.delayMinutes, 25); assert.equal(h.p.customized.delayMinutes, true);
  await h.p.syncChanged({delayMinutes: {oldValue: 15, newValue: 25}});
  assert.equal(h.p.customized.delayMinutes, true); assert.equal(h.p.settings.delayMinutes, 25);
});

test('enable: with nothing shared yet, this value is shared without asking and keeps its intent', async () => {
  for (const chosen of [false, true]) {
    const h = await ready({delayMinutes: 30}, {customized: {delayMinutes: chosen}});
    assert.deepEqual(await h.p.syncEnable(['delayMinutes']), {status: 'on', failed: [], policy: {...none, delayMinutes: true}, settings: h.p.settings});
    assert.deepEqual(h.sync, {delayMinutes: 30}); assert.equal(h.p.customized.delayMinutes, chosen);
    assert.deepEqual(h.local.syncPolicy, {...none, delayMinutes: true});
  }
});

test('enable: an equal shared value turns on without asking or rewriting either side', async () => {
  for (const chosen of [false, true]) {
    const h = await ready({sleepingMode: 'immediate'}, {customized: {sleepingMode: chosen}, sync: {sleepingMode: 'immediate'}});
    const local = []; h.hooks.localSet = values => local.push(...Object.keys(values));
    assert.equal((await h.p.syncEnable(['sleepingMode'])).status, 'on');
    assert.deepEqual(writes(h), []); assert.deepEqual(local, ['syncPolicy']);
    assert.equal(h.p.customized.sleepingMode, chosen); assert(h.p.policy.sleepingMode);
  }
});

test('enable on a new computer: a different shared value is used without asking', async () => {
  const h = await ready({}, {sync: {delayMinutes: 30}}); // 15 minutes here, never changed here
  const result = await h.p.syncEnable(['delayMinutes']);
  assert.equal(result.status, 'on'); assert.equal(result.settings.delayMinutes, 30);
  assert.equal(h.p.settings.delayMinutes, 30); assert.equal(h.local.settings.delayMinutes, 30);
  assert(h.p.policy.delayMinutes); assert.equal(h.p.customized.delayMinutes, false);
  assert.deepEqual(writes(h), [], 'the shared value is left as it is');
});

test('enable: a value chosen here that differs from the shared one needs a choice; nothing changes until then', async () => {
  const h = await ready({delayMinutes: 15}, {customized: {delayMinutes: true}, sync: {delayMinutes: 60}});
  assert.deepEqual(await h.p.syncEnable(['delayMinutes']), {status: 'conflict', conflicts: [{key: 'delayMinutes', local: 15, synced: 60}]});
  // Cancel sends nothing more, so this is also the state after Cancel.
  assert.equal(h.p.policy.delayMinutes, false); assert.equal(h.p.settings.delayMinutes, 15);
  assert.equal(h.sync.delayMinutes, 60); assert.deepEqual(writes(h), []); assert.equal(h.p.customized.delayMinutes, true);
});

test('choices: "use synced" applies it and clears the choice; "use this computer’s" shares it and keeps it', async () => {
  const conflict = {customized: {delayMinutes: true}, sync: {delayMinutes: 60}};
  const theirs = await ready({delayMinutes: 15}, conflict);
  assert.equal((await theirs.p.syncEnable(['delayMinutes'], {delayMinutes: {use: 'synced', local: 15, synced: 60}})).status, 'on');
  assert.equal(theirs.p.settings.delayMinutes, 60); assert.equal(theirs.local.settings.delayMinutes, 60);
  assert.equal(theirs.p.customized.delayMinutes, false); assert.deepEqual(writes(theirs), []); assert(theirs.p.policy.delayMinutes);
  const mine = await ready({delayMinutes: 15}, conflict);
  assert.equal((await mine.p.syncEnable(['delayMinutes'], {delayMinutes: {use: 'local', local: 15, synced: 60}})).status, 'on');
  assert.equal(mine.sync.delayMinutes, 15); assert.equal(mine.p.settings.delayMinutes, 15);
  assert.equal(mine.p.customized.delayMinutes, true); assert(mine.p.policy.delayMinutes);
  const other = await ready({dwellSeconds: 3}, {customized: {dwellSeconds: true}, sync: {dwellSeconds: 5}});
  await assert.rejects(() => other.p.syncEnable(['dwellSeconds'], {dwellSeconds: {use: 'both', local: 3, synced: 5}}), /Choose/);
  assert.equal(other.p.policy.dwellSeconds, false); assert.deepEqual(writes(other), []);
});

test('choices count only while both values are still the ones the user saw', async () => {
  const h = await ready({delayMinutes: 15}, {customized: {delayMinutes: true}, sync: {delayMinutes: 60}});
  const keepMine = {delayMinutes: {use: 'local', local: 15, synced: 60}};
  h.sync.delayMinutes = 90; // changed on another computer while the user was choosing
  assert.deepEqual(await h.p.syncEnable(['delayMinutes'], keepMine), {status: 'conflict', conflicts: [{key: 'delayMinutes', local: 15, synced: 90}]});
  assert.equal(h.sync.delayMinutes, 90, 'not overwritten by the stale answer'); assert.equal(h.p.policy.delayMinutes, false);
  await h.p.configure({...h.p.settings, delayMinutes: 20}); // or changed here
  assert.equal((await h.p.syncEnable(['delayMinutes'], {delayMinutes: {use: 'synced', local: 15, synced: 90}})).status, 'conflict');
  assert.equal(h.p.settings.delayMinutes, 20);
  h.sync.delayMinutes = 20; // now the same: no choice needed any more
  assert.equal((await h.p.syncEnable(['delayMinutes'], keepMine)).status, 'on'); assert.deepEqual(writes(h), []);
});

test('a shared value this version can’t use is never replaced without asking', async () => {
  for (const chosen of [false, true]) {
    const h = await ready({sleepingMode: 'chrome'}, {customized: {sleepingMode: chosen}, sync: {sleepingMode: 'smart'}}); // e.g. a newer version
    const seen = {local: 'chrome', synced: null};
    assert.deepEqual(await h.p.syncEnable(['sleepingMode']), {status: 'conflict', conflicts: [{key: 'sleepingMode', ...seen}]});
    await assert.rejects(() => h.p.syncEnable(['sleepingMode'], {sleepingMode: {use: 'synced', ...seen}}), /Choose/);
    assert.equal((await h.p.syncEnable(['sleepingMode'], {sleepingMode: {use: 'off', ...seen}})).status, 'on');
    assert.equal(h.p.policy.sleepingMode, false, '"Don’t sync" leaves it off'); assert.equal(h.sync.sleepingMode, 'smart');
    assert.equal(h.p.settings.sleepingMode, 'chrome'); assert.equal(h.p.customized.sleepingMode, chosen);
    await h.p.syncEnable(['sleepingMode'], {sleepingMode: {use: 'local', ...seen}});
    assert.equal(h.sync.sleepingMode, 'chrome'); assert(h.p.policy.sleepingMode); assert.equal(h.p.customized.sleepingMode, true);
    await assert.rejects(() => h.p.syncEnable(['enabled']), /does not sync/);
  }
});

test('turning sync off keeps values, choices and shared values; turning it back on follows the same rules', async () => {
  const h = await ready({delayMinutes: 30}, {customized: {delayMinutes: true}});
  await h.p.syncEnable(['delayMinutes']);
  await h.p.syncChanged({delayMinutes: {newValue: 45}}); h.sync.delayMinutes = 45;
  assert.equal(h.p.settings.delayMinutes, 45, 'a synced change applies while on');
  assert.equal(h.p.customized.delayMinutes, false, 'and is not a choice made here');
  assert.equal((await h.p.syncDisable(['delayMinutes'])).status, 'off');
  assert.equal(h.p.settings.delayMinutes, 45); assert.equal(h.sync.delayMinutes, 45);
  await h.p.configure({...h.p.settings, delayMinutes: 20});
  assert.equal(h.sync.delayMinutes, 45, 'changes here are no longer shared'); assert.equal(h.p.customized.delayMinutes, true);
  await h.p.syncChanged({delayMinutes: {newValue: 90}});
  assert.equal(h.p.settings.delayMinutes, 20, 'nor synced ones applied');
  await h.p.syncDisable(['delayMinutes']); assert.equal(h.p.customized.delayMinutes, true, 'turning off keeps the choice');
  assert.equal((await h.p.syncEnable(['delayMinutes'])).status, 'conflict', 'so turning back on asks');
  // Without a choice made here, turning back on simply uses the shared value.
  const other = await ready({}, {policy: {delayMinutes: true}, sync: {delayMinutes: 15}});
  await other.p.syncDisable(['delayMinutes']); other.sync.delayMinutes = 50;
  assert.equal((await other.p.syncEnable(['delayMinutes'])).status, 'on'); assert.equal(other.p.settings.delayMinutes, 50);
});

test('groups: one request turns on everything it covers; settings already syncing are left alone', async () => {
  // Nothing shared, equal, different but never chosen here, and already syncing.
  const h = await ready({dwellSeconds: 3, sleepingMode: 'immediate', appearance: 'dark'},
    {policy: {appearance: true}, sync: {dwellSeconds: 3, delayMinutes: 30, appearance: 'dark'}});
  const result = await h.p.syncEnable(ALL); // "Sync all settings"
  assert.equal(result.status, 'on'); assert.deepEqual(result.failed, []);
  assert(Object.values(h.p.policy).every(Boolean));
  assert.equal(h.p.settings.delayMinutes, 30, 'different and never chosen here: the synced value is used');
  assert.equal(h.p.customized.delayMinutes, false); assert.equal(h.p.settings.dwellSeconds, 3);
  assert.deepEqual(writes(h).map(w => Object.keys(w)).flat().toSorted(), ['discardPinned', 'exclusions', 'protectAudio', 'sleepingMode'],
    'only values with nothing shared are written, one at a time');
  assert.equal(h.sync.sleepingMode, 'immediate');
  // Everything already syncs: another request changes nothing.
  h.calls.length = 0; assert.equal((await h.p.syncEnable(ALL)).status, 'on'); assert.deepEqual(writes(h), []);
});

test('groups: every needed choice is asked at once, and nothing changes until all are answered', async () => {
  const h = await ready({delayMinutes: 15, appearance: 'light'},
    {customized: {delayMinutes: true, appearance: true}, sync: {delayMinutes: 30, appearance: 'dark', sleepingMode: 'immediate'}});
  const before = structuredClone({settings: h.local.settings, sync: h.sync, policy: h.p.policy});
  const state = () => ({settings: h.local.settings, sync: h.sync, policy: h.p.policy});
  assert.deepEqual(await h.p.syncEnable(ALL), {status: 'conflict', conflicts: [
    {key: 'delayMinutes', local: 15, synced: 30}, {key: 'appearance', local: 'light', synced: 'dark'}]});
  assert.deepEqual(state(), before, 'no other setting was changed or shared first');
  const useSynced = {delayMinutes: {use: 'synced', local: 15, synced: 30}};
  assert.deepEqual(await h.p.syncEnable(ALL, useSynced), {status: 'conflict', conflicts: [{key: 'appearance', local: 'light', synced: 'dark'}]});
  assert.deepEqual(state(), before, 'a partial answer changes nothing either');
  const result = await h.p.syncEnable(ALL, {...useSynced, appearance: {use: 'local', local: 'light', synced: 'dark'}});
  assert.equal(result.status, 'on'); assert(Object.values(h.p.policy).every(Boolean));
  assert.equal(h.p.settings.delayMinutes, 30); assert.equal(h.p.customized.delayMinutes, false);
  assert.equal(h.sync.appearance, 'light'); assert.equal(h.p.customized.appearance, true);
  assert.equal(h.p.settings.sleepingMode, 'immediate', 'never chosen here: the synced value was used');
});

test('groups: turning a group off stops only its settings here and leaves shared values alone', async () => {
  const h = await ready(); await h.p.syncEnable(ALL); const shared = structuredClone(h.sync);
  await h.p.syncDisable(PARKING);
  assert.deepEqual(SYNCABLE.filter(key => h.p.policy[key]), SYNCABLE.filter(key => !PARKING.includes(key)));
  await h.p.syncDisable(ALL);
  assert.deepEqual(h.local.syncPolicy, none); assert.deepEqual(h.sync, shared, 'shared values stay for other computers');
  assert.deepEqual(h.p.settings, {...DEFAULTS});
});

test('failures: a refused share leaves only that setting off, with its reason; the rest still sync', async () => {
  const long = Array.from({length: 200}, (_, i) => `site-${i}-${'x'.repeat(40)}.example`);
  const h = await ready({exclusions: long}, {sync: {delayMinutes: 30}});
  h.hooks.syncSet = values => { if (JSON.stringify(values).length > 8192) throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded'); };
  const result = await h.p.syncEnable(ALL);
  assert.deepEqual(result.failed, [{key: 'exclusions', reason: 'too-large'}]);
  assert.equal(h.p.policy.exclusions, false); assert(!('exclusions' in h.sync)); assert.deepEqual(h.p.settings.exclusions, long);
  assert(SYNCABLE.filter(key => key !== 'exclusions').every(key => h.p.policy[key]), 'the others sync');
  assert.equal(h.p.settings.delayMinutes, 30);
  const busy = await ready(); busy.hooks.syncSet = () => { throw new Error('MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded'); };
  assert.deepEqual((await busy.p.syncEnable(PARKING)).failed, PARKING.map(key => ({key, reason: 'too-often'})));
  assert.deepEqual(busy.p.policy, none, 'nothing claims to sync');
  const off = await ready({}, {sync: {delayMinutes: 30}}); off.hooks.syncGet = () => { throw new Error('Sync is unavailable'); };
  assert.deepEqual(await off.p.syncEnable(ALL), {status: 'error', reason: 'unavailable'});
  assert.deepEqual(off.p.policy, none); assert.equal(off.p.settings.delayMinutes, 15);
});

test('remote changes apply only to settings this device syncs', async () => {
  const h = await ready({delayMinutes: 15, sleepingMode: 'chrome'}); await h.p.syncEnable(['delayMinutes']);
  await h.p.syncChanged({delayMinutes: {newValue: 25}, sleepingMode: {newValue: 'immediate'},
    enabled: {newValue: false}, debug: {newValue: true}});
  assert.equal(h.p.settings.delayMinutes, 25); assert.equal(h.local.settings.delayMinutes, 25);
  assert.equal(h.p.settings.sleepingMode, 'chrome'); assert.equal(h.p.settings.enabled, true);
  assert.equal(h.p.settings.debug, false);
  assert.equal(h.p.syncRelevant({sleepingMode: {newValue: 'immediate'}}), false);
  assert.equal(h.p.syncRelevant({delayMinutes: {newValue: 25}}), false, 'an unchanged value is not relevant');
  assert.equal(h.p.syncRelevant({delayMinutes: {newValue: 26}}), true);
});

test('site exclusions can stay local while other settings sync', async () => {
  const h = await ready({exclusions: ['work.example'], dwellSeconds: 2}); await h.p.syncEnable(['dwellSeconds']);
  await h.p.configure({...h.p.settings, exclusions: ['private.example'], dwellSeconds: 3});
  assert.deepEqual(h.sync, {dwellSeconds: 3});
  await h.p.syncChanged({exclusions: {newValue: ['shared.example']}});
  assert.deepEqual(h.p.settings.exclusions, ['private.example']);
});

test('pause, debug logging, protected tabs, choices and window state never sync', async () => {
  const h = await ready();
  await h.p.syncEnable(ALL); // everything that can sync is on
  h.calls.length = 0;
  await h.p.configure({...h.p.settings, enabled: false}); await h.p.configure({...h.p.settings, enabled: true, debug: true});
  await h.p.message({type: 'protect', tabId: 201, protected: true}, sender);
  await h.parkAll(); await h.focus(1); await h.advance(2000); // a parking cycle and a restoration
  assert.deepEqual(writes(h), []);
  assert.deepEqual(Object.keys(h.sync).sort(), [...SYNCABLE].sort());
  assert(!['syncPolicy', 'customized', 'enabled', 'debug'].some(key => key in h.sync));
  // Another device cannot change this device's pause state or sync choices.
  await h.p.syncChanged({enabled: {newValue: false}, syncPolicy: {newValue: {}}, customized: {newValue: {}}});
  assert.equal(h.p.settings.enabled, true); assert(Object.values(h.p.policy).every(Boolean));
});

test('malformed or unsupported synced values are ignored and cannot be adopted', async () => {
  const h = await ready({delayMinutes: 15, exclusions: ['a.example']});
  await h.p.syncEnable(['delayMinutes', 'exclusions']);
  for (const bad of [0, -5, 'soon', null, 99999, [15]]) {
    await h.p.syncChanged({delayMinutes: {newValue: bad}}); assert.equal(h.p.settings.delayMinutes, 15);
  }
  await h.p.syncChanged({exclusions: {newValue: ['has space.example']}});
  assert.deepEqual(h.p.settings.exclusions, ['a.example']);
  await h.p.syncChanged({exclusions: {newValue: [' b.example ', 'b.example']}});
  assert.deepEqual(h.p.settings.exclusions, ['b.example'], 'normal validation applies to synced values');
});

test('sync failures never break normal operation', async () => {
  const h = harness(2, 3); h.local.syncPolicy = {delayMinutes: true, exclusions: true};
  h.hooks.syncGet = () => { throw new Error('Sync is unavailable'); };
  h.hooks.syncSet = () => { throw new Error('Sync is unavailable'); };
  await h.restart(); // startup survives a failing sync read
  assert.equal((await h.p.configure({...h.p.settings, delayMinutes: 20})).delayMinutes, 20);
  assert.equal(h.local.settings.delayMinutes, 20);
  // The failed share stops syncing that setting here and reports it once.
  assert.equal(h.p.policy.delayMinutes, false); assert.equal(h.p.policy.exclusions, true);
  assert.deepEqual((await h.p.message({type: 'sync-state'}, sender)).notice, [{key: 'delayMinutes', reason: 'unavailable'}]);
  assert.equal((await h.p.message({type: 'sync-state'}, sender)).notice, null);
  assert.deepEqual(await h.p.syncEnable(['dwellSeconds']), {status: 'error', reason: 'unavailable'});
  await h.focus(-1); await h.advance(21 * 60000); await h.p.sweep();
  assert(h.p.states[2].parked, 'parking still works');
});

test('a site list too large for Chrome sync stays local, with a clear reason', async () => {
  const h = await ready(); await h.p.syncEnable(['exclusions']);
  h.hooks.syncSet = values => { if (JSON.stringify(values).length > 8192) throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded'); };
  const long = Array.from({length: 200}, (_, i) => `site-${i}-${'x'.repeat(40)}.example`);
  await h.p.configure({...h.p.settings, exclusions: long});
  assert.deepEqual(h.p.settings.exclusions, long); assert.equal(h.p.policy.exclusions, false);
  assert.deepEqual((await h.p.message({type: 'sync-state'}, sender)).notice, [{key: 'exclusions', reason: 'too-large'}]);
  // Turning it back on finds the older shared list; sharing this one still fails clearly.
  const {conflicts: [conflict]} = await h.p.syncEnable(['exclusions']);
  assert.deepEqual(conflict, {key: 'exclusions', local: long, synced: [...DEFAULTS.exclusions]});
  const result = await h.p.syncEnable(['exclusions'], {exclusions: {use: 'local', local: long, synced: conflict.synced}});
  assert.deepEqual(result.failed, [{key: 'exclusions', reason: 'too-large'}]); assert.equal(h.p.policy.exclusions, false);
});

test('a synced sleeping-mode change keeps normal semantics: no retroactive discards', async () => {
  const h = await ready({sleepingMode: 'chrome'}); await h.p.syncEnable(['sleepingMode']);
  await h.parkAll(); assert(h.p.states[2].parked);
  await h.p.syncChanged({sleepingMode: {newValue: 'immediate'}});
  assert.equal(h.p.settings.sleepingMode, 'immediate');
  assert(!h.calls.some(c => c[0] === 'discard'), 'windows already parked are not discarded retroactively');
  await h.focus(2); await h.advance(2000); await h.parkAll();
  assert.deepEqual(h.calls.filter(c => c[0] === 'discard').map(c => c[1]), [200, 201, 202], 'the next cycle uses it');
});

test('Restore defaults: defaults and sync off here, nothing chosen here, shared values untouched', async () => {
  const h = await ready({delayMinutes: 30, exclusions: ['work.example']}, {customized: {delayMinutes: true, exclusions: true}});
  await h.p.syncEnable(['delayMinutes', 'exclusions']); await h.p.setAppearance('dark'); h.calls.length = 0;
  assert.deepEqual(await h.p.message({type: 'reset'}, sender), {...DEFAULTS});
  assert.deepEqual(h.local.syncPolicy, none); assert.deepEqual(h.local.customized, none);
  assert.deepEqual(h.sync, {delayMinutes: 30, exclusions: ['work.example']}); assert.deepEqual(writes(h), []);
  await h.restart(); assert.deepEqual(h.p.settings, {...DEFAULTS}); assert.deepEqual(h.p.customized, none);
  // Like a new installation, turning sync back on uses the shared values without asking.
  assert.equal((await h.p.syncEnable(['delayMinutes', 'exclusions'])).status, 'on');
  assert.equal(h.p.settings.delayMinutes, 30); assert.deepEqual(h.p.settings.exclusions, ['work.example']);
  assert.deepEqual(h.p.customized, none);
});

test('startup applies changes that arrived while stopped and re-shares missing values', async () => {
  const h = await ready({delayMinutes: 15, dwellSeconds: 2}, {customized: {delayMinutes: true}});
  await h.p.syncEnable(['delayMinutes', 'dwellSeconds']);
  h.sync.delayMinutes = 40; delete h.sync.dwellSeconds; // changed elsewhere; shared data reset
  await h.restart();
  assert.equal(h.p.settings.delayMinutes, 40); assert.equal(h.sync.dwellSeconds, 2);
  assert.equal(h.p.customized.delayMinutes, false, 'the synced value replaced the one chosen here');
});

test('the header theme applies immediately without interrupting parking work', async () => {
  const h = await ready(); const epoch = h.p.epoch;
  assert.equal((await h.p.message({type: 'appearance', appearance: 'dark'}, sender)).appearance, 'dark');
  assert.equal(h.local.settings.appearance, 'dark'); assert.equal(h.p.epoch, epoch); assert.deepEqual(writes(h), []);
  await h.p.syncEnable(['appearance']); await h.p.message({type: 'appearance', appearance: 'light'}, sender);
  assert.equal(h.sync.appearance, 'light', 'shared when theme sync is on');
  await h.p.syncChanged({appearance: {newValue: 'auto'}});
  assert.equal(h.p.settings.appearance, 'auto'); assert.equal(h.p.epoch, epoch, 'a synced theme is presentation only');
  await assert.rejects(() => h.p.message({type: 'appearance', appearance: 'sepia'}, sender), /Choose a theme/);
});

test('sync messages accept only lists of syncable settings', async () => {
  const h = await ready();
  for (const keys of ['delayMinutes', undefined, ['enabled'], ['debug', 'delayMinutes']]) {
    await assert.rejects(() => h.p.message({type: 'sync-enable', keys}, sender), /does not sync/);
    await assert.rejects(() => h.p.message({type: 'sync-disable', keys}, sender), /does not sync/);
  }
  assert.equal((await h.p.message({type: 'sync-enable', keys: ['delayMinutes']}, sender)).status, 'on');
  assert.equal((await h.p.message({type: 'sync-disable', keys: ['delayMinutes']}, sender)).policy.delayMinutes, false);
  assert.deepEqual(writes(h), [{delayMinutes: 15}]);
});
