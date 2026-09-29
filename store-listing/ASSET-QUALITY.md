# High-resolution artwork audit — 29 September 2026

This pass preserves the minimalist pale backgrounds, blue timer, type hierarchy, compositions and current UI. It replaces all five JPEG uploads with lossless PNG exports and regenerates the store icon from the original vector master. No old raster was upscaled or recompressed. The four runtime icons, extension code, manifest and v1.5.1 runtime ZIP are unchanged.

## Upload inventory

All six rows are **MUST UPDATE** in Chrome Web Store. Upload the final PNG, never a master from `sources/`.

| Exact filename | Final dimensions / format | High-resolution source |
| --- | --- | --- |
| screenshot-1-settings-1280x800.png | 1280×800 RGB PNG | Actual settings HTML/CSS, 5120×3200 PNG |
| screenshot-2-parked-1280x800.png | 1280×800 RGB PNG | Actual parked-page HTML/CSS, 5120×3200 PNG |
| screenshot-3-popup-1280x800.png | 1280×800 RGB PNG | Existing composition, 5120×3200 PNG; actual popup separately rendered at 1440×1264 |
| small-promo-440x280.png | 440×280 RGB PNG | Existing promo HTML/CSS, 1760×1120 PNG |
| marquee-promo-1400x560.png | 1400×560 RGB PNG | Existing promo HTML/CSS, 5600×2240 PNG |
| store-icon-128.png | 128×128 RGBA PNG | Original timer SVG rasterized at 512×512 |

Other regenerated assets: `docs/assets/promo-440x280.png` (440×280 PNG, exact copy of the small tile), and `docs/assets/parker-timer-{256,512,1024}.png` (256×256, 512×512, 1024×1024 RGBA PNG), each independently rendered from the SVG at 4× its final size. These documentation files do not require additional Store uploads.

## Pipeline and evidence

[Reproduction instructions](../tools/store-assets/README.md) and pinned dependencies are committed. Chrome renders the styled DOM through SVG foreignObject to a 4× PNG canvas, including native form state and high-resolution popup compositing. Every enlarged logo is sourced from `icons/parker-timer.svg`. Sharp performs one final Lanczos3 downsample. There are no JPEG intermediates. Full-resolution PNG masters, original-input SHA-256 hashes and final hashes live in `sources/`.

The verifier checks the 10 final raster assets, exact formats/dimensions, source hashes, and byte-for-byte reproduction from masters/vector sources. The five legacy JPEGs are removed and every current upload reference now points to PNG.

## Visual QA

Reviewed the final images at native 100% size, exact-pixel 200% views/detail crops, and half-size Store-style thumbnail views. Checked text, fine borders, native checkboxes and selected values, icons, popup controls, shadows and edge antialiasing. The popup is present and fully readable; Settings shows the original default enabled/15-minute/2-second state. No JPEG blocks/ringing or visibly enlarged source bitmap edges remain. The existing Settings viewport crop is retained, not shrunk to fit the full scrolling page. All screenshots use synthetic data.

Visual QA rejected an initial export that lost native form selection and omitted the popup iframe. The committed exporter explicitly preserves form attributes and composites the popup from its own 4× PNG render. The final set was regenerated and reviewed after those fixes. `node tools/store-assets/qa.mjs` recreates the local 100%/200%/thumbnail review gallery and detail crops under ignored `work/store-asset-qa/`.

211 existing tests pass. Rebuilding the runtime package yields its unchanged SHA-256:

`369d6764d1dddf9b2b3d0b068a55b5382a1f68d51be990f73181af97a0c6fc61`

## Dashboard actions for this pass

1. Replace all three screenshots with the named PNG files, preserving their order.
2. Replace the small promotional tile and the existing marquee with the named PNG files.
3. Replace the store icon with `store-icon-128.png`.
4. Review the image previews, save, then submit the listing update when ready.

No new runtime/version or text/privacy edits are introduced by this artwork pass. If the earlier v1.5.1 update is still pending, its ZIP, long-description and tabs-permission changes still apply separately; see START-HERE.md. No dashboard changes are submitted automatically.
