# Chrome Window Parker

<img src="icons/parker-timer-128.png" width="64" height="64" alt="">

**[Get it from the Chrome Web Store](https://chromewebstore.google.com/detail/chrome-window-parker/agdejolopcplaedpollnlgpboldnfbfi)** · [Report a bug](https://github.com/montybwolfe/chrome-window-parker/issues)

If you keep lots of Chrome windows open (one per project, spread across desktops), each one keeps its selected tab awake, even when you haven't looked at it for hours. Chrome's Memory Saver sleeps background tabs, but never the selected one.

Chrome Window Parker parks windows you aren't using. After 15 minutes (you can change this), it switches the window to a small parking page, so the tab you were on becomes a background tab that Chrome can put to sleep. Come back, stay a couple of seconds, and your tab returns.

Windows stay where they are, and tabs keep their order, pins and groups. Swiping quickly past a desktop won't wake its windows.

## Install

Install it from the **[Chrome Web Store](https://chromewebstore.google.com/detail/chrome-window-parker/agdejolopcplaedpollnlgpboldnfbfi)**. To install by hand instead, unzip a release from [Releases](https://github.com/montybwolfe/chrome-window-parker/releases), turn on Developer mode in `chrome://extensions` and choose **Load unpacked**.

Needs Chrome 120 or newer. Tested on macOS; Windows, Linux and ChromeOS should work but haven't been tested properly yet.

## How it works

By default Chrome decides when a parked window's tabs sleep. If you'd rather free memory straight away, choose **Discard immediately** in Settings (unloading can lose unsaved work in a page, so exclude sites where that matters).

A window stays awake if its selected tab is pinned, playing audio or on a site you've excluded, and parking pauses while a download is in progress. Settings also lets you change the delays, protect a single tab, pick a theme, and sync chosen settings between your computers. The details are in [how it works](docs/BEHAVIOR.md).

## Privacy

No account, analytics, ads or server: everything runs in your browser and nothing is sent to me. Sync is off unless you turn it on for a setting, and synced settings travel through your own Chrome sync. See the [privacy policy](PRIVACY.md).

Chrome's install warning "Read your browsing history" is its standard wording for seeing your open tabs' addresses and titles, which Window Parker needs for excluded sites and to bring back the right tab. It can't read your history. "Manage your downloads" is only used to check whether a download is in progress.

## Help and development

Found a bug? [Open an issue](https://github.com/montybwolfe/chrome-window-parker/issues) (there's a bug button in the popup and Settings too). Common questions, including Chrome's "not trusted by Enhanced Safe Browsing" notice, are in [Help](SUPPORT.md).

There's no build step: load this folder as an unpacked extension. `npm test` runs the tests and `python3 scripts/package.py` builds the release ZIP. See [Testing](TESTING.md) and the [changelog](CHANGELOG.md).

Chrome Window Parker is free and open source ([MIT](LICENSE)). If it's useful to you, you can [buy me a coffee](https://buymeacoffee.com/montybwolfe). It's an independent project, not affiliated with or endorsed by Google.
