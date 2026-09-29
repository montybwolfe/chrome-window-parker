export const DEFAULTS = Object.freeze({
  enabled: true, delayMinutes: 15, dwellSeconds: 2, discardPinned: false,
  protectAudio: true, debug: false, sleepingMode: 'chrome', appearance: 'auto',
  exclusions: ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'music.youtube.com']
});

// Portable preferences that may sync, each opted in separately on each device.
// Pausing, debug logging and all window/tab state always stay on this device.
export const SYNCABLE = Object.freeze(['delayMinutes', 'dwellSeconds', 'sleepingMode', 'discardPinned',
  'protectAudio', 'exclusions', 'appearance']);
export function syncPolicy(input) {
  return Object.fromEntries(SYNCABLE.map(key => [key, input?.[key] === true]));
}
export const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function validateSettings(input) {
  const s = {...DEFAULTS, ...input};
  for (const key of ['enabled', 'discardPinned', 'protectAudio', 'debug']) {
    if (typeof s[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
  }
  if (!['chrome', 'immediate'].includes(s.sleepingMode)) throw new Error('Choose how tabs sleep.');
  if (!['auto', 'light', 'dark'].includes(s.appearance)) throw new Error('Choose a theme: light, dark or auto.');
  if (!Number.isFinite(s.delayMinutes) || s.delayMinutes < 1 || s.delayMinutes > 10080)
    throw new Error('The parking delay must be between 1 minute and 7 days.');
  if (!Number.isFinite(s.dwellSeconds) || s.dwellSeconds < 0.5 || s.dwellSeconds > 20)
    throw new Error('The restore delay must be between 0.5 and 20 seconds.');
  if (!Array.isArray(s.exclusions) || s.exclusions.length > 200)
    throw new Error('You can exclude up to 200 sites.');
  s.exclusions = [...new Set(s.exclusions.map(line => {
    if (typeof line !== 'string') throw new Error('Excluded sites must be text.');
    const rule = line.trim();
    if (!rule || rule.length > 1000 || /\s/.test(rule)) throw new Error('Put one site on each line, without spaces.');
    if (!rule.includes('://') && !/^(\*\.)?[a-z0-9.-]+(?::\d+)?$/i.test(rule))
      throw new Error(`Use a domain such as example.com, or a full address: ${rule}`);
    if (rule.includes('://') && !/^(https?|\*):\/\/[^/]+(?:\/.*)?$/i.test(rule))
      throw new Error(`Use an address starting with http:// or https://: ${rule}`);
    return rule;
  }))];
  return Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, s[k]]));
}

export function matchesRule(url, rule) {
  try {
    const parsed = new URL(url);
    if (!rule.includes('://')) {
      const host = rule.toLowerCase().replace(/^\*\./, '');
      return parsed.host.toLowerCase() === host || parsed.host.toLowerCase().endsWith(`.${host}`);
    }
    // Globs are deliberately simple: only * is special; everything else is literal.
    const expression = rule.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`^${expression}$`).test(url);
  } catch { return false; }
}

export function skipReason(tab, settings, protectedIds = []) {
  if (!tab || tab.incognito) return 'private or missing tab';
  if (tab.discarded) return 'already discarded';
  if (!/^https?:\/\//.test(tab.url || '')) return 'internal, extension, or non-web page';
  if (tab.pendingUrl || tab.status === 'loading') return 'navigation in progress';
  if (tab.autoDiscardable !== true) return 'not auto-discardable';
  if (tab.pinned && !settings.discardPinned) return 'pinned';
  if (tab.audible && settings.protectAudio) return 'audio playing';
  if (Number.isInteger(tab.splitViewId) && tab.splitViewId >= 0) return 'split view';
  if (protectedIds.includes(tab.id)) return 'individual exclusion';
  if (settings.exclusions.some(rule => matchesRule(tab.url, rule))) return 'URL exclusion';
  return null;
}

// Old installations acquire the new defaults; invalid stored enum values use
// conservative defaults without discarding the user's other preferences.
export function storedSettings(input = {}) {
  return validateSettings({...input,
    sleepingMode: ['chrome', 'immediate'].includes(input.sleepingMode) ? input.sleepingMode : 'chrome',
    appearance: ['auto', 'light', 'dark'].includes(input.appearance) ? input.appearance : 'auto'});
}
