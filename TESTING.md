# Testing

## Automated tests

Requires Node 20+ and Python 3. The extension has no external runtime dependencies.

```sh
npm test
```

The suite covers parking and restoration, both sleeping modes, settings validation and migration, exclusions, tab/window preservation, Clear parked tabs, and recovery after worker or browser restarts. Race tests exercise focus changes, moved or closed tabs, new downloads, delayed API calls, Chrome refusals, and interrupted discard batches.

Key invariants:

- **Let Chrome decide** never calls the discard API.
- **Discard immediately** considers every loaded eligible real tab in a newly parked window. Each candidate is revalidated; invalidated work stops and is not replayed after a restart.
- **Leaving a genuinely used window** starts a full inactivity interval, even when that focus change wakes a stopped worker before its state loads. Brief visits still do not count as use.
- **Natural last-real-tab removal** removes only a verified parking shell; a remaining real tab or unresolved transfer prevents cleanup. Clear retains its separate window-preserving behavior.
- **Clear parked tabs** starts no discards and restores at most one real tab per affected window, including when its original target disappears. Creating a blank tab to preserve a parking-only window must not trigger discards elsewhere.

UI tests cover the Settings order and grouping, the three-state theme control, individual-tab protection in its scrollable list, Auto/Light/Dark, cross-page preference changes, initial-read races, page teardown and support navigation. Support tests check deliberate pointer/keyboard activation, the fixed destination, duplicate-click guards, recoverable errors, and absence of automatic navigation. Packaging checks cover module references, icons, permissions and CSP.

## UI preview and packaging

```sh
npm run preview
```

The preview runs at `http://127.0.0.1:8765` and serves allowlisted files with simulated extension APIs and synthetic tabs. Add `?system=light` or `?system=dark` to preview pages to test Auto appearance. Use it for layout and interaction work; native tab behavior needs an installed extension.

```sh
python3 scripts/package.py
```

This writes a runtime-only ZIP and checksum to `dist/`, checking the explicit file allowlist, references, versions, permissions, icon sizes and ZIP integrity. To check packaging changes, extract the ZIP into a separate folder and load that folder in Chrome.

## Manual Chrome checks

Use a disposable normal profile with saved test work. Record the extension, Chrome and OS versions. Start with a one-minute custom parking delay and two-second return delay, then repeat with the default 15-minute delay. Close service-worker DevTools during suspension and sleep/wake tests; an attached inspector changes worker lifetime.

1. **Install and settings.** Load the extracted package through `chrome://extensions`. Check the Errors page and worker console. Verify the toolbar icon, popup layout and full product name. Save settings, reopen them, and check persistence. Reset should restore Let Chrome decide, Auto, 15 minutes and 2 seconds.
2. **Chrome-managed sleeping.** Leave a normal window unfocused until it parks. Its saved real tab must remain present. Chrome controls unloading, so the sleeping-tab count need not rise immediately, even with Memory Saver enabled.
3. **Immediate sleeping.** Park a window containing several loaded eligible tabs. Each should receive a discard attempt. Repeat with a reloaded tab and pinned, audible, excluded, session-protected and already-discarded neighbors. Return mid-batch or change settings; remaining requests must stop. Chrome may refuse individual requests.
4. **Restoration.** Return for less than the configured dwell, then leave: the window should stay parked. Stay for the full dwell: only the saved tab should become selected, reloading only if unloaded, and its parking page should close. Test Restore tab, manual real-tab selection, a closed saved target and a removed parking page. Close or move the final real tab from a parked window: its verified parking shell should disappear, with the destination untouched. Repeat with another real tab remaining, duplicate parking pages, a drag back to the source and worker interruption between detach and attach.
5. **Clear.** Clear several parked windows, both enabled and paused. Check zero new discard requests, at most one restored real tab per window, unchanged background tab states, preserved windows and pause setting, and a fresh inactivity interval. Test parking-only windows, duplicate or inactive parking pages, a disappearing restore target and a tab being dragged.
6. **Focus and window preservation.** Test one-tab and ten-window sessions. Check tab order, pins, groups, window positions and macOS Spaces. Pass briefly through several Spaces, then stop: only the final window should restore after dwell. Parking while another app is frontmost must not focus Chrome or change Spaces.
7. **Protections and downloads.** Save `meet.google.com` as a plain domain and expand Advanced URL patterns. Check that a selected excluded tab blocks only its own window, while an excluded background tab permits parking and is skipped in Discard immediately. Test pinned/audio tabs, selected internal pages and pause/resume. An active Chrome download must pause parking across all windows; parking should resume after it finishes. Explicitly exclude call, capture, video and editing tests where Chrome has no reliable safety signal.
8. **Recovery.** Test natural worker termination, extension reload/update, browser restart with session restore, disabling/re-enabling with parked windows, and macOS sleep/wake. Interrupted dwell must restart; interrupted discard batches must not resume. With every other window parked, stay in one window longer than the parking delay without switching tabs, let the worker stop, then leave: that window must not park before a full delay. Check that no mass restore or replacement windows are requested. Chrome may reload pages during its own startup.
9. **Appearance and Settings layout.** Use the header theme control by mouse and keyboard, save, and check Auto, Light and Dark across Settings, popup and parking pages. Open Protect individual tabs with many tabs: the list scrolls inside its panel and the page stays short. Change the system theme with Auto pages open and verify cross-page updates and readable controls.
10. **Support and networking.** Test each Support action by mouse and keyboard in the installed extension: one normal tab should open to `https://buymeacoffee.com/montybwolfe`. Rapid repeats must not multiply tabs. Opening extension pages or installing/updating must not trigger external navigation. The parked page has no support content. Inspect network activity: extension pages load packaged resources only; restored websites and deliberately opened support pages make their own normal requests.

For memory comparisons, use the same pages, timing and workload with Memory Saver alone and with Chrome Window Parker. Record the sleeping mode and loaded/discarded states. The [behavior documentation](docs/BEHAVIOR.md#verify-memory-reduction) describes the measurement procedure; no fixed memory savings are assumed.

## Platform status

Testing to date has used macOS for automated tests and Chrome UI previews. Installed-extension behavior is covered by the manual checks above. Windows, Linux and ChromeOS have not yet been formally verified.
