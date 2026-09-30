# Changelog

## 1.5.6

- **Parked windows show what they hold.** The parking page now leads with your tab's own icon and title, so you can tell parked windows apart at a glance, for example in Mission Control. The parking tab keeps the Window Parker icon. The icon is Chrome's own saved copy, using the new favicon permission, which adds no install warning.
- **Clean up for excluded sites** replaces Sort A–Z. It sorts the list and removes duplicates, such as a site added twice or with different capitals, without changing which pages are excluded.
- **Settings shows the installed version**, quietly, in its top corner.
- **Fixed** a protected tab losing its protection when Chrome unloaded it to save memory. Chrome gives an unloaded tab a new ID; protection now follows the tab.
- **Fixed** a closed parked window's recovery record (its tab's address and title) staying in the extension's storage when the window closed while the extension was idle. It's deleted as soon as the window closes, as the privacy policy says.
- **Safer Settings.** Restore defaults asks before replacing your settings, and Clean up can be undone.
- **Small fixes.** Protect this tab is offered only on web pages, the only tabs that park; the parking page reads more naturally; text boxes have clearer edges, and screen readers hear their units; and a very long site address gets a clear message.

## 1.5.5.3

- **Easier sync on a new computer.** Turning sync on uses your synced settings for anything you haven't changed on this computer, without asking.
- **Sync everything, a group, or one setting**, in a tidier list: Sync all settings, then Parking and Tab protection, each with its settings beneath. If settings you've changed here differ from your synced ones, one question covers them all, with a choice for each.
- **Restore defaults** replaces Reset settings. Sync turns off on this computer and starts afresh, and your other computers keep their settings.
- **Tidier excluded sites.** Paste a site's home address to add the whole site, and Sort A–Z puts the list in order. The built-in sites now start in that order, and the help is plainer.
- **A cleaner popup.** Report a bug, Buy me a coffee and Settings are small icons. Settings keeps the labelled links.
- **Settings sections have small icons**, and keyboard focus stays on Save settings, Restore defaults and Refresh list while they work.
- **A sharper toolbar icon** on standard and 150% displays.

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
