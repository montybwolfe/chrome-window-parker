# Chrome Window Parker

<img src="icons/parker-timer-128.png" width="64" height="64" alt="Chrome Window Parker timer icon">

**Let the selected tab in an idle Chrome window sleep, too.**

Chrome normally keeps one selected tab active in every browser window. If you keep several Chrome windows open, that can leave a surprising amount of memory tied up even when those windows have not been used for a while.

Chrome Window Parker solves that specific problem. After a window has been idle for a while, it switches that window to a tiny parking page so the previously selected tab can be discarded. When you genuinely return to the window, the original tab is restored.

It is designed to work **alongside Chrome Memory Saver**, not replace it.

## How it works

- An idle window is parked after a configurable delay (15 minutes by default).
- The extension activates a lightweight temporary parking page in that same window.
- The previously selected real tab can then be discarded by Chrome.
- Your other tabs stay where they are, including their order, pins and groups.
- When you return and remain in the window for a short dwell period (2 seconds by default), the previous tab is restored.
- Briefly passing through a window does not wake it.
- After restoration, the temporary parking tab closes automatically.

The toolbar popup also shows the current number of parked windows and sleeping tabs.

## Compatibility

Chrome Window Parker is currently **tested on macOS only**, and was designed around multi-window workflows using macOS Spaces.

The extension itself uses standard Chrome extension APIs and contains no macOS-specific code, so it may also work on Windows, Linux and ChromeOS. Those platforms have not yet been formally tested and should be treated as unverified.

Requires **Chrome 120 or later**.

## Install

### GitHub release

Until the Chrome Web Store listing is available, download the latest prepared extension ZIP from [GitHub Releases](https://github.com/montybwolfe/chrome-window-parker/releases).

For version 1.4.1, use:

`chrome-window-parker-v1.4.1.zip`

Do **not** use GitHub's automatically generated “Source code (zip)” archive.

1. Download and extract the release ZIP to a permanent folder.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`.

## Settings

You can configure:

- how long a window must be idle before parking;
- how long a returned window must remain focused before restoring;
- whether pinned tabs may be discarded;
- protection for audio-playing tabs;
- site exclusions;
- individual tab exclusions;
- debug logging.

Automation can also be paused from the toolbar popup. **Clear parked tabs** restores all parked windows and removes their temporary parking pages, even while automation is paused. Each affected window gets a fresh inactivity interval. If a window contains only parking pages, a blank tab keeps it open.

## Chrome Memory Saver

Window Parker complements Chrome's native Memory Saver.

Chrome continues to manage ordinary background tabs. Window Parker focuses on the selected tab in an otherwise unused window — the tab Chrome may otherwise keep loaded because it is still that window's active tab.

Already-sleeping tabs are left alone, and returning to a parked window restores only the saved tab rather than waking every background tab.

## Important limitations

Discarding a tab unloads the page and can lose unsaved work.

Pinned tabs, audible tabs, excluded sites and individually protected tabs are skipped by default. Chrome internal pages and incognito windows are not parked. An active Chrome download temporarily pauses parking.

Chrome's APIs cannot reliably detect every activity that should remain loaded, including some editing sessions, uploads, calls, screen sharing, Picture-in-Picture and silent media. Exclude any site or tab that must remain active.

Chrome itself controls session restoration, window placement and whether a discard request succeeds. Memory savings therefore vary by workload and are not guaranteed.

See [TESTING.md](TESTING.md) for current test coverage.

## Privacy

Chrome Window Parker runs locally in your Chrome profile.

- No telemetry
- No analytics
- No advertising
- No tracking
- No external servers
- No remote code

Tab URLs and titles are used locally for exclusions and restoration and are not sent to the developer.

See the full [privacy policy](PRIVACY.md).

## Development

Clone the repository:

```sh
git clone https://github.com/montybwolfe/chrome-window-parker.git
cd chrome-window-parker
```

Load the project folder through `chrome://extensions` → **Developer mode** → **Load unpacked**.

No build step is required to run the extension.

Run the automated tests with:

```sh
npm test
```

Create a Chrome Web Store-ready package with:

```sh
python3 scripts/package.py
```

The generated ZIP is placed in `dist/` with `manifest.json` at its root. Release ZIPs are also attached to the corresponding GitHub Release.

More technical documentation:

- [Behavior and recovery](docs/BEHAVIOR.md)
- [Testing](TESTING.md)
- [Compatibility and support](SUPPORT.md)
- [Chrome Web Store submission notes](docs/WEB_STORE.md)
- [Changelog](CHANGELOG.md)

## License

Chrome Window Parker is released under the [MIT License](LICENSE).

## Support

Found a reproducible issue? Open a [GitHub Issue](https://github.com/montybwolfe/chrome-window-parker/issues). Please remove private URLs, tab titles and other personal browsing information from screenshots or logs.

Chrome Window Parker is an independent project and is not affiliated with or endorsed by Google.
