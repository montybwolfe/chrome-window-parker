# Icon inventory — 1.3.0

The single design is the blue timer in `icons/parker-timer.svg`, an editable 1024px vector master. Each PNG is rasterized independently at its target resolution. No low-resolution bitmap is upscaled to make larger artwork.

| Surface | File / declaration |
| --- | --- |
| Chrome extension manager / installation | `manifest.icons`: `icons/parker-timer-16.png`, `icons/parker-timer-32.png`, `icons/parker-timer-48.png`, `icons/parker-timer-128.png`; Chrome selects the appropriate size (normally 48px in the manager) |
| Toolbar action | `action.default_icon`: `icons/parker-timer-16.png` and `icons/parker-timer-32.png` |
| Options header | `icons/parker-timer-128.png`, displayed at 36 CSS pixels |
| Popup header | `icons/parker-timer-128.png`, displayed at 28 CSS pixels |
| Parked page | `icons/parker-timer-128.png`, displayed at 40 CSS pixels |
| Options, popup and parked favicons | `icons/parker-timer-32.png` |
| README | `icons/parker-timer-128.png`, displayed at 64 CSS pixels |
| High-resolution artwork | `docs/assets/parker-timer-256.png`, `docs/assets/parker-timer-512.png`, `docs/assets/parker-timer-1024.png` |
| Store promotional tile | `docs/assets/promo-440x280.png`, using the same timer |
| Store ZIP | Only the four runtime timer PNGs; no SVG or marketing art |

The old generic numeric PNG filenames and `icon.svg` are removed from the current source and installed-folder deliverables. There are no CSS background images, inline SVG substitutes, remote favicons or runtime `setIcon` calls. Historical Git commits and explicitly archived backups may retain old artwork; they are not loaded or packaged.

The audit found that reusing the same icon paths could leave the old running extension displaying older artwork until reloaded. It also found 32/48px sources being rendered at 28/36 CSS pixels, insufficient for 2× displays. New paths and 128px page sources address those issues. They do not force Chrome to reload an already-running unpacked extension.

Automated checks verify references, exact PNG dimensions, absence of legacy runtime paths and release contents. Actual Chrome manager/toolbar rendering must be checked after manually reloading the same unpacked extension, because internal extension-page access is blocked in the available automation. Refresh old options/parking pages too.
