# Chrome Window Parker

<img src="icons/parker-timer-128.png" width="64" height="64" alt="Chrome Window Parker timer icon">

**Let idle windows rest. Pick up where you left off.**

Keep a Chrome window for each project or desktop? Each window has a selected tab, even when you are working somewhere else. Chrome Window Parker switches an unused window to a lightweight parking page, giving its previous tab a chance to sleep under Chrome Memory Saver.

Your tabs stay in the same window, with their order, pins and groups intact. When you return and stay for a moment, your previous tab comes back and the parking page closes. Briefly passing through another desktop leaves its window parked.

## Install

### Chrome Web Store

Chrome Web Store listing pending approval. Once published, this will be the recommended route for normal one-click installation of Chrome Window Parker.

<!-- CHROME_WEB_STORE_URL: After approval, replace this pending paragraph and comment with
"Install Chrome Window Parker from the Chrome Web Store." and a link labelled
"Install from the Chrome Web Store" using the approved listing URL. -->

### Manual installation

For manual or developer installation:

Download **`chrome-window-parker-v1.5.1.2.zip`** from [GitHub Releases](https://github.com/montybwolfe/chrome-window-parker/releases/tag/v1.5.1.2). This is the extension package; GitHub's automatic source-code archives contain development files too.

1. Extract the release ZIP to a permanent folder.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked**, then select the extracted folder containing `manifest.json`.
4. Leave the defaults in place to start: park after **15 minutes**, restore after **2 seconds**, and **Let Chrome decide** when tabs sleep.

Requires Chrome 120 or later. Testing has been on macOS, with live release checks still outstanding; Windows, Linux and ChromeOS are unverified. See [testing](TESTING.md) and [compatibility](SUPPORT.md).

## Two ways to handle tab sleeping

**Let Chrome decide** is the default, including when upgrading from an older version. Parking makes the previous tab a background tab; Chrome controls whether and when it unloads. Chrome Window Parker makes no discard requests in this mode. Keep Chrome Memory Saver enabled at your preferred level. A parked window can still have loaded tabs, and memory savings vary.

**Discard immediately** asks Chrome to unload every currently loaded eligible real tab when its window is newly parked. Already-sleeping, protected and ineligible tabs are skipped individually. Choose this only if you want more aggressive sleeping. Unloading can lose unsaved page state.

Both modes leave already-sleeping tabs alone. Changing sleeping mode applies to the next parking cycle; it does not unload or wake tabs in windows already parked. Returning selects only your saved tab, which Chrome reloads if necessary. Chrome Window Parker does not change Chrome's Memory Saver settings or its always-active site list. [About Chrome Memory Saver](https://support.google.com/chrome/answer/12929150?hl=en).

## Make it fit your workflow

Open **Settings** from the toolbar popup to change the parking delay, return delay, sleeping mode or **Auto / Light / Dark** appearance. Auto follows your system theme. Saving an appearance updates every open Chrome Window Parker page.

By default, a window is skipped when its selected tab is pinned, playing audio or excluded. Add site exclusions for work you want to keep selected, or protect a single tab for the current browser session. Chrome Window Parker's exclusions do not control Chrome's own memory decisions.

The popup shows **Parked windows** and **Sleeping tabs**, plus controls to protect the current tab and pause automation. **Clear parked tabs** returns affected windows to real tabs and removes their parking pages, even while paused. Clearing restores at most one real tab per affected window and never initiates discards; other loaded or sleeping tabs keep their state. A window with only parking pages receives a blank tab so it stays open.

## A few things to know

Parking pauses during active Chrome downloads. Incognito, special browser windows and selected internal pages are excluded. Chrome's APIs cannot reliably identify every call, upload, screen-sharing session, video or unsaved edit. Exclude important sites; use Chrome's always-active site list too if they must stay loaded under Memory Saver.

Chrome Window Parker never asks Chrome to move or focus a window. Chrome still controls session restoration and macOS Space placement. See [behavior and recovery](docs/BEHAVIOR.md) for timing, safeguards and API limitations.

## Privacy

Everything runs locally in your Chrome profile. There are no Chrome Window Parker accounts, analytics, ads, telemetry, backend or background network requests. All executable code is packaged locally. Tab URLs, titles and activity state are used locally for exclusions and restoration. [Read the privacy policy](PRIVACY.md).

## Development and support

The repository runs directly as an unpacked extension; no build step is needed. With Node 20+ and Python 3 installed:

```sh
npm test
python3 scripts/package.py
npm run preview
```

The package is written to `dist/`. The preview uses synthetic data and is separate from an installed extension. [Testing](TESTING.md) explains the checks and their limits; [store submission notes](docs/WEB_STORE.md) identify the upload files.

Report reproducible problems through [GitHub Issues](https://github.com/montybwolfe/chrome-window-parker/issues), with private URLs and titles removed. Changes are recorded in the [changelog](CHANGELOG.md).

## Support development

Chrome Window Parker is free and open source. If you find it useful, you can optionally support its development.

<a href="https://buymeacoffee.com/montybwolfe"><img src="docs/assets/buy-me-a-coffee-blue.png" alt="Buy Me a Coffee" width="217"></a>

Released under the [MIT License](LICENSE), except for the [official Buy Me a Coffee artwork](docs/assets/BUY-ME-A-COFFEE.md). This independent project is not affiliated with or endorsed by Google.
