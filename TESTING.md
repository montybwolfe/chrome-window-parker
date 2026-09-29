# Testing

Validation date: 29 September 2026. Version 1.5.1.2.

## Automated coverage

**211 tests pass** with Node 24.19.0. Coverage includes both sleeping modes; settings migration, validation, persistence and reset; loaded and independently discarded restore targets; already-sleeping backgrounds; window/tab preservation; protection checks; worker restart and browser-session recovery; focus, navigation and cleanup races; and Clear parked tabs.

The bulk-discard cases cover three loaded tabs, mixed Chrome-discarded and loaded tabs, reloaded tabs, every protection rule, moved/closed/new candidates, Chrome races and per-tab refusals. Focus, real-tab selection, policy/protection changes, new downloads and long API gaps cancel remaining work. Interrupted batches are not replayed by replacement workers or fresh browser sessions.

The actual background queue is tested with its own creation/activation/removal events and changes arriving after the first discard. A focus-timing regression verifies that an older queued sweep cannot park a window the user just left. Clear tests cover eight parked windows in both modes, enabled and paused, preserving neighbor states and restoring at most one real tab per window. A target disappearing after successful activation cannot cause a second target to wake. A parking-only Clear regression verifies that its blank-tab event cannot trigger discards in an unrelated overdue window; that window still parks on the next ordinary alarm. Existing lifecycle, orphan-page, duplicate-token, stale-message and manual-selection tests remain in the suite.

Appearance tests cover Auto under both system preferences, live system changes, explicit overrides, invalid/missing preferences, cross-page storage changes, initial-read races, read failure and listener removal. Page teardown cancels pending status refreshes. No polling or keepalive loop is introduced.

## Chrome UI checks

The final v1.5.1.2 pass uses actual Chrome on macOS with the real HTML, CSS and JavaScript served through the HTTP preview fixture. The fixture supplies simulated extension APIs and synthetic tabs, not an installed extension. Checks cover full product naming, no fundraising controls, compact popup layout, Settings save/reset, both sleeping-mode explanations, Light/Dark/Auto, parked-page presentation, and preview warning/error logs. Store images are rendered from those current sources at 4× and downsampled once to PNG.

No installed-extension acceptance is claimed. Chrome internal pages and the installed extension's Errors page/service-worker console are unavailable through the browser tool. Native toolbar behavior, real discard decisions, restore dwell, install/update/restart, permission prompts, macOS Spaces and sleep/wake remain the manual checks below. Code/package audits verify that only local resources ship, the original four permissions and restrictive CSP remain, and all runtime funding code/assets are absent. No installed-extension network trace has been recorded.

## Reproduce checks

Requires Node 20+ and Python 3. The extension has no external runtime dependencies.

```sh
npm test
python3 scripts/package.py
npm run preview
```

The preview serves only its allowlisted files at `http://127.0.0.1:8765`. Add `?system=light` or `?system=dark` to an extension-page preview URL to simulate a system preference for Auto. Runtime files do not include that override or any fixture code.

Packaging checks the explicit 19-file allowlist, module/HTML references, permissions, description length, icon sizes, license, matching versions and ZIP integrity. The package includes `theme.js`. **210 runtime tests also pass against the extracted ZIP**; the source-artwork test requires files intentionally excluded from the package. Release checks compare local and downloaded asset hashes and verify the tag, main branch and published release.

## Live release checklist for testers

Use saved test work in a disposable Chrome profile. Record extension, Chrome and OS versions. Start with a one-minute custom parking delay and two-second return delay, then repeat with the 15-minute default. Close worker DevTools during suspension and sleep/wake tests.

1. Load the extracted v1.5.1.2 runtime ZIP. Check the Errors page and worker console, then close the inspector. Confirm the native toolbar popup and timer icon on light and dark Chrome toolbars.
2. Save each setting, reopen Settings and verify persistence. Test both sleeping modes and Auto/Light/Dark on all three pages. Change the actual system theme while Auto pages are open. Reset and verify Let Chrome decide, Auto, 15 minutes and 2 seconds.
3. In Let Chrome decide, park an unfocused window. Its saved real tab must remain present; Chrome may keep it loaded or unload it later. Compare with Memory Saver enabled. Do not assume the sleeping-tab count must rise immediately.
4. In Discard immediately, park a window with three ordinary loaded tabs and verify all three receive discard attempts. Reload one, leave and park again; the reloaded tab must be considered again. Repeat with pinned, audible, excluded, session-protected and already-discarded neighbors. Return mid-batch or change settings: remaining requests must stop. Chrome may refuse individual requests.
5. Return to a parked window for less than two seconds, then leave. It must stay parked. Return for the full dwell; only the saved tab should become selected, reloading only if unloaded, and the parking page should close.
6. Repeat automatic return, Restore tab and Clear parked tabs rapidly while checking for new errors. Select a different real tab, close the saved target, close a parking page, and close a whole window. Verify sensible recovery and no “Parking tab no longer exists” error.
7. Clear multiple parked windows while enabled and paused. Verify zero new discard calls, at most one restored/reloaded real tab per window, unchanged background loaded/discarded states, preserved windows and pause setting, and a fresh inactivity interval. A parking-only window must retain a blank tab. Repeat with inactive leftovers, duplicate parking pages and a tab being dragged.
8. Test one-tab and ten-window sessions. Record window positions, sizes, macOS Spaces, tab order, pins and groups. Traverse Spaces 1 → 2 → 3 → 4 briefly, then stop on 4; only that window should return. Parking while another app is frontmost must not focus Chrome or change Spaces.
9. Test audio, pinned tabs, exclusions, downloads and selected internal pages. Exclude disposable call/capture/video/editing tests explicitly where Chrome lacks a reliable signal. Verify global parking pause during downloads and later resumption.
10. Test natural worker termination, extension reload, browser restart with session restore, and macOS sleep/wake. Interrupted dwell must restart; interrupted aggressive batches must not resume or replay. Re-enable after disabling with parked windows and confirm live-state recovery. Chrome may reload pages during its own startup; verify Chrome Window Parker does not trigger a mass restore or create replacement windows.
11. Confirm the popup and Settings display **Chrome Window Parker** without wrapping or truncation. Check every extension surface for absent fundraising controls, and confirm no unexpected external page opens after install/update/restart.
12. Inspect the extracted package's pages and network activity. Extension pages must load packaged resources only and make no external requests. A restored website can make its normal network requests.

## Memory and platform checks

Compare Memory Saver alone with Memory Saver plus Chrome Window Parker using the same pages, timing, settings and workload. Record total Chrome memory, page processes, extension overhead and discarded flags across repeated runs. Record the sleeping mode explicitly. No RAM measurements or fixed savings are claimed for this release. [Behavior and recovery](docs/BEHAVIOR.md) includes a measurement procedure.

Testing so far has been on macOS. Support on Windows, Linux or ChromeOS remains unverified until live behavior has been validated on those platforms, including application switching, multiple windows, sleep/wake and browser restart. Simulated tests alone do not establish platform support.
