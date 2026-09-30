# Changelog

## 1.5.5.2

- **Fixed** a parking page dragged out of its window staying open as a window of its own. A parking page now only belongs to the window it was made for: moved anywhere else, it's removed. The window it came from keeps its tabs and isn't parked again straight away.
- **Fixed** parking pages left behind when you drag tabs between windows by hand. Chrome blocks changes while you're holding a tab, so the cleanup now finishes as soon as you let go.
- **Protect individual tabs** shows when the list has more below, and numbers windows 1, 2, 3 instead of showing Chrome's internal window IDs.
- **Clearer links.** A bug icon reports a problem, and a small coffee cup with Buy me a coffee replaces the vague Support link, in the popup and in Settings.

## 1.5.5

- **Optional sync.** Choose which settings stay the same on your other computers, using Chrome sync. It's off by default and chosen per setting on each computer. Pausing, protected tabs and window details never sync.
- **Report a bug** from the popup or Settings.
- **Tidier Settings.** A compact light/dark/auto theme switch that applies straight away, clearer help for excluded sites, and a scrolling list for protecting individual tabs.
- **Readable text.** Popup and parked-page text is no longer shrunk by Chrome's default extension styling.
- **No leftover windows.** If you close or move away the last real tab in a parked window, its parking page now closes too, so the empty window goes away. Clear parked tabs still keeps windows open.
- **Fixed** a window occasionally parking soon after you'd been using it, when Chrome had paused the extension in the background.
- **Fixed** Discard immediately sometimes leaving a newly parked window's tabs loaded, when its parking page was still opening.

## 1.5.1.3

First public release.

- Parks idle windows on a lightweight page and brings back your previous tab when you return.
- Works with Chrome Memory Saver, or unloads a parked window's tabs straight away.
- Site exclusions, per-tab protection, pause, and Clear parked tabs.
- Light, dark and automatic appearance.
