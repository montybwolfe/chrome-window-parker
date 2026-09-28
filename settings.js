export const DEFAULTS = Object.freeze({
  enabled: true, delayMinutes: 15, dwellSeconds: 2, discardPinned: false,
  protectAudio: true, debug: false,
  exclusions: ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'music.youtube.com']
});

export function validateSettings(input) {
  const s = {...DEFAULTS, ...input};
  for (const key of ['enabled', 'discardPinned', 'protectAudio', 'debug']) {
    if (typeof s[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
  }
  if (!Number.isFinite(s.delayMinutes) || s.delayMinutes < 1 || s.delayMinutes > 10080)
    throw new Error('Parking delay must be between 1 minute and 7 days.');
  if (!Number.isFinite(s.dwellSeconds) || s.dwellSeconds < 0.5 || s.dwellSeconds > 20)
    throw new Error('Focus dwell must be between 0.5 and 20 seconds.');
  if (!Array.isArray(s.exclusions) || s.exclusions.length > 200)
    throw new Error('Use at most 200 exclusions.');
  s.exclusions = [...new Set(s.exclusions.map(line => {
    if (typeof line !== 'string') throw new Error('Exclusions must be text.');
    const rule = line.trim();
    if (!rule || rule.length > 1000 || /\s/.test(rule)) throw new Error('Invalid exclusion.');
    if (!rule.includes('://') && !/^(\*\.)?[a-z0-9.-]+(?::\d+)?$/i.test(rule))
      throw new Error(`Use a domain or full URL glob: ${rule}`);
    if (rule.includes('://') && !/^(https?|\*):\/\/[^/]+(?:\/.*)?$/i.test(rule))
      throw new Error(`Use an http(s) URL glob: ${rule}`);
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
