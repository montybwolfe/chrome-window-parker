# Testing

Validation date: 28 September 2026. Version 1.3.0.

## Evidence and limits

Testing has only been performed on macOS. Windows, Linux and ChromeOS are unverified. The code uses standard Chrome extension APIs; passing simulated API tests does not establish platform support.

- **78 automated tests pass** with Node 24.19.0. They cover the engine, serialized background queue, settings persistence, timer receivers, focus races, Memory Saver coexistence, recovery and UI event handling.
- The new title tests cover literal site-title rendering, repeated parking with a different saved tab, worker restart, the restored target and absence of pin changes. Lifecycle tests verify active-target confirmation before removal, a second parking cycle, manual selection/closure, missing targets, parking-only windows, transient remove failures, recovery after interruption and navigation/focus/detach races. The actual background queue is tested with its own activation/removal events.
- The Chrome browser fixture uses the actual UI, background queue and engine with native worker timers and simulated Chrome APIs. Settings save/reload/reset and the new parked-page title were checked in this fixture. It cannot access real user tabs or installed extensions.
- The icon was reviewed at 16, 32, 48 and 128 pixels on light and dark backgrounds. The manifest and release ZIP are checked for referenced assets, permissions and exclusion of test/development files.
- The prior native-worker reproduction confirmed that detached native timer methods caused Illegal invocation; owner-preserving wrappers passed. Settings coverage includes parking delay, custom delay, dwell, pinned/audio protection, exclusions, debug and Reset.
- The user has reported that the unpacked extension's core behavior is working. That is useful feedback, not a recorded release acceptance run.

The installed extension's Errors page and worker console could not be inspected through the available automation, which blocks internal Chrome pages. Real Chrome discard calls, Spaces placement, session restoration, sleep/wake and RAM reductions have not been certified by these tests. Do not report the live checklist below as passed until it is performed.

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

1. Load/reload version 1.3.0. Inspect the extension's Errors page and worker console for new errors, then close the inspector.
2. Save and reopen every setting type; reset and reopen again. Values must persist without errors.
3. Park a window and inspect “Parked · previous tab title” in the tab strip and window-switching tools. Restore and confirm the parking page closes. Select a different real tab and park again; a newly created page must show the new saved title. Repeat after worker termination and Chrome session restoration. Window-switcher title display is controlled by Chrome/macOS and may differ between tools.
4. Verify the parking tab stays unpinned at the end while parked, closes after successful restoration, and is recreated for the next cycle; the real tab order/groups/pins stay intact, and only the saved tab restores. There must be no unsolicited foreground or Space changes.
5. With Memory Saver Maximum, record already-discarded backgrounds, park and restore, and check that those backgrounds stay asleep. Check live sleeping-tab counts without attributing ownership.
6. Extract `dist/chrome-window-parker-v1.3.0.zip` and load that extracted folder in a disposable Chrome profile. Confirm no errors and the same behavior. Static package validation is not proof that Chrome loaded it successfully.
7. Run the broader scenarios below. Inspect the timer icon on actual light/dark Chrome toolbars, both normal and Retina displays, and at the store's 128-pixel size.

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

## Icon and package audit

See [the icon inventory](docs/ICONS.md) for every runtime and documentation reference. Version 1.3.0 gives the timer new filenames and uses 128px sources for the 28–40px page images to avoid undersized Retina artwork. Extension-manager and toolbar rendering still require an actual reload in Chrome; internal-page access is blocked in the available browser automation. The release packager excludes documentation, source SVGs, high-resolution marketing art, tests and private development files.
