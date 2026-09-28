# Testing

Validation date: 28 September 2026. Version 1.5.0.

## Automated coverage

**148 tests pass** with Node 24.19.0. Coverage includes both sleeping modes; settings migration, validation, persistence and reset; loaded and independently discarded restore targets; already-sleeping backgrounds; window/tab preservation; protection checks; worker restart and browser-session recovery; focus, navigation and cleanup races; and Clear parked tabs.

The actual background queue is tested with its own activation/removal events. A queued switch from immediate discard to Chrome-managed sleeping cancels the pending discard. Requests queued after bulk cleanup return a quiet terminal result. Separate tests cover stale requests after automatic restoration, manual restoration, closure and navigation; unexpected failures still reach the error path.

Appearance tests cover Auto under both system preferences, live system changes, explicit overrides, invalid/missing preferences, cross-page storage changes, initial-read races, read failure and listener removal. Page teardown cancels pending status refreshes. No polling or keepalive loop is introduced.

## Chrome UI checks

The actual HTML, CSS and JavaScript are rendered in Chrome on macOS through a local fixture with synthetic tab data and a worker-backed extension API double. Checks cover Light and Dark on Settings, popup and parked page; appearance and sleeping-mode save/reload; reset to Auto and Let Chrome decide; and appearance propagation to open pages. Auto is also rendered with synthetic light/dark media preferences. This does not claim that the operating system's theme was changed during testing.

The popup is checked at its 360px width. Settings remain scrollable on narrow screens. Store screenshots capture the production interface with synthetic data; the popup uses a presentation frame. The preview keeps its simulated parked window unfocused so automatic return does not remove it during capture. Simulated removal cannot close the HTTP preview itself. Each preview worker has independent tab state; local settings persistence and appearance notifications are shared by the fixture origin.

These browser checks do not install the extension or operate real user tabs. The installed extension's Errors page and service-worker console have not been inspected for v1.5.0 because access to Chrome's internal pages is unavailable through the browser tool. Actual discard decisions, toolbar presentation, macOS Spaces, sleep/wake and session restoration remain live acceptance work.

## Reproduce checks

Requires Node 20+ and Python 3. The extension has no external runtime dependencies.

```sh
npm test
python3 scripts/package.py
npm run preview
```

The preview serves only its allowlisted files at `http://127.0.0.1:8765`. Add `?system=light` or `?system=dark` to an extension-page preview URL to simulate a system preference for Auto. Runtime files do not include that override or any fixture code.

Packaging checks the explicit 19-file allowlist, module/HTML references, permissions, description length, icon sizes, license, matching versions and ZIP integrity. The package includes `theme.js`. **147 runtime tests also pass against the extracted ZIP**; the source-artwork test requires files intentionally excluded from the package. Release checks compare local and downloaded asset hashes and verify the tag, main branch and published release.

## Live release checklist for testers

Use saved test work in a disposable Chrome profile. Record extension, Chrome and OS versions. Start with a one-minute custom parking delay and two-second return delay, then repeat with the 15-minute default. Close worker DevTools during suspension and sleep/wake tests.

1. Load the extracted v1.5.0 runtime ZIP. Check the Errors page and worker console, then close the inspector. Confirm the native toolbar popup and timer icon on light and dark Chrome toolbars.
2. Save each setting, reopen Settings and verify persistence. Test both sleeping modes and Auto/Light/Dark on all three pages. Change the actual system theme while Auto pages are open. Reset and verify Let Chrome decide, Auto, 15 minutes and 2 seconds.
3. In Let Chrome decide, park an unfocused window. Its saved real tab must remain present; Chrome may keep it loaded or unload it later. Compare with Memory Saver enabled. Do not assume the sleeping-tab count must rise immediately.
4. In Discard immediately, verify that only the eligible previously selected tab receives the discard attempt. Chrome may refuse. Already-sleeping and ordinary background tabs must stay untouched in both modes.
5. Return to a parked window for less than two seconds, then leave. It must stay parked. Return for the full dwell; only the saved tab should become selected, reloading only if unloaded, and the parking page should close.
6. Repeat automatic return, Restore tab and Clear parked tabs rapidly while checking for new errors. Select a different real tab, close the saved target, close a parking page, and close a whole window. Verify sensible recovery and no “Parking tab no longer exists” error.
7. Clear multiple parked windows while enabled and paused. Preserve all real tabs and windows, keep the pause setting unchanged and start a fresh inactivity interval. A parking-only window must retain a blank tab. Repeat with inactive leftovers, duplicate parking pages and a tab being dragged.
8. Test one-tab and ten-window sessions. Record window positions, sizes, macOS Spaces, tab order, pins and groups. Traverse Spaces 1 → 2 → 3 → 4 briefly, then stop on 4; only that window should return. Parking while another app is frontmost must not focus Chrome or change Spaces.
9. Test audio, pinned tabs, exclusions, downloads and selected internal pages. Exclude disposable call/capture/video/editing tests explicitly where Chrome lacks a reliable signal. Verify global parking pause during downloads and later resumption.
10. Test natural worker termination, extension reload, browser restart with session restore, and macOS sleep/wake. Interrupted dwell must restart. Chrome may reload pages during its own startup; verify Window Parker does not trigger a mass restore or create replacement windows.
11. Inspect the extracted package's pages and network activity. Extension pages must load packaged resources only. A restored website can make its normal network requests.

## Memory and platform checks

Compare Memory Saver alone with Memory Saver plus Window Parker using the same pages, timing, settings and workload. Record total Chrome memory, page processes, extension overhead and discarded flags across repeated runs. Record the sleeping mode explicitly. No RAM measurements or fixed savings are claimed for this release. [Behavior and recovery](docs/BEHAVIOR.md) includes a measurement procedure.

Testing so far has been on macOS. Support on Windows, Linux or ChromeOS remains unverified until live behavior has been validated on those platforms, including application switching, multiple windows, sleep/wake and browser restart. Simulated tests alone do not establish platform support.
