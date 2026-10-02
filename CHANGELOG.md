# Changelog

## 1.5.6.1

- Added optional settings sync through Chrome, with controls for all settings, groups or individual settings. Sync is off by default. New computers adopt shared values for untouched settings and ask before replacing settings changed locally.
- Added autosave to Settings and removed the Save settings button. Numbers save on Enter or when leaving the box; excluded sites save when leaving the list. Closing Settings keeps valid edits.
- Improved validation and error messages for invalid numbers, excluded sites, storage failures and sync conflicts. Invalid edits leave the previous settings in use.
- Added the original tab's title and favicon to the parking page. The new favicon permission uses Chrome's saved icon without contacting the site or adding an install warning.
- Added home-address paste handling, Clean up and Undo for excluded sites. Clean up sorts and removes duplicate rules without changing which pages are excluded; Undo restores the previous text.
- Changed Restore defaults to ask for confirmation and reset settings and sync choices on this computer only. Shared settings on other computers are preserved.
- Fixed tab protection being lost when Chrome unloads a tab and gives it a new ID.
- Fixed empty parked windows remaining open after their last real tab was closed or moved away. Clear parked tabs still keeps windows open and never starts discards.
- Fixed parking pages remaining behind after being dragged to another window. The original window gets a full parking delay, and tab changes blocked during a drag finish after it ends.
- Fixed windows occasionally parking too soon after use when Chrome had stopped the extension's background worker.
- Fixed Discard immediately sometimes leaving eligible tabs loaded while the parking page was still opening. Let Chrome decide continues to make no discard requests.
- Fixed recovery records remaining in storage after parked windows closed while the extension was idle.
- Improved Settings, popup and parking-page readability, keyboard focus, screen-reader labels, field contrast and High Contrast theme indicators. Added an immediate Light/Dark/Auto switch, clearer protection lists with window numbering, the installed version in Settings, and sharper toolbar icons.
- Added Report a bug buttons and clearer Buy me a coffee links in the popup and Settings.

## 1.5.1.3

First Chrome Web Store release.

- Parks idle windows on a lightweight page and brings back your previous tab when you return.
- Works with Chrome Memory Saver, or unloads a parked window's tabs straight away.
- Site exclusions, per-tab protection, pause, and Clear parked tabs.
- Light, dark and automatic appearance.
