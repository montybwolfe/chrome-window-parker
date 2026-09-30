# Testing

## Automated tests

Needs Node 20+ (Python 3 for packaging). There are no dependencies to install.

```sh
npm test
```

The tests cover parking and restoring, both sleeping modes, settings and sync, exclusions, keeping windows and tabs in place, Clear parked tabs, closing the last tab, moving a parking page to another window, and recovery after worker or browser restarts. Race tests cover focus changes, moved or closed tabs, new downloads, slow API calls, Chrome refusals and interrupted discard batches. UI tests cover the Settings layout and controls, the theme switch, sync choices, the popup, the parked page, and the Support and Report a bug links. The Store artwork is checked for sizes, transparency and matching sources.

Things that must always hold:

- **Let Chrome decide** never calls Chrome's discard API.
- **Discard immediately** checks every candidate tab just before asking; stopped work is never replayed after a restart.
- **Leaving a window you used** gives it a full parking delay, even if that focus change is what wakes a stopped worker. Brief visits don't count as use.
- **Closing or moving the last real tab** removes only verified parking pages, so the window can close, including when it's the last Chrome window. Clear parked tabs keeps windows open.
- **A parking page moved to another window** is removed there and never adopted; the window it came from stays unparked for a full delay. Cleanup that Chrome refuses during a held drag finishes after the drop.
- **Clear parked tabs** never unloads tabs and restores at most one tab per window.
- **Sync** is off by default, chosen per setting on each computer, never overwrites a value without asking, and never carries pausing, protected tabs or window state.

## Preview and packaging

```sh
npm run preview              # UI preview with simulated tabs at http://127.0.0.1:8765
python3 scripts/package.py   # runtime-only ZIP and checksum in dist/
```

Add `?system=light` or `?system=dark` to preview pages to try Auto appearance. The preview is for layout work; real tab behavior needs the installed extension. To check a package, unzip it into a separate folder and load that folder in Chrome.

The Store artwork has its own tools; see [tools/store-assets](tools/store-assets/README.md). Run `node tools/store-assets/verify.mjs` before a release to confirm the screenshots still match the current UI.

## Manual checks in Chrome

Use a separate Chrome profile with nothing important in it, and note the extension, Chrome and OS versions. Start with a 1-minute parking delay and 2-second return delay, then try the defaults. Close the service worker's DevTools before testing sleep or restarts, because it keeps the worker running.

1. **Install.** Load the unzipped package from `chrome://extensions` and check for errors. Save settings, reopen them, and check they stuck. Reset should restore Let Chrome decide, Auto, 15 minutes and 2 seconds, and turn sync off.
2. **Let Chrome decide.** Leave a window unfocused until it parks. Its previous tab stays in the window; Chrome decides when to unload it.
3. **Discard immediately.** Park a window with several loaded tabs, including pinned, audio, excluded, protected and already-sleeping ones. Only eligible tabs should be unloaded. Coming back or changing settings mid-way should stop the rest.
4. **Coming back.** A visit shorter than the return delay leaves the window parked. Staying longer brings back only your previous tab and closes the parking page. Also try Restore tab, clicking a tab yourself, and closing the previous tab first.
5. **Closing the last tab.** Close, or drag to another window, the last real tab of a parked window: the parking page should go and the window close, including when it's your only Chrome window. With another real tab left, nothing should close.
6. **Moving a parking page.** Drag a parking page out into its own window, and into another window, holding it for a few seconds before letting go: it should disappear right after you let go, the new window should close, and the original window should keep its tabs without parking again straight away. Drag one out and back into its own window: it stays.
7. **Clear.** Clear several parked windows, with parking on and paused. Nothing should unload, each window gets at most one tab back, and parking-only windows stay open with a blank tab.
8. **Windows and Spaces.** Check tab order, pins, groups and window positions with one window and with ten. Swipe quickly through several macOS desktops and stop on one: only that window should restore. Parking while another app is in front must not bring Chrome forward.
9. **Protections and downloads.** An excluded selected tab keeps only its own window awake; an excluded background tab doesn't. Any download in progress pauses parking everywhere until it finishes. Calls, screen sharing and editing need exclusions, because Chrome doesn't report them.
10. **Sync.** On two computers signed in to the same Chrome profile with sync on: turn on one setting on each and check a changed value arrives and applies. A different existing value must ask which to keep. Turning sync off keeps the value, and pausing never syncs.
11. **Restarts.** Try the worker stopping by itself, an extension reload, a browser restart, disabling and re-enabling, and computer sleep. Interrupted return delays start again; interrupted batches don't resume. Leave a window you've used for longer than the parking delay while the worker is stopped: it must still wait a full delay after you leave.
12. **Look and feel.** Check Light, Dark and Auto (the header switch applies immediately) across Settings, the popup and the parked page. Open Protect individual tabs with many tabs: the list scrolls inside its box, with a fade and a small arrow at the bottom while there's more below. Both go away at the end of the list.
13. **Links and network.** Report a bug and Buy me a coffee open one tab each, only when clicked, by mouse or keyboard. Extension pages load only their own files.

For memory comparisons, see [Checking memory savings](docs/BEHAVIOR.md#checking-memory-savings).

## Platforms

Tested on macOS. Windows, Linux and ChromeOS haven't been tested properly yet.
