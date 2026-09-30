# Icons

There's one design: the blue timer in [`icons/parker-timer.svg`](../icons/parker-timer.svg), an editable vector (128-unit view box, no fonts, filters or embedded images). It's an original design, not a Chrome or Google mark.

| Where | File |
| --- | --- |
| Extension icons (`manifest.json`) | `icons/parker-timer-16.png`, `-32`, `-48`, `-128` |
| Toolbar button | `icons/parker-timer-16.png`, `-24`, `-32`, for 1×, 1.5× and 2× (Retina) screens |
| Popup and Settings headers, and the parking page's "Window parked" line | `icons/parker-timer-128.png`, shown at 18–40px |
| Page favicons | `icons/parker-timer-32.png` |
| Chrome Web Store | `store-listing/store-icon-128.png`: the timer at 96×96 inside 16px of transparent padding |
| Larger artwork | `docs/assets/parker-timer-256.png`, `-512`, `-1024` |

The runtime icons fill their canvas so the timer stays readable at 16px in the toolbar. Each PNG is a render of the SVG at its real size, never a resized PNG; `node tools/store-assets/icons.mjs 16 24 32 48 128` renders them. At 16px the stem, crown and hands are only one pixel wide, so that size moves them half a pixel onto whole pixels to keep them sharp; the shapes are otherwise identical. Only these five PNGs ship in the extension. The Store artwork is made by [the artwork tools](../tools/store-assets/README.md). After changing icons, reload the unpacked extension; Chrome can keep old icons cached until then.
