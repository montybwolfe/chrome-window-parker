# Compatibility and support

Chrome Window Parker has currently only been tested on macOS and is designed primarily for multi-window workflows across macOS Spaces. It uses standard Chrome extension APIs and may work on Windows, Linux, and ChromeOS, but those platforms have not been formally tested; their compatibility is unverified.

## Implementation scope

The runtime contains no OS checks, native messaging, AppleScript, macOS filesystem paths or calls to macOS APIs. Chrome handles tabs, windows, alarms, downloads and storage. The system font stack has a macOS font preference with ordinary fallbacks; that is presentation, not an OS dependency.

The central assumption is that briefly passing through windows should not wake their selected pages. This is especially useful across macOS Spaces. Other desktop platforms may support the same flow, but focus events, application switching, sleep/wake and session restoration must be tested on each platform before claiming support. No macOS Space assignments are read or modified.

| Platform | Status |
| --- | --- |
| macOS | Only platform tested so far; full release acceptance checklist still open |
| Windows | Unverified; not formally tested |
| Linux | Unverified; not formally tested |
| ChromeOS | Unverified; not formally tested |

The manifest requires Chrome 120+. That API baseline is not a claim that every Chrome version since 120 has been tested. Other Chromium browsers and mobile browsers are not validated. Incognito and popup/app/devtools windows are intentionally excluded.

## Reporting an issue

Use [GitHub Issues](https://github.com/montybwolfe/chrome-window-parker/issues). Include extension, Chrome and OS versions, Memory Saver mode, relevant settings, reproduction steps, expected behavior and observed behavior. Remove private tab titles, URLs and other personal data from screenshots and logs.

Try reloading the extension and refreshing its pages after an update. Real tabs remain selectable if automatic restoration is paused or unavailable. Keep worker DevTools closed when testing worker suspension or sleep/wake, because an attached inspector changes worker lifetime.

See [Testing](TESTING.md) for evidence and remaining checks. Do not equate passing simulated API tests with verified platform support.
