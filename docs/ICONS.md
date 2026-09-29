# Icons

There's one design: the blue timer in [`icons/parker-timer.svg`](../icons/parker-timer.svg), an editable vector (128-unit view box, no fonts, filters or embedded images). It's an original design, not a Chrome or Google mark.

| Where | File |
| --- | --- |
| Extension icons (`manifest.json`) | `icons/parker-timer-16.png`, `-32`, `-48`, `-128` |
| Toolbar button | `icons/parker-timer-16.png`, `icons/parker-timer-32.png` |
| Popup, Settings and parked-page headers | `icons/parker-timer-128.png`, shown at 28–40px |
| Page favicons | `icons/parker-timer-32.png` |
| Chrome Web Store | `store-listing/store-icon-128.png`: the timer at 96×96 inside 16px of transparent padding |
| Larger artwork | `docs/assets/parker-timer-256.png`, `-512`, `-1024` |

The runtime icons fill their canvas so the timer stays readable at 16px in the toolbar. Only these four PNGs ship in the extension. The Store artwork is made by [the artwork tools](../tools/store-assets/README.md). After changing icons, reload the unpacked extension; Chrome can keep old icons cached until then.
