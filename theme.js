// Runs in the head on every extension page, before its content is painted.
(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'auto', revision = 0;
  const apply = value => {
    preference = ['auto', 'light', 'dark'].includes(value) ? value : 'auto';
    root.dataset.theme = preference === 'auto' ? (system.matches ? 'dark' : 'light') : preference;
    delete root.dataset.themePending;
  };
  root.dataset.themePending = '';
  const changed = (changes, area) => {
    if (area === 'local' && changes.settings) { revision++; apply(changes.settings.newValue?.appearance); }
  };
  const systemChanged = () => { if (preference === 'auto') apply('auto'); };
  chrome.storage.onChanged.addListener(changed);
  system.addEventListener('change', systemChanged);
  chrome.storage.local.get('settings').then(({settings}) => {
    if (!revision) apply(settings?.appearance);
  }).catch(() => { if (!revision) apply('auto'); });
  window.addEventListener('pagehide', () => {
    chrome.storage.onChanged.removeListener(changed);
    system.removeEventListener('change', systemChanged);
  }, {once: true});
})();
