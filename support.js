// Only popup/Settings import this module. No worker/startup hooks or networking.
export const SUPPORT_URL = 'https://buymeacoffee.com/montybwolfe';
export function bindSupport(button, onError) {
  let opening = false, lastAttempt = -Infinity;
  button.addEventListener('click', async event => {
    // Native buttons support mouse, Enter and Space. Ignore scripted clicks,
    // the second click of a double-click, and rapid keyboard/pointer repeats.
    const now = performance.now();
    if (!event.isTrusted || event.detail > 1 || opening || now - lastAttempt < 1000) return;
    opening = true; lastAttempt = now; button.disabled = true;
    try { await chrome.tabs.create({url: SUPPORT_URL, active: true}); }
    catch (error) { onError(error); }
    finally { opening = false; button.disabled = false; }
  });
}
