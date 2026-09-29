# Icon inventory

The single design is the blue timer in `icons/parker-timer.svg`, an editable 1024px vector master. Runtime PNGs are rasterized independently. Store/documentation PNGs render independently at 4× each target size and receive one Lanczos3 downsample. No low-resolution bitmap is upscaled to make larger artwork.

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
| Documentation promotional tile | `docs/assets/promo-440x280.png`, using the same timer |
| Store ZIP | Only the four runtime timer PNGs; no SVG or marketing art |

All current runtime references use this timer. There are no CSS background images, remote favicons or runtime icon replacements. Store listing assets use the SVG master directly in the export-only HTML, including the embedded popup. See [the lossless exporter](../tools/store-assets/README.md).

Page headers use 128px sources for crisp rendering at 28–40 CSS pixels on Retina displays. Automated checks verify all declared PNG dimensions and references. Reload an unpacked extension and refresh its pages to display updated artwork; existing Chrome processes can retain cached icons.
