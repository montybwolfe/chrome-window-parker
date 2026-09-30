export const DEFAULTS = Object.freeze({
  enabled: true, delayMinutes: 15, dwellSeconds: 2, discardPinned: false,
  protectAudio: true, debug: false, sleepingMode: 'chrome', appearance: 'auto',
  // Already in Sort A–Z order without repeats, so Clean up changes nothing here.
  exclusions: ['meet.google.com', 'music.youtube.com', 'teams.microsoft.com', 'zoom.us']
});

// Portable preferences that may sync, each opted in separately on each device.
// Pausing, debug logging and all window/tab state always stay on this device.
export const SYNCABLE = Object.freeze(['delayMinutes', 'dwellSeconds', 'sleepingMode', 'discardPinned',
  'protectAudio', 'exclusions', 'appearance']);
// One true/false per syncable setting, used for this device's sync choices and
// for which values were chosen on this device. Missing or invalid means false.
export function syncFlags(input) {
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
    if (rule.includes('://') ? !/^(https?|\*):\/\/[^/]+(?:\/.*)?$/i.test(rule) : !/^(\*\.)?[a-z0-9.-]+(?::\d+)?$/i.test(rule))
      throw new Error(`“${rule}” isn’t a website. Enter one such as example.com, or a full address such as https://example.com/work/*.`);
    return rule;
  }))];
  return Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, s[k]]));
}

// A pasted home-page address becomes the plain website it names, which covers
// the whole site: https://www.example.com/ -> www.example.com, and
// http://localhost:3000/ -> localhost:3000. Anything more specific (a path,
// query, #, *, sign-in details or non-ASCII text) is returned as it was.
export function simplifyRule(text) {
  const rule = text.trim(), match = /^(https?):\/\/([a-z0-9.-]+)(?::(\d+))?\/?$/i.exec(rule);
  if (!match) return rule;
  const [, scheme, host, port] = match;
  const standard = port === undefined || Number(port) === (scheme.toLowerCase() === 'https' ? 443 : 80);
  return host.toLowerCase() + (standard ? '' : `:${port}`);
}

// Sort A–Z for excluded sites: by website first, ignoring a leading http://,
// https:// or *:// (and *.), then by the rest of the address, ignoring case.
// The exact text breaks ties, so the result never depends on the input order.
export function compareRules(a, b) {
  const parts = rule => {
    const rest = rule.replace(/^(?:https?|\*):\/\//i, '').replace(/^\*\./, '').toLowerCase(), slash = rest.indexOf('/');
    return slash < 0 ? [rest, ''] : [rest.slice(0, slash), rest.slice(slash)];
  };
  const order = (x, y) => x < y ? -1 : x > y ? 1 : 0;
  const [x, y] = [parts(a), parts(b)];
  return order(x[0], y[0]) || order(x[1], y[1]) || order(a, b);
}

// Clean up for excluded sites: Sort A–Z, then keep one of any entries that
// repeat each other, so exactly the same pages stay excluded. Websites (no ://)
// repeat when they differ only in capitals or a leading *., which matching
// ignores too; the plainest spelling stays. A home address such as
// https://example.com/ repeats a listed example.com, which already covers it.
// Any other full address repeats only when identical: capitals, paths, ports
// and * count there, and www. or another subdomain is always a different site.
export function cleanUpRules(rules) {
  const site = rule => rule.includes('://') ? '' : rule.toLowerCase().replace(/^\*\./, '');
  const sites = new Set(rules.map(site).filter(Boolean)), kept = new Map();
  for (const rule of rules.toSorted(compareRules)) {
    if (rule.includes('://') && sites.has(simplifyRule(rule))) continue;
    const key = site(rule) || rule;
    if (!kept.has(key) || rule === key) kept.set(key, rule);
  }
  return [...kept.values()].toSorted(compareRules);
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
