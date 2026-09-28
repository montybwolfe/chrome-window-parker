# Testing

Validation date: 28 September 2026. Version 1.4.1.

## v1.4.1 popup checks

The popup renders in Chrome at 360 × 311 CSS pixels before status messages, with 36px action buttons. The title, controls, stats note and footer fit on one line. Synthetic-fixture checks cover Protect/Unprotect, Pause/Resume, keyboard clearing while paused, counter refresh and the disabled Clear state; no page-console errors were observed. The 128px header icon remains displayed at 28 CSS pixels for Retina resolution. Native installed-toolbar presentation still requires a manual check.

This patch changes popup layout and wording only. The parking engine, background worker, permissions and data handling are unchanged from v1.4.0.

## Coverage

**103 automated tests pass** with Node 24.19.0. Coverage includes settings persistence, worker queue and native timer receivers, parking and restoration races, Memory Saver coexistence, restart recovery, bulk close, window preservation and popup state.

Bulk-close tests cover paused automation, inactive leftovers, duplicate pages, parking-only windows, manual selections, missing targets/windows, navigation, transient and unexpected API failures, fresh inactivity intervals and record cleanup. The background queue is exercised with its own creation, activation and removal events.

Chrome UI checks on macOS use the packaged interface with simulated extension APIs and synthetic tabs. They cover keyboard bulk close, refreshed counters, closing while paused, all settings types, persistence after reload and reset. These tests do not operate an installed extension or real user tabs.

Package validation checks the runtime allowlist, module and HTML references, icon dimensions, permissions, license and archive integrity. All 102 runtime tests also pass against extracted release files; the remaining test checks source artwork.

## Remaining live checks

The installed-extension Errors page and service-worker console have not been verified for this release. Actual discards, macOS Spaces placement, sleep/wake, session restoration and memory usage require the live checklist below. Testing has only been performed on macOS; Windows, Linux and ChromeOS remain unverified.

## Reproduce automated checks

Requires Node 20+ and Python 3 for packaging; the extension itself has no runtime dependencies outside Chrome.

```sh
npm test
python3 scripts/package.py
npm run preview
```

The preview command serves a loopback-only development fixture at `http://127.0.0.1:8765`. Its tab names and URLs are synthetic. The parking-page preview pauses automation so its HTTP page remains visible; simulated tab removal cannot close that HTTP tab. Lifecycle removal is verified separately in the engine and real-background-queue tests. Browser fixture data stays in its local origin. Test doubles and preview tooling are never included in the release ZIP.

## Live release checklist

Use a disposable Chrome profile and saved test work. Record the Chrome, OS and extension versions. Start with a one-minute custom delay and two-second dwell, then repeat with production defaults. Close worker DevTools when testing lifecycle behavior.

1. Load/reload version 1.4.1. Inspect the extension's Errors page and worker console for new errors, then close the inspector.
2. Save and reopen every setting type; reset and reopen again. Values must persist without errors.
3. Park a window and inspect “Parked · previous tab title” in the tab strip and window-switching tools. Restore and confirm the parking page closes. Select a different real tab and park again; a newly created page must show the new saved title. Repeat after worker termination and Chrome session restoration. Window-switcher title display is controlled by Chrome/macOS and may differ between tools.
4. Verify the parking tab stays unpinned at the end while parked, closes after successful restoration, and is recreated for the next cycle; the real tab order/groups/pins stay intact, and only the saved tab restores. There must be no unsolicited foreground or Space changes.
5. With Memory Saver Maximum, record already-discarded backgrounds, park and restore, and check that those backgrounds stay asleep. Check live sleeping-tab counts without attributing ownership.
6. Extract `dist/chrome-window-parker-v1.4.1.zip` and load that extracted folder in a disposable Chrome profile. Confirm no errors and the same behavior. Static package validation is not proof that Chrome loaded it successfully.
7. Use **Clear parked tabs** with multiple parked windows, then with automation paused. Confirm all parking pages close, real tabs and windows remain, the pause setting stays unchanged and no affected window parks again until its full delay passes. Repeat with inactive leftovers, a closed original target and a window containing only parking pages; the last case must leave one blank tab. Try while dragging a tab, then retry after releasing it.
8. Run the broader scenarios below. Inspect the timer icon on actual light/dark Chrome toolbars, both normal and Retina displays, and at the store's 128-pixel size.

| # | Scenario | Automated evidence | Live expected result / check |
|---|---|---|---|
| 1 | One window with many tabs | Same-window preservation/discard test | Focus another app; window parks in place. |
| 2 | Ten windows on separate Spaces | Ten-window simulation | Record Space, window position and dimensions; all unchanged after parking. |
| 3 | Desktop 1 → 2 → 3 → 4 | Rapid traversal simulation | Move using the actual macOS shortcuts. |
| 4 | Under 2 seconds on intermediates | 700 ms intermediate visits | Intermediate real tabs remain discarded. |
| 5 | Stop over 2 seconds on Desktop 4 | 1999 ms boundary then completion | Fourth window restores only after dwell. |
| 6 | Only Desktop 4 restores | Other nine remain parked | Inspect `chrome://discards` and process activity. |
| 7 | Idle over 15 minutes | Deadline/grace tests | Repeat with production 15-minute setting. |
| 8 | Return to idle window | Dwell and recreation tests | Prior tab reloads in same window; parking tab closes and is recreated on the next cycle. |
| 9 | Audio-playing tab | Active and background audio protected | Actual audio remains uninterrupted; active protected tab prevents whole-window parking. |
| 10 | Pinned tab | Defaults skip; opt-in keeps pin | Verify both settings with real Chrome. |
| 11 | Close parking tab | Recreation test | Chrome chooses a real tab naturally; a future idle period recreates one parking tab. |
| 12 | Close prior tab | Nearest fallback test | Restore chooses a remaining real tab without error. |
| 13 | Close parked window | Runtime/local cleanup test | No orphan retries or recreated windows. |
| 14 | Chrome restart with many windows | Tokens remap changed IDs | With Chrome session restore enabled, existing parked pages remain parked; no extension-created reload storm. Chrome's own startup loads are outside extension control. |
| 15 | macOS sleep/wake | Late callback restarts dwell | Wake while focused on parked page; require fresh dwell; confirm alarms eventually run. |
| 16 | Worker termination | Reconstructed state and fresh dwell | Allow worker to stop naturally without DevTools. Return to one parked window. |
| 17 | Extension reload/update | Session reset/lost alarms test | Reload extension; observe no mass restore. Refresh invalidated parking-page context if necessary. |
| 18 | One real tab | Single-tab test | One appended parking tab; original survives and restores. |
| 19 | Incognito | Ignored-window test and manifest policy | Incognito access unavailable; no private-window mutations. |
| 20 | chrome://settings | Active/background internal-page tests | Internal active page prevents parking that window; internal background page never discarded. |
| 21 | Tab groups | IDs/order/group/pin equality | Verify names/colors/collapsed groups and actual tab-strip order in Chrome. |
| 22 | Switch to other app, same Space | WINDOW_ID_NONE modeled | Other app stays frontmost during parking, with no Space switch. |
| 23 | Rapid back-and-forth | Dwell cancellation and activity tests | Repeat A/B switching below dwell, then stop on A; only A restores. |

Additional checks: active download globally pauses parking; interrupted/completed download resumes later; protected call/capture/PiP tabs stay loaded through explicit exclusions; changing settings during parking cancels remaining work; selecting a different real tab cancels the old restore; disable leaves parked windows asleep; reset persists defaults; tab title strings render as text; no remote requests from extension pages.

## Memory measurements

Do not promise a fixed reduction. Compare several equivalent workloads with and without parking; record tab/window counts, Chrome/macOS versions, Memory Saver mode, excluded tabs, timing and total Chrome process memory. No measured RAM savings are claimed in this release.

## Platform acceptance

Before describing Windows, Linux or ChromeOS as supported, run the live checks on that platform, including application switching, multiple windows, sleep/wake and browser restart. Add exact tested versions and results here. CI running simulated tests on an OS does not constitute browser compatibility validation.

## Icon and package checks

See [the icon inventory](docs/ICONS.md) for runtime and documentation references. Page images use 128px sources for Retina rendering. Check toolbar and extension-manager rendering after reloading an installed copy. The release package contains runtime files, four timer PNGs and the MIT license; documentation, source artwork, tests and development fixtures are excluded.
