# Chrome Window Parker

<img src="icons/parker-timer-128.png" width="64" height="64" alt="Window Parker timer icon">

Let the selected tab in an idle Chrome window sleep, too.

Chrome may keep one selected tab loaded in every window, even when you are working elsewhere. Window Parker switches an unused window to a lightweight parking page so its previously selected tab can be discarded. When you return and stay for a moment, that tab comes back.

## Platform status

Chrome Window Parker has currently only been tested on macOS and is designed primarily for multi-window workflows across macOS Spaces. It uses standard Chrome extension APIs and may work on Windows, Linux, and ChromeOS, but those platforms have not been formally tested; their compatibility is unverified.

Requires **Chrome 120 or later**. Testing so far includes automated simulations and a local Chrome UI fixture on macOS, plus user-reported use of the unpacked extension. Full live acceptance testing remains open; see [Testing](TESTING.md). There is no Windows, Linux, or ChromeOS support certification.

## How it works

- After 15 minutes of inactivity by default, an eligible window switches to a parking tab without asking Chrome to focus or move the window.
- Only the formerly selected real tab is discarded. The other tabs stay in place, retaining their order, pins and groups.
- Returning for a continuous two seconds restores the saved tab. Brief passes through other windows do not restore them. Both delays are adjustable.
- The parking tab is temporary and unpinned. After a real tab is confirmed active, the parking page closes; the next parking cycle creates a new one. Its title, **Parked · previous tab title**, helps distinguish windows without changing the saved restoration target. Pinning was avoided because it would move the tab and hide that title.

Window Parker works **alongside Chrome Memory Saver**, including Maximum mode. It does not change Chrome's performance settings or exclusions, and leaves ordinary background tabs to Chrome. The popup's **Sleeping tabs** count includes sleeping tabs regardless of which tool discarded them; it is not a measurement of memory saved.

## Install a release

Open [GitHub Releases](https://github.com/montybwolfe/chrome-window-parker/releases) and download the attached **`chrome-window-parker-v1.3.0.zip`** for version 1.3.0. Extract it to a permanent folder, then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.

The GitHub release is a prerelease while live acceptance checks remain open. It is not a Chrome Web Store listing.

## Develop from source

```sh
git clone https://github.com/montybwolfe/chrome-window-parker.git
cd chrome-window-parker
```

In `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the project folder. No build or Node installation is required to load it. Open the toolbar popup, then **Settings** to adjust timing or exclusions.

To update an unpacked copy, replace its files in the same folder, click **Reload** in `chrome://extensions`, and refresh open extension pages. Avoid enabling a second copy. Version 1.3.0 uses new icon filenames; a still-running older copy can keep displaying its old icon until reloaded.

## Chrome Web Store upload package

Run `python3 scripts/package.py` from a checkout. For this version it produces:

```text
dist/chrome-window-parker-v1.3.0.zip
```

**Upload that prepared ZIP to the Chrome Web Store**, or download the identically named attached GitHub Release asset. Do **not** upload GitHub's automatically generated “Source code (zip)” archive or zip the whole repository. The prepared package has `manifest.json` at its root and contains only runtime files and required icons. Generated packages stay out of Git.

## Limits and precautions

Pinned tabs, audible tabs, excluded sites and individually protected tabs are skipped by default. Chrome's internal pages and incognito windows are not eligible. An active download pauses parking globally.

Discarding unloads a page and can lose unsaved work. The available APIs cannot reliably detect editing, uploads, calls, screen sharing, silent video, Picture-in-Picture or attached developer tools. Exclude those tabs or sites, keep them pinned with pinned discarding off, or pause automation. Window Parker exclusions do not control Chrome Memory Saver.

Chrome can delay alarms or decline a discard. Memory savings depend on the pages involved and are not guaranteed or measured by this extension. Chrome controls session restoration and macOS Space placement. If no real tab remains, the parking page stays open to preserve the window. If Chrome temporarily refuses removal, cleanup waits for later activity or worker startup. A remembered title may appear in Chrome or window-switching tools, but the labels those tools display are outside this extension's control.

## Privacy

Local-only. No telemetry, analytics, tracking, external servers or remote code. Tab URLs and titles are used locally for exclusions and restart recovery; they are never sent to the developer. Settings stay in this Chrome profile. See the [privacy policy](PRIVACY.md) for stored data, retention and permissions.

## Development and release

Run `npm test` with Node 20+; tests have no package dependencies. `npm run preview` starts an isolated browser fixture with simulated Chrome APIs. Package the extension with `python3 scripts/package.py`.

- [Behavior and recovery details](docs/BEHAVIOR.md)
- [Testing and remaining release checks](TESTING.md)
- [Compatibility and support](SUPPORT.md)
- [Chrome Web Store copy and submission checklist](docs/WEB_STORE.md)
- [Store listing fields and upload assets](store-listing/START-HERE.md)
- [Changes](CHANGELOG.md)

Report reproducible issues in [GitHub Issues](https://github.com/montybwolfe/chrome-window-parker/issues), without private URLs or browsing data. This project is independent of Google and is not endorsed by Google.
