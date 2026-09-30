import {DEFAULTS, SYNCABLE, validateSettings, storedSettings, skipReason, syncFlags, sameValue} from './settings.js';
import {systemClock} from './clock.js';

// All asynchronous transitions are serialized by background.js. Focus signals
// invalidate in-flight operations synchronously, before entering that queue.
export class Parker {
  constructor(api, clock = systemClock, dispatch = f => f()) {
    this.api = api; this.clock = clock; this.dispatch = dispatch;
    this.settings = {...DEFAULTS}; this.states = {}; this.records = {}; this.protectedIds = [];
    this.focus = null; this.epoch = 0; this.safetyEpoch = 0; this.dwell = null; this.focusedState = null;
    this.tabEpoch = new Map(); this.selectionEpoch = new Map();
    this.shellEpoch = 0; this.detachedTabs = new Map(); this.clearRequests = 0;
    this.loaded = false; this.departedAt = null;
    this.policy = syncFlags(); this.customized = syncFlags(); this.syncNotice = null;
    this.owners = {}; this.retries = 0; this.retryTimer = null; this.deferred = false; this.replacements = [];
    this.parkingURL = api.runtime.getURL('parked.html');
  }
  log(...args) { if (this.settings.debug) console.debug('[Chrome Window Parker]', ...args); }
  async getWindow(id) {
    try { return await this.api.windows.get(id, {populate: true}); }
    catch (error) { if (/No window with id|Invalid window ID/i.test(error.message)) return null; throw error; }
  }
  async getTab(id) {
    if (!Number.isInteger(id)) return null;
    try { return await this.api.tabs.get(id); }
    catch (error) { if (/No tab with id|Invalid tab ID/i.test(error.message)) return null; throw error; }
  }
  token(tab) {
    const url = tab?.pendingUrl || tab?.url || '';
    if (!url.startsWith(`${this.parkingURL}#`)) return null;
    const token = url.slice(this.parkingURL.length + 1);
    return /^[a-zA-Z0-9-]{8,80}$/.test(token) ? token : null;
  }
  real(t) { return !this.token(t); }
  removable(t) {
    const token = this.token(t);
    return token && t.url === `${this.parkingURL}#${token}` && (!t.pendingUrl || t.pendingUrl === t.url) ? token : null;
  }
  supported(w) { return w && w.type === 'normal' && !w.incognito; }
  async save() {
    await this.api.storage.session.set({runtimeState: {states: this.states, protectedIds: this.protectedIds,
      pendingDwell: this.dwell ? {windowId: this.dwell.id, due: this.dwell.due} : null,
      detachedTabs: [...this.detachedTabs], owners: this.owners}});
  }
  async saveRecords() {
    // Bound abandoned crash records, retaining those belonging to live windows
    // and to pages that were moved out of their window and await removal.
    const live = new Set([...Object.values(this.states).map(s => s.token), ...Object.keys(this.owners)]);
    const stale = Object.keys(this.records).filter(k => !live.has(k)).sort((a,b) => this.records[b].updated - this.records[a].updated);
    for (const key of stale.slice(100)) delete this.records[key];
    await this.api.storage.local.set({parkingRecords: this.records});
  }
  adopt(w) {
    if (!this.supported(w)) return null;
    const tabs = w.tabs || [], active = tabs.find(t => t.active);
    let s = this.states[w.id];
    if (!s) s = this.states[w.id] = {lastUse: this.clock.now(), retryAt: 0, previousId: null, parked: false, qualified: false};
    // A parking page belongs to the window it was made for. A page with no known
    // owner (after a browser restart or an update) is claimed by its window.
    for (const t of tabs) { const token = this.token(t); if (token && !(token in this.owners)) this.owners[token] = w.id; }
    const own = t => !!this.token(t) && this.owners[this.token(t)] === w.id;
    const parking = tabs.find(t => t.active && own(t)) || tabs.find(own), wasParked = s.parked;
    s.parkingId = parking?.id ?? null; s.token = this.token(parking);
    s.parked = !!(active && own(active));
    // Our page left without a restore (dragged or moved to another window):
    // count that as use, so this window is not parked again straight away.
    if (wasParked && !parking) { s.lastUse = this.clock.now(); s.retryAt = 0; }
    if (s.parked && !tabs.some(t => t.id === s.previousId && this.real(t))) {
      const record = this.records[s.token];
      const matches = tabs.filter(t => this.real(t) && t.url === record?.url);
      s.previousId = matches[record?.occurrence || 0]?.id ?? null;
    }
    return s;
  }
  async init() {
    const [local, session, windows] = await Promise.all([
      this.api.storage.local.get(['settings', 'parkingRecords', 'syncPolicy', 'customized']),
      this.api.storage.session.get('runtimeState'),
      this.api.windows.getAll({populate: true, windowTypes: ['normal']})
    ]);
    try { this.settings = storedSettings(local.settings || {}); } catch { this.settings = {...DEFAULTS, enabled: false}; }
    this.policy = syncFlags(local.syncPolicy); this.customized = syncFlags(local.customized);
    // Storage can outlive older versions or be partially written. Rebuild invalid
    // entries from live tabs rather than letting them prevent worker startup.
    this.records = Object.fromEntries(Object.entries(local.parkingRecords || {}).filter(([token, r]) =>
      /^[a-zA-Z0-9-]{8,80}$/.test(token) && r && typeof r.url === 'string' && typeof r.title === 'string' &&
      Number.isInteger(r.index) && r.index >= 0 && Number.isFinite(r.updated)));
    this.states = Object.fromEntries(Object.entries(session.runtimeState?.states || {}).filter(([id, s]) =>
      /^\d+$/.test(id) && s && Number.isFinite(s.lastUse) && s.lastUse <= this.clock.now()));
    for (const s of Object.values(this.states)) if (!Number.isFinite(s.retryAt)) s.retryAt = 0;
    this.protectedIds = Array.isArray(session.runtimeState?.protectedIds) ?
      session.runtimeState.protectedIds.filter(Number.isInteger) : [];
    // Tabs Chrome replaced while this state loaded (see replaced()). Protection is
    // not pruned against this window snapshot: the event reporting a replacement
    // can arrive after it, and closed tabs are dropped by removed().
    for (const [addedId, removedId] of this.replacements.splice(0)) this.follow(addedId, removedId);
    const owners = session.runtimeState?.owners;
    const pages = new Set(windows.flatMap(w => (w.tabs || []).map(t => this.token(t))).filter(Boolean));
    this.owners = Object.fromEntries(Object.entries(owners && typeof owners === 'object' ? owners : {}).filter(([token, id]) =>
      /^[a-zA-Z0-9-]{8,80}$/.test(token) && Number.isInteger(id) && pages.has(token)));
    const live = new Set(windows.filter(w => this.supported(w)).map(w => String(w.id)));
    for (const id of Object.keys(this.states)) if (!live.has(id)) delete this.states[id];
    for (const w of windows) this.adopt(w);
    // A focus event that wakes this worker is signalled before persisted state
    // loads, so signalFocus() cannot record leaving a genuinely used window.
    // Resolve focus before the next await: a window still qualified while
    // another has focus was left since the last save, at the first focus change
    // this worker saw (or now). Brief visits never qualify, so remain non-use.
    this.loaded = true;
    if (this.focus === null) this.signalFocus(windows.find(w => w.focused)?.id ?? -1);
    for (const [id, s] of Object.entries(this.states)) if (s.qualified && Number(id) !== this.focus) {
      s.lastUse = this.departedAt ?? this.clock.now(); s.retryAt = 0; s.qualified = false;
    }
    // Never trust a persisted partial dwell. A new worker observes a full new dwell.
    this.focusedState = this.focus;
    // A worker can stop between detach and attach. Keep unresolved transfers
    // blocked; discard a saved transfer only after locating the tab in a live
    // window (or confirming it no longer exists). Fresh event signals win.
    const transfers = session.runtimeState?.detachedTabs;
    const savedTransfers = Array.isArray(transfers) ? transfers.filter(pair =>
      Array.isArray(pair) && pair.length === 2 && pair.every(Number.isInteger) && live.has(String(pair[1]))) : [];
    const freshTransfers = new Set(this.detachedTabs.keys());
    this.detachedTabs = new Map([...savedTransfers, ...this.detachedTabs]);
    for (const [tabId, source] of this.detachedTabs) {
      if (freshTransfers.has(tabId)) continue;
      const epoch = this.shellEpoch, tab = await this.getTab(tabId);
      const owner = tab ? await this.getWindow(tab.windowId) : null;
      if (this.shellEpoch === epoch && this.detachedTabs.get(tabId) === source &&
          (!tab || (tab.windowId !== source && owner?.tabs.some(t => t.id === tabId)))) this.detachedTabs.delete(tabId);
    }
    // Recover an interrupted restoration or clean up an older reusable page.
    for (const w of windows) {
      await this.cleanupStray(w.id);
      await this.cleanupParking(w.id);
      await this.cleanupEmptyParked(w.id);
    }
    await this.startDwell();
    await this.save(); await this.schedule();
    // Sync is optional: a failure here must never stop the worker starting.
    try { await this.pullSync(); } catch (error) { console.error('[Chrome Window Parker] sync check', error); }
  }
  signalFocus(id) {
    this.shellEpoch++;
    if (!this.loaded) this.departedAt ??= this.clock.now(); // See init().
    // Record leaving a genuinely used window before older queued sweeps run.
    const old = this.states[this.focus];
    if (id !== this.focus && old?.qualified) {
      old.lastUse = this.clock.now(); old.retryAt = 0; old.qualified = false;
    }
    if (this.dwell) this.log('dwell cancel', this.dwell.id);
    this.focus = id; this.epoch++;
    if (this.dwell) this.clock.clearTimeout(this.dwell.timer);
    this.dwell = null;
    return this.epoch;
  }
  signalTab(windowId, activatedId) {
    this.shellEpoch++;
    this.tabEpoch.set(windowId, (this.tabEpoch.get(windowId) || 0) + 1);
    // Our own parking-page activation is expected. A real-tab selection cancels
    // a discard batch even if the parking page becomes active again afterwards.
    if (activatedId !== undefined && activatedId !== this.states[windowId]?.parkingId)
      this.selectionEpoch.set(windowId, (this.selectionEpoch.get(windowId) || 0) + 1);
  }
  // Chrome gives a tab a new ID when it unloads it, whether Memory Saver or
  // Discard immediately did so. Protection and the remembered previous tab follow
  // the tab. A worker woken by the change keeps it until init() has loaded state.
  replaced(addedId, removedId) {
    if (!this.loaded) this.replacements.push([addedId, removedId]);
    else this.follow(addedId, removedId);
  }
  follow(addedId, removedId) {
    this.protectedIds = this.protectedIds.map(id => id === removedId ? addedId : id);
    for (const s of Object.values(this.states)) if (s.previousId === removedId) s.previousId = addedId;
  }
  async focusChanged(id, at, epoch) {
    const old = this.states[this.focusedState];
    if (old?.qualified) { old.lastUse = at; old.retryAt = 0; old.qualified = false; }
    this.focusedState = id;
    this.log('focus', id);
    if (epoch === this.epoch) { await this.startDwell(); await this.cleanupEmptyParked(id); }
    await this.save(); await this.schedule();
  }
  async startDwell() {
    if (this.dwell) this.clock.clearTimeout(this.dwell.timer);
    this.dwell = null;
    await this.api.alarms.clear('dwell-recovery');
    const w = await this.getWindow(this.focus), s = this.adopt(w);
    if (!s || !w.focused || !this.settings.enabled) return;
    if (this.focus !== w.id) return;
    const epoch = this.epoch, id = w.id, due = this.clock.now() + this.settings.dwellSeconds * 1000;
    this.dwell = {id, epoch, due, timer: this.clock.setTimeout(() => this.dispatch(() => this.finishDwell(epoch)), this.settings.dwellSeconds * 1000)};
    await this.api.alarms.create('dwell-recovery', {when: due + 30000});
    this.log('dwell start', id, this.settings.dwellSeconds);
  }
  async finishDwell(epoch) {
    const d = this.dwell;
    if (!d || d.epoch !== epoch || this.epoch !== epoch || this.focus !== d.id) return;
    const elapsed = this.clock.now() - d.due;
    // A delayed timer (sleep / suspended execution) is not evidence of dwell.
    if (elapsed < 0 || elapsed > 1500) { await this.startDwell(); return; }
    const w = await this.getWindow(d.id);
    if (!w?.focused || this.epoch !== epoch) return;
    this.dwell = null; await this.api.alarms.clear('dwell-recovery');
    const s = this.adopt(w);
    if (!s || !this.settings.enabled) return;
    s.qualified = true; s.lastUse = this.clock.now(); s.retryAt = 0;
    if (s.parked) await this.restore(d.id, epoch);
    await this.save(); await this.schedule();
  }
  async schedule() {
    if (!this.settings.enabled) { await this.api.alarms.clear('parking'); return; }
    const due = Object.entries(this.states)
      .filter(([id,s]) => Number(id) !== this.focus && !s.parked)
      .map(([,s]) => Math.max(s.lastUse + this.settings.delayMinutes * 60000, s.retryAt || 0));
    if (due.length) {
      const deadline = Math.min(...due), when = Math.max(this.clock.now() + 30000, deadline);
      const existing = await this.api.alarms.get('parking');
      // Unrelated tab events must not continually postpone an overdue alarm.
      if (existing && existing.scheduledTime >= deadline && existing.scheduledTime <= when) return;
      await this.api.alarms.create('parking', {when}); this.log('inactivity alarm', when);
    } else await this.api.alarms.clear('parking');
  }
  async downloading() {
    // Downloads have no reliable tab ID: conservatively pause ALL discards.
    try { return (await this.api.downloads.search({state: 'in_progress'})).length > 0; }
    catch (error) {
      if (error instanceof TypeError) throw error;
      this.log('download safety check unavailable', error.message);
      return true; // Fail closed if safety information is unavailable.
    }
  }
  async sweep(onlyWindowId) {
    if (!this.settings.enabled) return;
    const windows = await this.api.windows.getAll({populate: true, windowTypes: ['normal']});
    const live = new Set(windows.filter(w => this.supported(w)).map(w => String(w.id)));
    for (const id of Object.keys(this.states)) if (!live.has(id)) delete this.states[id];
    for (const w of windows) {
      if (onlyWindowId !== undefined && w.id !== onlyWindowId) continue;
      const s = this.adopt(w);
      if (s) await this.cleanupStray(w.id);
      if (s?.parked) await this.cleanupEmptyParked(w.id);
      if (s && !s.parked && s.parkingId) await this.cleanupParking(w.id);
      if (!s || s.parked || w.focused || w.id === this.focus) continue;
      if (this.clock.now() < Math.max(s.lastUse + this.settings.delayMinutes * 60000, s.retryAt || 0)) continue;
      s.retryAt = this.clock.now() + 60000;
      try { await this.park(w.id); }
      catch (error) {
        if (/No (tab|window) with id|Tabs cannot be edited right now/i.test(error.message))
          this.log('parking deferred', w.id, error.message);
        else throw error;
      }
    }
    await this.save(); await this.schedule();
  }
  async park(id) {
    const epoch = this.epoch, safetyEpoch = this.safetyEpoch, tabEpoch = this.tabEpoch.get(id) || 0;
    const selectionEpoch = this.selectionEpoch.get(id) || 0;
    let checkedAt = this.clock.now(), interrupted = false;
    const valid = () => {
      const now = this.clock.now(), gap = now - checkedAt; checkedAt = now;
      // Abandon work after sleep, a clock jump or a slow API interruption. No
      // snapshot or continuation is persisted for another worker to resume.
      if (gap < 0 || gap > 5000) interrupted = true;
      return !interrupted && this.settings.enabled && this.epoch === epoch &&
        this.safetyEpoch === safetyEpoch && this.focus !== id &&
        (this.selectionEpoch.get(id) || 0) === selectionEpoch;
    };
    let w = await this.getWindow(id);
    if (!this.supported(w) || w.focused || !valid() || await this.downloading()) return;
    const active = w.tabs.find(t => t.active), s = this.adopt(w);
    if (!active || s.parked) return;
    const reason = skipReason(active, this.settings, this.protectedIds);
    if (reason) { this.log('window skipped', id, reason); return; }
    // Reuse only this window's own page; a page moved in from elsewhere is removed.
    let parking = w.tabs.find(t => this.token(t) && this.owners[this.token(t)] === id);
    if (!parking) {
      const token = crypto.randomUUID(); this.owners[token] = id;
      try { parking = await this.api.tabs.create({windowId: id, active: false, index: w.tabs.length, url: `${this.parkingURL}#${token}`}); }
      catch (error) { delete this.owners[token]; throw error; }
    }
    const parkingToken = this.token(parking);
    if (!parkingToken) return;
    s.parkingId = parking.id; s.token = parkingToken;
    s.previousId = active.id;
    this.records[s.token] = {url: active.url, title: active.title || 'Previous tab', index: active.index,
      occurrence: w.tabs.filter(t => t.url === active.url && t.index < active.index).length, updated: this.clock.now()};
    // Journal before activation: interruption can leave a parking page but never lose its target.
    await this.saveRecords(); await this.save();
    w = await this.getWindow(id);
    if (!w || w.focused || !valid() || (this.tabEpoch.get(id) || 0) !== tabEpoch ||
        w.tabs.find(t => t.active)?.id !== active.id ||
        skipReason(w.tabs.find(t => t.id === active.id), this.settings, this.protectedIds)) return;
    if (await this.downloading() || !valid()) return;
    w = await this.getWindow(id);
    if (!this.supported(w) || w.focused || !valid() || (this.tabEpoch.get(id) || 0) !== tabEpoch ||
        w.tabs.find(t => t.active)?.id !== active.id ||
        !w.tabs.some(t => t.id === parking.id && this.token(t) === s.token) ||
        skipReason(w.tabs.find(t => t.id === active.id), this.settings, this.protectedIds)) return;
    // No windows.update, window creation, tab moves, or focus-changing API calls.
    await this.api.tabs.update(parking.id, {active: true});
    s.parked = true; s.qualified = false; await this.save();
    this.log('parked', id, 'previous tab', active.id);
    if (this.settings.sleepingMode !== 'immediate' || !valid()) return;
    await this.discardParkedTabs(id, parking.id, parkingToken, valid);
  }
  async discardParkedTabs(id, parkingId, token, valid) {
    const running = () => valid() && this.settings.sleepingMode === 'immediate';
    // Our own parking tab, still selected. A page created moments ago may not
    // have committed yet (url empty, our address in pendingUrl); that still
    // counts. Navigating it anywhere else does not.
    const parked = w => this.supported(w) && !w.focused &&
      w.tabs.some(t => t.id === parkingId && t.active && this.token(t) === token);
    const snapshot = await this.getWindow(id);
    if (!running() || !parked(snapshot)) return;
    // Snapshot membership once; tabs created after this point wait for a later
    // parking cycle. Eligibility and membership are checked again for each ID.
    const candidates = snapshot.tabs.filter(t => this.real(t)).map(t => t.id);
    for (const tabId of candidates) {
      if (!running() || await this.downloading() || !running()) return;
      const tab = await this.getTab(tabId);
      if (!running()) return;
      const w = await this.getWindow(id);
      if (!running() || !parked(w)) return;
      const current = w.tabs.find(t => t.id === tabId);
      if (!tab || tab.windowId !== id || tab.active || !current || current.windowId !== id || current.active) continue;
      const reason = skipReason(current, this.settings, this.protectedIds);
      if (reason) { this.log('skip tab', tabId, reason); continue; }
      try { await this.api.tabs.discard(tabId); this.log('discarded parked tab', tabId); }
      catch (error) {
        if (error instanceof TypeError) throw error;
        const latest = await this.getTab(tabId);
        // Chrome can discard, move, activate or close a candidate first. Never
        // retry or wake it. A normal refusal affects only this candidate.
        if (!latest || latest.discarded || latest.active || latest.windowId !== id ||
            /Cannot discard tab|No tab with id|Invalid tab ID|Tabs cannot be edited right now/i.test(error.message)) {
          this.log('discard skipped', tabId, error.message); continue;
        }
        throw error;
      }
    }
  }
  async restore(id, epoch = this.epoch) {
    // A target can close between the snapshot and activation. Re-read once and
    // use the same fallback policy; never remove the parking page on failure.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (await this.restoreAttempt(id, epoch)) return true;
      if (this.epoch !== epoch || this.focus !== id) break;
    }
    return false;
  }
  async restoreAttempt(id, epoch) {
    const tabEpoch = this.tabEpoch.get(id) || 0;
    const w = await this.getWindow(id), s = this.adopt(w);
    if (!s?.parked || !w.focused || this.focus !== id || this.epoch !== epoch) return false;
    const target = this.restoreTarget(w, s);
    if (!target) return false;
    // Recheck after async reads; restoring is only allowed in the focused window.
    if (this.epoch !== epoch || this.focus !== id || (this.tabEpoch.get(id) || 0) !== tabEpoch) return false;
    try { await this.api.tabs.update(target.id, {active: true}); }
    catch (error) {
      if (/No tab with id|Invalid tab ID|Tabs cannot be edited right now/i.test(error.message)) return false;
      throw error;
    }
    const confirmed = await this.getWindow(id);
    if (!confirmed?.tabs.some(t => t.id === target.id && t.active && this.real(t))) return false;
    s.parked = false; s.qualified = true; s.lastUse = this.clock.now(); s.retryAt = 0;
    this.log('restored', id, target.id); await this.save();
    await this.cleanupParking(id);
    return true;
  }
  restoreTarget(w, s) {
    const real = w.tabs.filter(t => this.real(t)), record = this.records[s.token];
    return real.find(t => t.active) || real.find(t => t.id === s.previousId) ||
      real.find(t => t.url === record?.url) || real.reduce((best,t) =>
        !best || Math.abs(t.index - (record?.index || 0)) < Math.abs(best.index - (record?.index || 0)) ? t : best, null);
  }
  async forgetRecord(token) {
    if (!token) return;
    const windows = await this.api.windows.getAll({populate: true, windowTypes: ['normal']});
    if (!windows.some(w => this.supported(w) && w.tabs.some(t => this.token(t) === token))) {
      delete this.records[token]; delete this.owners[token];
    }
  }
  async closeParkedTabs() {
    this.shellEpoch++;
    const windows = await this.api.windows.getAll({populate: true, windowTypes: ['normal']});
    const candidates = windows.filter(w => this.supported(w) && w.tabs.some(t => this.token(t)));
    let closed = 0, failed = 0;
    for (const initial of candidates) {
      try {
        let w = await this.getWindow(initial.id), s = this.adopt(w);
        if (!s || !w.tabs.some(t => this.token(t))) continue;
        s.lastUse = this.clock.now(); s.retryAt = 0; s.qualified = false;
        if (this.dwell?.id === w.id) {
          this.clock.clearTimeout(this.dwell.timer); this.dwell = null;
          await this.api.alarms.clear('dwell-recovery');
        }
        await this.save();
        // A bounded retry handles a vanished target or a user selection. Never
        // activate an old saved target over a real tab the user just selected.
        for (let attempt = 0; attempt < 2; attempt++) {
          w = await this.getWindow(initial.id); s = this.adopt(w);
          if (!s || !w.tabs.some(t => this.token(t))) break;
          if (!w.tabs.some(t => this.real(t))) {
            // Explicitly use an existing window and an inert page. This is the
            // only action that creates a real tab, solely to keep this window.
            await this.api.tabs.create({windowId: w.id, active: false, url: 'about:blank'});
            w = await this.getWindow(initial.id); s = this.adopt(w);
            if (!s) break;
          }
          const epoch = this.tabEpoch.get(w.id) || 0, target = this.restoreTarget(w, s);
          if (!target) continue;
          if (!target.active) {
            const live = await this.getTab(target.id);
            if (!live || live.windowId !== w.id || !this.real(live) || (this.tabEpoch.get(w.id) || 0) !== epoch) continue;
            try { await this.api.tabs.update(target.id, {active: true}); }
            catch (error) {
              if (/No tab with id|Invalid tab ID/i.test(error.message)) continue;
              throw error;
            }
          }
          w = await this.getWindow(initial.id);
          // Once activation succeeds, do not wake a second target if the first
          // disappears. Leave cleanup for a later attempt instead.
          if (!this.supported(w) || !w.tabs.some(t => t.active && this.real(t))) break;
          // Remove one verified page at a time; duplicate parking pages and
          // independent failures must not prevent the other pages being handled.
          for (const parking of w.tabs.filter(t => this.token(t))) {
            try { if (await this.cleanupParking(w.id, parking.id)) closed++; }
            catch (error) { failed++; console.error('[Chrome Window Parker] parking cleanup', error); }
          }
          break;
        }
        const final = await this.getWindow(initial.id), state = this.adopt(final);
        if (state) { state.lastUse = this.clock.now(); state.retryAt = 0; }
      } catch (error) {
        if (!/No (tab|window) with id|Invalid (tab|window) ID/i.test(error.message)) {
          failed++; console.error('[Chrome Window Parker] window cleanup', error);
        }
      }
    }
    const live = await this.api.windows.getAll({populate: true, windowTypes: ['normal']});
    const tokens = new Set(live.filter(w => this.supported(w)).flatMap(w => w.tabs.map(t => this.token(t))).filter(Boolean));
    for (const token of Object.keys(this.records)) if (!tokens.has(token)) delete this.records[token];
    for (const token of Object.keys(this.owners)) if (!tokens.has(token)) delete this.owners[token];
    const ids = new Set(live.filter(w => this.supported(w)).map(w => String(w.id)));
    for (const id of Object.keys(this.states)) if (!ids.has(id)) delete this.states[id];
    for (const w of live) this.adopt(w);
    await this.saveRecords(); await this.save(); await this.schedule();
    return {closed, remaining: live.filter(w => this.supported(w)).reduce((n,w) => n + w.tabs.filter(t => this.token(t)).length, 0), failed};
  }
  async cleanupEmptyParked(id) {
    // Natural last-real-tab cleanup is separate from Clear's window-preserving
    // path. Never infer ownership from a URL alone: require live parked identity
    // and a recovery journal for every page. Unknown/orphan tokens fail closed.
    const s = this.states[id];
    if (!s?.parked || !s.token || !this.records[s.token] || this.clearRequests) return false;
    const parkingId = s.parkingId, token = s.token;
    let limit = Infinity, removed = false;
    for (let attempt = 0; attempt < limit; attempt++) {
      const epoch = ++this.shellEpoch, safety = this.safetyEpoch, started = this.clock.now();
      const valid = () => this.shellEpoch === epoch && this.safetyEpoch === safety &&
        !this.clearRequests && this.clock.now() >= started && this.clock.now() - started <= 5000 &&
        ![...this.detachedTabs.values()].includes(id) &&
        this.states[id] === s && s.parked && s.parkingId === parkingId && s.token === token;
      const owned = w => this.supported(w) && w.id === id && w.tabs.length > 0 &&
        w.tabs.every(t => t.windowId === id && this.removable(t) && this.records[this.removable(t)]) &&
        w.tabs.some(t => t.id === parkingId && t.active && this.removable(t) === token);
      const w = await this.getWindow(id);
      if (!valid() || !owned(w)) return removed;
      if (limit === Infinity) limit = w.tabs.length;
      // Keep the active identity until last; each removal gets fresh snapshots.
      const page = w.tabs.find(t => !t.active) || w.tabs[0], pageToken = this.removable(page);
      const fresh = await this.getWindow(id);
      if (!valid() || !owned(fresh) || fresh.tabs.length !== w.tabs.length ||
          !fresh.tabs.every(t => w.tabs.some(old => old.id === t.id && this.removable(old) === this.removable(t))) ||
          !fresh.tabs.some(t => t.id === page.id && this.removable(t) === pageToken)) return removed;
      // Chrome has no conditional remove API; a browser change after this final
      // check can still race the call. Never remove a window or a real tab.
      try { await this.api.tabs.remove(page.id); }
      catch (error) {
        if (/No tab with id|Invalid tab ID|Tabs cannot be edited right now/i.test(error.message)) {
          this.log('empty parking cleanup deferred', id, error.message);
          if (/Tabs cannot be edited/i.test(error.message)) await this.deferCleanup();
          return removed;
        }
        throw error;
      }
      removed = true;
      await this.forgetRecord(pageToken); await this.saveRecords();
      const remaining = await this.getWindow(id);
      if (!remaining) {
        if (this.dwell?.id === id) {
          this.clock.clearTimeout(this.dwell.timer); this.dwell = null;
          await this.api.alarms.clear('dwell-recovery');
        }
        await this.closed(id);
        return true;
      }
      // Do not adopt a newly arrived real tab into this cleanup operation.
      if (!owned(remaining)) return removed;
    }
    return removed;
  }
  async cleanupParking(id, parkingId) {
    this.shellEpoch++;
    const epoch = this.epoch, tabEpoch = this.tabEpoch.get(id) || 0;
    const w = await this.getWindow(id);
    if (!this.supported(w)) return false;
    const active = w.tabs.find(t => t.active && this.real(t));
    const parking = w.tabs.find(t => !t.active && this.removable(t) && (parkingId === undefined || t.id === parkingId));
    if (!active || !parking) return false;
    const token = this.token(parking);
    // Only close our still-inactive page while a real tab is still selected in
    // the same window. Navigation, detach/removal and focus signals cancel this
    // snapshot. Chrome provides no atomic conditional-remove operation.
    const fresh = await this.getWindow(id);
    if (this.epoch !== epoch || (this.tabEpoch.get(id) || 0) !== tabEpoch ||
        !this.supported(fresh) || fresh.tabs.length < 2 ||
        !fresh.tabs.some(t => t.id === active.id && t.active && this.real(t)) ||
        !fresh.tabs.some(t => t.id === parking.id && !t.active && this.removable(t) === token)) return false;
    try { await this.api.tabs.remove(parking.id); }
    catch (error) {
      if (/No tab with id|Invalid tab ID|Tabs cannot be edited right now/i.test(error.message)) {
        this.log('parking cleanup deferred', id, error.message);
        if (/Tabs cannot be edited/i.test(error.message)) await this.deferCleanup();
        return false;
      }
      throw error;
    }
    await this.forgetRecord(token);
    const s = this.states[id];
    if (s?.parkingId === parking.id) { s.parkingId = null; s.token = null; s.parked = false; }
    await this.saveRecords(); await this.save();
    return true;
  }
  async cleanupStray(id) {
    // A parking page belongs to the window it was made for. One dragged or moved
    // into another window (alone, or among real tabs) has no job there: remove
    // it, never adopt it. Ownership must be known and journaled, and each removal
    // needs two fresh snapshots; any tab event cancels it and Clear goes first.
    const stray = t => {
      const token = this.removable(t);
      return !!token && t.windowId === id && !!this.records[token] && token in this.owners &&
        this.owners[token] !== id && !this.detachedTabs.has(t.id);
    };
    let removed = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const epoch = ++this.shellEpoch, started = this.clock.now();
      const valid = () => this.shellEpoch === epoch && !this.clearRequests &&
        this.clock.now() >= started && this.clock.now() - started <= 5000;
      const w = await this.getWindow(id), page = this.supported(w) && !this.clearRequests ? w.tabs.find(stray) : null;
      if (!page) return removed;
      const token = this.removable(page), fresh = await this.getWindow(id);
      if (!valid() || !this.supported(fresh) || !fresh.tabs.some(t => t.id === page.id && stray(t) && this.removable(t) === token)) {
        // A newer event may not look for moved pages itself; check again shortly.
        if (!this.clearRequests) await this.deferCleanup();
        return removed;
      }
      try { await this.api.tabs.remove(page.id); }
      catch (error) {
        if (/Tabs cannot be edited right now/i.test(error.message)) {
          this.log('moved parking page cleanup deferred', id, error.message); await this.deferCleanup(); return removed;
        }
        if (/No tab with id|Invalid tab ID/i.test(error.message)) return removed;
        throw error;
      }
      removed = true; this.log('removed parking page moved from window', this.owners[token], 'to', id);
      await this.forgetRecord(token); await this.saveRecords(); await this.save();
      if (!await this.getWindow(id)) {
        // That page was all the window held, so Chrome closed it.
        if (this.dwell?.id === id) {
          this.clock.clearTimeout(this.dwell.timer); this.dwell = null;
          await this.api.alarms.clear('dwell-recovery');
        }
        await this.closed(id);
        return true;
      }
    }
    return removed;
  }
  async deferCleanup() {
    // Chrome refuses tab edits while a tab is being dragged, and nothing fires
    // when the drag ends. Check again shortly (bounded), with an alarm as the
    // fallback if this worker stops in the meantime.
    this.deferred = true;
    if (this.retryTimer === null && this.retries < 240) {
      this.retries++;
      this.retryTimer = this.clock.setTimeout(() => { this.retryTimer = null; return this.dispatch(() => this.tidy()); }, 500);
    }
    await this.api.alarms.create('cleanup-retry', {when: this.clock.now() + 30000});
  }
  async tidy() {
    // Parking-page cleanup only: moved pages, empty parked windows and stale
    // pages beside a selected real tab. Never parks, restores or discards.
    this.deferred = false;
    const windows = await this.api.windows.getAll({populate: true, windowTypes: ['normal']});
    for (const w of windows) {
      const s = this.adopt(w);
      if (!s) continue;
      await this.cleanupStray(w.id);
      if (s.parked) await this.cleanupEmptyParked(w.id);
      else if (s.parkingId) await this.cleanupParking(w.id);
    }
    if (!this.deferred) { this.retries = 0; await this.api.alarms.clear('cleanup-retry'); }
    await this.save(); await this.schedule();
  }
  async activated(id, tabId) {
    const w = await this.getWindow(id), s = this.adopt(w);
    const active = w?.tabs?.find(t => t.active);
    if (!s || !active || active.id !== tabId) return;
    if (this.real(active)) {
      s.parked = false; s.previousId = active.id;
      // Activation in a background window may be another extension; be conservative.
      s.lastUse = this.clock.now(); s.retryAt = 0;
      if (w.focused && this.focus === id) {
        s.qualified = true;
        if (this.dwell) this.clock.clearTimeout(this.dwell.timer);
        this.dwell = null; await this.api.alarms.clear('dwell-recovery');
      }
      await this.cleanupParking(id);
    } else if (w.focused && !this.dwell) await this.startDwell();
    await this.save(); await this.schedule();
  }
  async removed(tabId, info) {
    this.protectedIds = this.protectedIds.filter(id => id !== tabId);
    const s = this.states[info.windowId];
    if (s) {
      if (s.previousId === tabId) s.previousId = null;
      if (s.parkingId === tabId) {
        await this.forgetRecord(s.token); s.parkingId = null; s.token = null; s.parked = false;
        s.lastUse = this.clock.now(); await this.saveRecords();
      }
    }
    // A parking page that left its window and then closed (before its cleanup)
    // no longer belongs to any window's state: drop its journal too.
    const orphans = Object.keys(this.owners).filter(token => !Object.values(this.states).some(st => st.token === token));
    for (const token of orphans) await this.forgetRecord(token);
    if (orphans.length) await this.saveRecords();
    if (!info.isWindowClosing) await this.cleanupEmptyParked(info.windowId);
    await this.save(); await this.schedule();
  }
  async closed(id) {
    const s = this.states[id];
    if (s?.token) await this.forgetRecord(s.token);
    delete this.states[id]; this.tabEpoch.delete(id); this.selectionEpoch.delete(id);
    for (const [tabId, source] of this.detachedTabs) if (source === id) this.detachedTabs.delete(tabId);
    await this.saveRecords(); await this.save(); await this.schedule();
  }
  async configure(input, shown, customized) {
    // `shown` is what the Settings page (or popup) showed. Only fields changed
    // from it are applied, so a value that changed meanwhile (by sync or another
    // page) is not overwritten with a stale copy.
    const previous = this.settings;
    const settings = validateSettings(shown ? {...previous, ...Object.fromEntries(Object.entries(input)
      .filter(([key, value]) => !sameValue(value, shown[key])))} : input);
    const changed = SYNCABLE.filter(key => !sameValue(settings[key], previous[key]));
    // A syncable value changed here is this device's own choice, even when it
    // returns to its default (15 -> 30 -> 15 stays chosen). See reset().
    customized ??= {...this.customized, ...Object.fromEntries(changed.map(key => [key, true]))};
    await this.api.storage.local.set({settings, customized});
    this.customized = customized;
    this.signalFocus(this.focus); this.settings = settings;
    for (const s of Object.values(this.states)) s.retryAt = 0;
    await this.startDwell(); await this.save(); await this.schedule();
    await this.pushSync(changed);
    return settings;
  }
  async reset() {
    // Restore defaults on this device only: stop syncing here first, so shared
    // values (and other devices) are left alone. Afterwards nothing counts as
    // chosen here, as on a new installation, so turning sync on adopts shared values.
    await this.setPolicy(syncFlags());
    const settings = await this.configure({...DEFAULTS}, undefined, syncFlags());
    this.syncNotice = null;
    return settings;
  }
  async setAppearance(appearance) {
    // A header control that applies immediately. Presentation only, so it never
    // interrupts parking work the way other settings changes do.
    const settings = validateSettings({...this.settings, appearance});
    if (sameValue(settings, this.settings)) return settings;
    await this.applySettings(settings, true); await this.pushSync(['appearance']);
    return this.settings;
  }
  // Apply settings that did not come from the Settings form, with the same
  // runtime semantics as an equivalent change there: the header theme (chosen
  // here) or synced values (not chosen here: a synced value that replaces this
  // device's value is no longer this device's own choice).
  async applySettings(next, chosen) {
    const changed = Object.keys(next).filter(key => !sameValue(next[key], this.settings[key]));
    if (!changed.length) return;
    const customized = {...this.customized};
    for (const key of changed) if (key in customized) customized[key] = chosen;
    await this.api.storage.local.set({settings: next, customized}); this.customized = customized;
    if (changed.every(key => key === 'appearance')) { this.settings = next; return; }
    this.signalFocus(this.focus); this.settings = next;
    for (const s of Object.values(this.states)) s.retryAt = 0;
    await this.startDwell(); await this.save(); await this.schedule();
  }

  // Optional sync. Local settings always stay authoritative for everyday work;
  // Chrome sync only mirrors the portable settings this device opted into, one
  // key per setting, so devices that share different subsets never collide.
  syncReason(error) {
    const text = String(error?.message || error);
    return /QUOTA_?BYTES/i.test(text) ? 'too-large' : /MAX_?WRITE_?OPERATIONS/i.test(text) ? 'too-often' : 'unavailable';
  }
  async readSync(keys) {
    try { return await this.api.storage.sync.get(keys); }
    catch (error) { if (error instanceof TypeError) throw error; this.log('sync read failed', error.message); return null; }
  }
  async writeSync(keys) {
    try { await this.api.storage.sync.set(Object.fromEntries(keys.map(key => [key, this.settings[key]]))); return null; }
    catch (error) { if (error instanceof TypeError) throw error; this.log('sync write failed', error.message); return this.syncReason(error); }
  }
  // Share this device's values one setting at a time, so a refusal (a site list
  // over Chrome's size limit, say) affects only that setting. Returns refusals.
  async share(keys) {
    const failed = [];
    for (const key of keys) { const reason = await this.writeSync([key]); if (reason) failed.push({key, reason}); }
    return failed;
  }
  // A synced value goes through normal validation. Undefined: nothing shared.
  // Null: malformed, or from a version this one does not understand.
  validSynced(key, value) {
    if (value === undefined) return undefined;
    try { return validateSettings({...this.settings, [key]: value})[key]; } catch { return null; }
  }
  async setPolicy(policy) {
    const next = syncFlags(policy);
    await this.api.storage.local.set({syncPolicy: next});
    this.policy = next;
    return {policy: this.policy, settings: this.settings};
  }
  // Share local changes to opted-in settings. If Chrome refuses (for example a
  // very long site list), keep the value here and stop syncing that setting.
  async pushSync(keys) {
    const failed = await this.share(keys.filter(key => this.policy[key]));
    if (!failed.length) return true;
    this.syncNotice = failed;
    await this.setPolicy({...this.policy, ...Object.fromEntries(failed.map(({key}) => [key, false]))});
    return false;
  }
  // Called synchronously by the worker: does a sync change affect this device?
  syncRelevant(changes) {
    return !this.loaded || SYNCABLE.some(key => this.policy[key] && changes[key]?.newValue !== undefined &&
      !sameValue(changes[key].newValue, this.settings[key]));
  }
  async syncChanged(changes) {
    let next = this.settings;
    for (const key of SYNCABLE) {
      if (!this.policy[key] || !changes[key]) continue;
      const value = this.validSynced(key, changes[key].newValue);
      if (value === null) this.log('ignored invalid synced value', key);
      else if (value !== undefined) next = {...next, [key]: value};
    }
    await this.applySettings(next, false);
  }
  // At startup, apply changes that arrived while no worker was listening, and
  // share opted-in values that are missing (for example after sync data reset).
  async pullSync() {
    const keys = SYNCABLE.filter(key => this.policy[key]);
    if (!keys.length) return;
    const values = await this.readSync(keys);
    if (!values) return;
    await this.pushSync(keys.filter(key => values[key] === undefined));
    await this.syncChanged(Object.fromEntries(keys.map(key => [key, {newValue: values[key]}])));
  }
  syncKeys(keys) {
    if (!Array.isArray(keys) || !keys.every(key => SYNCABLE.includes(key))) throw new Error('This setting does not sync.');
    return keys;
  }
  // Turn sync on for some settings: one, a group, or all. Those already syncing
  // are left alone. For each of the others: with nothing shared yet, this
  // device's value is shared; an equal shared value simply turns on; a different
  // shared value is used, unless this device's value was chosen here or the
  // shared value can't be used, which needs the user's choice. Every choice is
  // asked together and nothing changes until all are made. `choices` answers
  // them ({key: {use, local, synced}}); an answer counts only while both values
  // are still the ones the user was shown.
  async syncEnable(keys, choices) {
    keys = this.syncKeys(keys).filter(key => !this.policy[key]);
    const values = keys.length ? await this.readSync(keys) : {};
    if (!values) return {status: 'error', reason: 'unavailable'};
    // Keep the original unusable value in a conflict too: two different future
    // values both validate to null, but an old answer must not overwrite the newer one.
    const adopt = {}, share = [], mine = [], on = [], conflicts = [];
    for (const key of keys) {
      const local = this.settings[key], synced = this.validSynced(key, values[key]), choice = choices?.[key];
      if (synced === undefined) share.push(key);
      else if (sameValue(synced, local)) on.push(key);
      else if (synced !== null && !this.customized[key]) adopt[key] = synced;
      else if (!choice || !sameValue(choice.local, local) || !sameValue(choice.synced, synced) ||
        (synced === null && !sameValue(choice.unusable, values[key])))
        conflicts.push({key, local, synced, ...(synced === null ? {unusable: values[key]} : {})});
      else if (choice.use === 'synced' && synced !== null) adopt[key] = synced;
      else if (choice.use === 'local') { share.push(key); mine.push(key); }
      else if (choice.use !== 'off') throw new Error('Choose which value to keep.');
    }
    if (conflicts.length) return {status: 'conflict', conflicts};
    if (Object.keys(adopt).length) await this.applySettings({...this.settings, ...adopt}, false);
    // Keeping this device's value over a synced one is a choice made here.
    if (mine.some(key => !this.customized[key])) {
      const customized = {...this.customized, ...Object.fromEntries(mine.map(key => [key, true]))};
      await this.api.storage.local.set({customized}); this.customized = customized;
    }
    const failed = await this.share(share), shared = share.filter(key => !failed.some(f => f.key === key));
    const enabled = [...on, ...Object.keys(adopt), ...shared];
    return {status: 'on', failed, ...await this.setPolicy({...this.policy, ...Object.fromEntries(enabled.map(key => [key, true]))})};
  }
  // Keeps the current values here and leaves shared values for other devices.
  async syncDisable(keys) {
    keys = this.syncKeys(keys);
    return {status: 'off', ...await this.setPolicy({...this.policy, ...Object.fromEntries(keys.map(key => [key, false]))})};
  }
  async message(msg, sender) {
    if (!msg || typeof msg.type !== 'string') throw new Error('Invalid message.');
    if (sender.id !== this.api.runtime.id) throw new Error('Invalid sender.');
    const page = sender.url?.split(/[?#]/)[0];
    if (![this.parkingURL, this.api.runtime.getURL('options.html'), this.api.runtime.getURL('popup.html')].includes(page))
      throw new Error('Unsupported page.');
    const isParking = page === this.parkingURL;
    if (isParking) {
      if (!['restore', 'parked-info'].includes(msg.type)) throw new Error('Unsupported parking action.');
      const tab = await this.getTab(sender.tab?.id);
      if (!this.token(tab) || (sender.url.includes('#') && this.token(tab) !== sender.url.split('#')[1])) return {gone: true};
      if (msg.type === 'restore') { const restored = await this.restore(tab.windowId); await this.schedule(); return {restored}; }
      if (msg.type === 'parked-info') {
        const w = await this.getWindow(tab.windowId), record = this.records[this.token(tab)];
        return {windowId: tab.windowId, title: record?.title || 'Your previous tab', url: record?.url || '',
          sleeping: w?.tabs.filter(t => this.real(t) && t.discarded).length || 0, enabled: this.settings.enabled,
          dwellSeconds: this.settings.dwellSeconds};
      }
      throw new Error('Unsupported parking action.');
    }
    if (msg.type === 'settings') return this.settings;
    if (msg.type === 'configure') return this.configure(msg.settings, msg.shown);
    if (msg.type === 'appearance') return this.setAppearance(msg.appearance);
    if (msg.type === 'reset') return this.reset();
    if (msg.type === 'sync-state') {
      const notice = this.syncNotice; this.syncNotice = null;
      return {policy: this.policy, notice};
    }
    if (msg.type === 'sync-enable') return this.syncEnable(msg.keys, msg.choices);
    if (msg.type === 'sync-disable') return this.syncDisable(msg.keys);
    if (msg.type === 'close-parked') return this.closeParkedTabs();
    if (msg.type === 'protect') {
      if (typeof msg.protected !== 'boolean') throw new Error('Invalid tab protection.');
      const tab = await this.getTab(msg.tabId);
      if (!tab || tab.incognito || !this.real(tab)) throw new Error('Choose a regular tab.');
      this.protectedIds = this.protectedIds.filter(id => id !== tab.id);
      if (msg.protected) this.protectedIds.push(tab.id);
      await this.save(); return {protected: msg.protected};
    }
    if (msg.type === 'status') {
      const windows = await this.api.windows.getAll({populate: true, windowTypes: ['normal']});
      const supported = windows.filter(w => this.supported(w));
      const current = supported.find(w => w.focused)?.tabs.find(t => t.active && this.real(t));
      return {enabled: this.settings.enabled,
        parkingTabs: supported.reduce((n,w) => n + w.tabs.filter(t => this.token(t)).length, 0),
        currentTab: current ? {id: current.id, protected: this.protectedIds.includes(current.id)} : null,
        ...(msg.includeTabs ? {protectedIds: this.protectedIds,
          tabs: supported.flatMap(w => w.tabs.filter(t => this.real(t)).map(t =>
            ({id: t.id, windowId: w.id, title: t.title || t.url || 'Tab'})))} : {}),
        windows: supported.map(w => ({id: w.id, parked: !!w.tabs.find(t => t.active && this.token(t)),
          sleeping: w.tabs.filter(t => this.real(t) && t.discarded).length}))};
    }
    throw new Error('Unknown action.');
  }
}
