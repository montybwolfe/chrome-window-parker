// Only popup/Settings import this module. No worker/startup hooks or networking.
export const SUPPORT_URL = 'https://buymeacoffee.com/montybwolfe';
export const ISSUES_URL = 'https://github.com/montybwolfe/chrome-window-parker/issues';
// Opens one fixed page in a new tab, only after a deliberate click or key press.
// Nothing about your tabs or browsing is added to the address.
export function bindLink(button, url, onError) {
  let opening = false, lastAttempt = -Infinity;
  button.addEventListener('click', async event => {
    // Native buttons support mouse, Enter and Space. Ignore scripted clicks,
    // the second click of a double-click, and rapid keyboard/pointer repeats.
    const now = performance.now();
    if (!event.isTrusted || event.detail > 1 || opening || now - lastAttempt < 1000) return;
    opening = true; lastAttempt = now; button.disabled = true;
    try { await chrome.tabs.create({url, active: true}); }
    catch (error) { onError(error); }
    finally { opening = false; button.disabled = false; }
  });
}
export const bindSupport = (button, onError) => bindLink(button, SUPPORT_URL, onError);
export const bindIssues = (button, onError) => bindLink(button, ISSUES_URL, onError);
