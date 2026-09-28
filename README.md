# Chrome Window Parker

<img src="icons/128.png" width="64" height="64" alt="Window Parker timer icon">

Let the selected tab in an idle Chrome window sleep, too.

Chrome may keep one selected tab loaded in every window, even when you are working elsewhere. Window Parker switches an unused window to a lightweight parking page so its previously selected tab can be discarded. When you return and stay for a moment, that tab comes back.

## Platform status

Chrome Window Parker has currently only been tested on macOS and is designed primarily for multi-window workflows across macOS Spaces. It uses standard Chrome extension APIs and may work on Windows, Linux, and ChromeOS, but those platforms have not been formally tested; their compatibility is unverified.

Requires **Chrome 120 or later**. Testing so far includes automated simulations and a local Chrome UI fixture on macOS, plus user-reported use of the unpacked extension. Full live acceptance testing remains open; see [Testing](TESTING.md). There is no Windows, Linux, or ChromeOS support certification.

## How it works

- After 15 minutes of inactivity by default, an eligible window switches to a parking tab without asking Chrome to focus or move the window.
- Only the formerly selected real tab is discarded. The other tabs stay in place, retaining their order, pins and groups.
- Returning for a continuous two seconds restores the saved tab. Brief passes through other windows do not restore them. Both delays are adjustable.
- The parking tab stays unpinned at the end and is reused. Its title, **Parked · previous tab title**, helps distinguish windows without changing the saved restoration target. Pinning was avoided because it would move the tab and hide that title.

Window Parker works **alongside Chrome Memory Saver**, including Maximum mode. It does not change Chrome's performance settings or exclusions, and leaves ordinary background tabs to Chrome. The popup's **Sleeping tabs** count includes sleeping tabs regardless of which tool discarded them; it is not a measurement of memory saved.

## Install locally

1. Download this repository or a release ZIP and keep the extracted folder in a permanent location.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the folder containing `manifest.json`.
4. Open the extension's toolbar popup, then **Settings** to adjust timing or exclusions.

To update, replace the files in the same folder, click **Reload** in `chrome://extensions`, and refresh open extension pages. Avoid enabling a second copy. No build or Node installation is needed to use it.

## Limits and precautions

Pinned tabs, audible tabs, excluded sites and individually protected tabs are skipped by default. Chrome's internal pages and incognito windows are not eligible. An active download pauses parking globally.

Discarding unloads a page and can lose unsaved work. The available APIs cannot reliably detect editing, uploads, calls, screen sharing, silent video, Picture-in-Picture or attached developer tools. Exclude those tabs or sites, keep them pinned with pinned discarding off, or pause automation. Window Parker exclusions do not control Chrome Memory Saver.

Chrome can delay alarms or decline a discard. Memory savings depend on the pages involved and are not guaranteed or measured by this extension. Chrome controls session restoration and macOS Space placement. A remembered title may appear in Chrome or window-switching tools, but the labels those tools display are outside this extension's control.

## Privacy

Local-only. No telemetry, analytics, tracking, external servers or remote code. Tab URLs and titles are used locally for exclusions and restart recovery; they are never sent to the developer. Settings stay in this Chrome profile. See the [privacy policy](PRIVACY.md) for stored data, retention and permissions.

## Development and release

Run `npm test` with Node 20+; tests have no package dependencies. `npm run preview` starts an isolated browser fixture with simulated Chrome APIs. Package the extension with `python3 scripts/package.py`.

- [Behavior and recovery details](docs/BEHAVIOR.md)
- [Testing and remaining release checks](TESTING.md)
- [Compatibility and support](SUPPORT.md)
- [Chrome Web Store copy and submission checklist](docs/WEB_STORE.md)
- [Changes](CHANGELOG.md)

Report reproducible issues in [GitHub Issues](https://github.com/montybwolfe/chrome-window-parker/issues), without private URLs or browsing data. This project is independent of Google and is not endorsed by Google.
