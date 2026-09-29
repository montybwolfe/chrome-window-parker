# Lossless store artwork

This development-only tool preserves the existing HTML/CSS compositions. It is excluded from the runtime package and does not access real tabs or installed-extension APIs.

## Reproduce

Use Node 20+, pnpm and desktop Chrome on macOS (the source typography uses the system font).

```sh
cd tools/store-assets
pnpm install --frozen-lockfile --ignore-scripts
node server.mjs
```

Open `http://127.0.0.1:8766` in Chrome at 100% page zoom and click **Export all five images**. Wait for the completion message, then run in another terminal:

```sh
node tools/store-assets/verify.mjs
```

Run that verification command from the repository root. Stop the server with Ctrl-C. Restart it after changing sources before exporting again. The server binds only to loopback, serves an explicit allowlist, restricts writes to the five named exports, checks request origin and PNG dimensions, and caps upload size.

The fixture starts from defaults independent of previously saved preview settings. All tab names/counts are synthetic. Settings preserves the existing 1280×800 viewport crop; it intentionally does not shrink the full settings page into an unreadable overview.

## Rendering

[dom-to-image-more](https://github.com/IDisposable/dom-to-image-more) 3.11.0 serializes the live styled DOM to SVG foreignObject; Chrome rasterizes that source directly at **4×** through its canvas renderer. This is a DOM-derived UI render, not a native screenshot API capture. Form values/checked state are explicitly preserved. The actual popup iframe is rendered separately at 1440×1264, then composited at 360×316 CSS pixels on the 4× parent canvas. There is no low-resolution popup intermediary.

The exporter substitutes the existing SVG timer master for the page/header bitmaps, only in its served development HTML. Thus even 48px branding uses vector input at 4×; no 128px icon is enlarged. Runtime files and icons are untouched. Native checkbox rendering and platform font antialiasing may vary with Chrome/macOS versions; inspect every regenerated set visually.

| Asset | Lossless master | Final PNG |
| --- | --- | --- |
| Settings | 5120×3200 | 1280×800 |
| Parked page | 5120×3200 | 1280×800 |
| Popup composition | 5120×3200 | 1280×800 |
| Small promo | 1760×1120 | 440×280 |
| Marquee | 5600×2240 | 1400×560 |
| Store icon | SVG rasterized at 512×512 | 128×128, transparent |
| Documentation icons | SVG at 1024, 2048, 4096 square | 256, 512, 1024 square |

Every UI composition has one final Lanczos3 downsample, flattened to RGB sRGB PNG. No JPEG input or intermediate is used. PNG compression is lossless. The docs promo is a byte-identical copy of the final small tile. High-resolution masters and per-image source/output hashes are retained under `store-listing/sources/`; they are not upload files.

`verify.mjs` checks exact dimensions/formats, hashes of original inputs and masters, byte-identical reproduction of the final downsample, independent SVG-derived icon exports, and absence of old listing JPEGs. Inspect the finals at 100%, 200%, and a typical store thumbnail size; dimensions alone are not visual QA.
