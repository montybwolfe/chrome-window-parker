import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.js';
import {DEFAULTS, SYNCABLE} from '../settings.js';

const sender = {id: 'test', url: 'chrome-extension://test/options.html'};
const writes = h => h.calls.filter(c => c[0] === 'sync').map(c => c[1]);
async function ready(settings = {}, syncPolicy) {
  const h = harness(2, 3); h.local.settings = {...DEFAULTS, ...settings};
  if (syncPolicy) h.local.syncPolicy = syncPolicy;
  await h.restart(); return h;
}

test('sync is off for every setting by default, including after an upgrade', async () => {
  const h = await ready({delayMinutes: 30, exclusions: ['work.example']}); // an existing install
  assert.deepEqual(h.p.policy, Object.fromEntries(SYNCABLE.map(key => [key, false])));
  await h.p.configure({...h.p.settings, delayMinutes: 45, exclusions: ['a.example']});
  await h.p.setAppearance('dark');
  assert.deepEqual(writes(h), []); assert.deepEqual(h.sync, {});
});

test('enabling with nothing shared seeds the shared value from this device only', async () => {
  const h = await ready({delayMinutes: 30});
  assert.equal((await h.p.syncEnable('delayMinutes')).status, 'on');
  assert.deepEqual(h.sync, {delayMinutes: 30});
  assert.deepEqual(Object.entries(h.local.syncPolicy).filter(([, on]) => on), [['delayMinutes', true]]);
});

test('enabling where values already match turns sync on without writing', async () => {
  const h = await ready({sleepingMode: 'immediate'}); h.sync.sleepingMode = 'immediate';
  assert.equal((await h.p.syncEnable('sleepingMode')).status, 'on'); assert.deepEqual(writes(h), []);
});

test('different values need an explicit choice, and nothing changes until then', async () => {
  const h = await ready({delayMinutes: 15}); h.sync.delayMinutes = 60;
  assert.deepEqual(await h.p.syncEnable('delayMinutes'), {status: 'conflict', key: 'delayMinutes', local: 15, synced: 60});
  assert.equal(h.p.policy.delayMinutes, false); assert.equal(h.p.settings.delayMinutes, 15);
  assert.equal(h.sync.delayMinutes, 60); assert.deepEqual(writes(h), []);
});

test('"use this device" shares the local value; "use synced" adopts the shared one', async () => {
  const mine = await ready({delayMinutes: 15}); mine.sync.delayMinutes = 60;
  assert.equal((await mine.p.syncResolve('delayMinutes', 'local')).status, 'on');
  assert.equal(mine.sync.delayMinutes, 15); assert.equal(mine.p.settings.delayMinutes, 15);
  const theirs = await ready({delayMinutes: 15}); theirs.sync.delayMinutes = 60;
  assert.equal((await theirs.p.syncResolve('delayMinutes', 'synced')).status, 'on');
  assert.equal(theirs.p.settings.delayMinutes, 60); assert.equal(theirs.local.settings.delayMinutes, 60);
  assert.deepEqual(writes(theirs), []);
});

test('turning sync off keeps the local value and leaves the shared value alone', async () => {
  const h = await ready({delayMinutes: 30}); await h.p.syncEnable('delayMinutes');
  await h.p.syncChanged({delayMinutes: {newValue: 45}}); h.sync.delayMinutes = 45;
  assert.equal(h.p.settings.delayMinutes, 45, 'remote change applies while on');
  assert.equal((await h.p.syncDisable('delayMinutes')).status, 'off');
  assert.equal(h.p.settings.delayMinutes, 45); assert.equal(h.sync.delayMinutes, 45);
  await h.p.configure({...h.p.settings, delayMinutes: 20});
  assert.equal(h.sync.delayMinutes, 45, 'local changes are no longer shared');
  await h.p.syncChanged({delayMinutes: {newValue: 90}});
  assert.equal(h.p.settings.delayMinutes, 20, 'remote changes are no longer applied');
});

test('remote changes apply only to settings this device syncs', async () => {
  const h = await ready({delayMinutes: 15, sleepingMode: 'chrome'}); await h.p.syncEnable('delayMinutes');
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
  const h = await ready({exclusions: ['work.example'], dwellSeconds: 2}); await h.p.syncEnable('dwellSeconds');
  await h.p.configure({...h.p.settings, exclusions: ['private.example'], dwellSeconds: 3});
  assert.deepEqual(h.sync, {dwellSeconds: 3});
  await h.p.syncChanged({exclusions: {newValue: ['shared.example']}});
  assert.deepEqual(h.p.settings.exclusions, ['private.example']);
});

test('pause, debug logging, protected tabs and window state never sync', async () => {
  const h = await ready();
  for (const key of SYNCABLE) await h.p.syncEnable(key); // everything that can sync is on
  h.calls.length = 0;
  await h.p.configure({...h.p.settings, enabled: false}); await h.p.configure({...h.p.settings, enabled: true, debug: true});
  await h.p.message({type: 'protect', tabId: 201, protected: true}, sender);
  await h.parkAll(); await h.focus(1); await h.advance(2000); // a parking cycle and a restoration
  assert.deepEqual(writes(h), []);
  assert.deepEqual(Object.keys(h.sync).sort(), [...SYNCABLE].sort());
  assert(!('syncPolicy' in h.sync) && !('enabled' in h.sync) && !('debug' in h.sync));
  // Another device cannot change this device's pause state or sync choices.
  await h.p.syncChanged({enabled: {newValue: false}, syncPolicy: {newValue: {}}});
  assert.equal(h.p.settings.enabled, true); assert(Object.values(h.p.policy).every(Boolean));
});

test('malformed or unsupported synced values are ignored and cannot be adopted', async () => {
  const h = await ready({delayMinutes: 15, exclusions: ['a.example']});
  await h.p.syncEnable('delayMinutes'); await h.p.syncEnable('exclusions');
  for (const bad of [0, -5, 'soon', null, 99999, [15]]) {
    await h.p.syncChanged({delayMinutes: {newValue: bad}}); assert.equal(h.p.settings.delayMinutes, 15);
  }
  await h.p.syncChanged({exclusions: {newValue: ['has space.example']}});
  assert.deepEqual(h.p.settings.exclusions, ['a.example']);
  await h.p.syncChanged({exclusions: {newValue: [' b.example ', 'b.example']}});
  assert.deepEqual(h.p.settings.exclusions, ['b.example'], 'normal validation applies to synced values');
  const other = await ready({sleepingMode: 'chrome'}); other.sync.sleepingMode = 'smart'; // e.g. a future version
  assert.deepEqual(await other.p.syncEnable('sleepingMode'), {status: 'conflict', key: 'sleepingMode', local: 'chrome', synced: null});
  assert.deepEqual(await other.p.syncResolve('sleepingMode', 'synced'), {status: 'error', reason: 'unusable'});
  assert.equal(other.p.policy.sleepingMode, false);
  assert.equal((await other.p.syncResolve('sleepingMode', 'local')).status, 'on');
  assert.equal(other.sync.sleepingMode, 'chrome');
  await assert.rejects(() => other.p.syncEnable('enabled'), /does not sync/);
  await assert.rejects(() => other.p.syncResolve('delayMinutes', 'both'), /Choose/);
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
  assert.deepEqual((await h.p.message({type: 'sync-state'}, sender)).notice, {keys: ['delayMinutes'], reason: 'unavailable'});
  assert.equal((await h.p.message({type: 'sync-state'}, sender)).notice, null);
  assert.deepEqual(await h.p.syncEnable('dwellSeconds'), {status: 'error', reason: 'unavailable'});
  await h.focus(-1); await h.advance(21 * 60000); await h.p.sweep();
  assert(h.p.states[2].parked, 'parking still works');
});

test('a site list too large for Chrome sync stays local, with a clear reason', async () => {
  const h = await ready(); await h.p.syncEnable('exclusions');
  h.hooks.syncSet = values => { if (JSON.stringify(values).length > 8192) throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded'); };
  const long = Array.from({length: 200}, (_, i) => `site-${i}-${'x'.repeat(40)}.example`);
  await h.p.configure({...h.p.settings, exclusions: long});
  assert.deepEqual(h.p.settings.exclusions, long); assert.equal(h.p.policy.exclusions, false);
  assert.deepEqual((await h.p.message({type: 'sync-state'}, sender)).notice, {keys: ['exclusions'], reason: 'too-large'});
  // Turning it back on finds the older shared list; sharing this one still fails clearly.
  assert.equal((await h.p.syncEnable('exclusions')).status, 'conflict');
  assert.deepEqual(await h.p.syncResolve('exclusions', 'local'), {status: 'error', reason: 'too-large'});
  assert.equal(h.p.policy.exclusions, false);
});

test('a synced sleeping-mode change keeps normal semantics: no retroactive discards', async () => {
  const h = await ready({sleepingMode: 'chrome'}); await h.p.syncEnable('sleepingMode');
  await h.parkAll(); assert(h.p.states[2].parked);
  await h.p.syncChanged({sleepingMode: {newValue: 'immediate'}});
  assert.equal(h.p.settings.sleepingMode, 'immediate');
  assert(!h.calls.some(c => c[0] === 'discard'), 'windows already parked are not discarded retroactively');
  await h.focus(2); await h.advance(2000); await h.parkAll();
  assert.deepEqual(h.calls.filter(c => c[0] === 'discard').map(c => c[1]), [200, 201, 202], 'the next cycle uses it');
});

test('Reset restores defaults here, stops syncing here and leaves shared values alone', async () => {
  const h = await ready({delayMinutes: 30, exclusions: ['work.example']});
  await h.p.syncEnable('delayMinutes'); await h.p.syncEnable('exclusions'); h.calls.length = 0;
  assert.deepEqual(await h.p.message({type: 'reset'}, sender), {...DEFAULTS});
  assert(Object.values(h.p.policy).every(on => !on)); assert(Object.values(h.local.syncPolicy).every(on => !on));
  assert.deepEqual(h.sync, {delayMinutes: 30, exclusions: ['work.example']}); assert.deepEqual(writes(h), []);
});

test('startup applies changes that arrived while stopped and re-shares missing values', async () => {
  const h = await ready({delayMinutes: 15, dwellSeconds: 2});
  await h.p.syncEnable('delayMinutes'); await h.p.syncEnable('dwellSeconds');
  h.sync.delayMinutes = 40; delete h.sync.dwellSeconds; // changed elsewhere; shared data reset
  await h.restart();
  assert.equal(h.p.settings.delayMinutes, 40); assert.equal(h.sync.dwellSeconds, 2);
});

test('the header theme applies immediately without interrupting parking work', async () => {
  const h = await ready(); const epoch = h.p.epoch;
  assert.equal((await h.p.message({type: 'appearance', appearance: 'dark'}, sender)).appearance, 'dark');
  assert.equal(h.local.settings.appearance, 'dark'); assert.equal(h.p.epoch, epoch); assert.deepEqual(writes(h), []);
  await h.p.syncEnable('appearance'); await h.p.message({type: 'appearance', appearance: 'light'}, sender);
  assert.equal(h.sync.appearance, 'light', 'shared when theme sync is on');
  await h.p.syncChanged({appearance: {newValue: 'auto'}});
  assert.equal(h.p.settings.appearance, 'auto'); assert.equal(h.p.epoch, epoch, 'a synced theme is presentation only');
  await assert.rejects(() => h.p.message({type: 'appearance', appearance: 'sepia'}, sender), /Choose a theme/);
});
