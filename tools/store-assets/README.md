# Store artwork

The Chrome Web Store screenshots, promo tiles, Store icon and the support-page cover are generated here. It's development-only, has no npm dependencies, and never ships in the extension.

## Regenerate

Needs Node 20+ and desktop Chrome (on macOS by default; set `CHROME` to another Chrome binary if needed). Run from the repository root:

```sh
node tools/store-assets/capture.mjs   # about 3 minutes
node tools/store-assets/compose.mjs
node tools/store-assets/verify.mjs
```

**capture.mjs** installs this folder as an extension in a throwaway headless Chrome profile, opens a few windows of made-up pages served from your own machine, and lets them park for real (with a 1-minute delay). It then captures the real parked page, popup and Settings in `store-listing/sources/ui/`. Nothing from your own Chrome profile is used.

**compose.mjs** renders the designs in `compositions/` around those captures at 2× and halves them, writing opaque PNGs (the Store icon keeps its transparency). It records the SHA-256 of every output and input in `store-listing/sources/assets.json`.

**verify.mjs** checks sizes and transparency, that each image matches its record, and that nothing it was made from has changed since. It also checks that the captured UI still matches the extension's current pages, so stale screenshots can't slip into a release. `npm test` runs the same checks except that last one.

## Assets

| File | Size | Notes |
| --- | --- | --- |
| `store-listing/screenshot-1-parked-1280x800.png` … `-5-dark` | 1280×800 | Five screenshots, in Store order |
| `store-listing/small-promo-440x280.png` | 440×280 | Small promo tile |
| `store-listing/marquee-promo-1400x560.png` | 1400×560 | Marquee promo tile |
| `store-listing/store-icon-128.png` | 128×128 | Timer at 96×96 with 16px transparent padding, as the Store asks |
| `docs/assets/buy-me-a-coffee-cover-1600x400.png` | 1600×400 | Support-page banner |

The browser frame in the screenshots is simplified context. Everything inside it is a real capture of the extension, with made-up tab names.
