# Changelog

## 1.5.6.1

The second Chrome Web Store release brings together all improvements since 1.5.1.3.

**Settings and sync**

- Settings save themselves: checkboxes and menus apply immediately, numbers save when you press Enter or leave the box, and excluded sites save when you leave the list. Closing Settings keeps valid edits. There's no Save settings button.
- Invalid numbers return to the value in use with an explanation. Invalid site lists stay available to correct while the previous list remains in use. Storage failures are reported more clearly.
- Optional Chrome sync lets you share all settings, the Parking or Tab protection group, or individual settings. It's off by default on each computer. A new computer adopts shared values for settings you haven't changed there; differences involving your own choices are shown together before anything is replaced. Conflict checks catch values that change while you're choosing.
- Restore defaults asks first, resets this computer and turns off its sync choices. Your other computers keep their shared settings.

**Parking and returning**

- The parking page shows your previous tab's icon and title, making parked windows easier to recognise, including in Mission Control. The parking tab keeps the Window Parker icon.
- Closing or moving away the last real tab now removes the parking page so the empty window can close. Clear parked tabs still keeps windows open and never starts discards.
- A parking page dragged to another window is removed there. Its original window keeps its tabs and gets a full parking delay. Cleanup blocked while you're holding a dragged tab finishes after you let go.
- Fixed windows occasionally parking too soon after use when Chrome had paused the extension. Fixed Discard immediately sometimes leaving eligible tabs loaded while the parking page was still opening. Let Chrome decide still makes no discard requests.

**Exclusions and protection**

- Paste a site's home address to exclude the whole site. Clean up sorts the list and removes duplicate rules without changing which pages are excluded. It saves the cleaned list; Undo brings the previous text back, saved when you leave the box.
- Protection now follows a tab when Chrome unloads it and gives it a new ID. Protect individual tabs has a scrolling list, a cue when more tabs are below, and simple window numbering. Protection is offered only for web pages.

**Interface and accessibility**

- A compact Light/Dark/Auto switch applies immediately. Settings has clearer help, section icons and the installed version; the popup has compact Report a bug, Buy me a coffee and Settings buttons. Toolbar icons are sharper at standard and 150% scale.
- Popup and parking-page text is easier to read. Text boxes have clearer edges, screen readers hear units, the chosen theme is visible in High Contrast, and keyboard focus stays on controls while they work. Parking-page instructions and site-validation messages are clearer.

**Privacy and permissions**

- Closing a parked window now deletes its recovery record even if the extension was idle when it closed.
- The new favicon permission displays the site icon Chrome has already saved; it adds no install warning and makes no request to the site. There is no analytics or data collection. Optional settings sync uses your own Chrome sync; pausing, protected tabs and window details never sync.

## 1.5.1.3

First Chrome Web Store release.

- Parks idle windows on a lightweight page and brings back your previous tab when you return.
- Works with Chrome Memory Saver, or unloads a parked window's tabs straight away.
- Site exclusions, per-tab protection, pause, and Clear parked tabs.
- Light, dark and automatic appearance.
