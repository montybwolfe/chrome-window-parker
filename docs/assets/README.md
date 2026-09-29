# Artwork

The [timer SVG](../../icons/parker-timer.svg) is the editable vector master: geometric shapes, blue and white clock hands, and a transparent background. It has a 128-unit viewBox and a 1024-pixel default canvas, with no filters, embedded raster images, fonts or external resources. It is an original design, not a Chrome logo or a Google affiliation mark.

Runtime PNGs are rasterized independently at 16, 32, 48 and 128 pixels. Preserve transparency and inspect exports at actual size on light and dark backgrounds. The 256-, 512- and 1024-pixel documentation icons are rendered from the vector at 4× target size and downsampled once with Lanczos3.

The 440×280 promotional image pairs the timer with “Let idle windows rest.” It is identical to the [Store promotional tile](../../store-listing/small-promo-440x280.png); its editable layout is in `tests/browser/promo.html`. Store screenshots use the real interface with synthetic data, never personal browsing information. The [artwork tooling](../../tools/store-assets/README.md) documents the export process.

## Project cover

[buy-me-a-coffee-cover-1600x400.png](buy-me-a-coffee-cover-1600x400.png) is the project support-page banner. The original SVG, 3200×800 PNG master and source hashes are retained in `sources/`. The cover is separate from the extension package and Store artwork.

To regenerate it, install the artwork tool dependencies and run `node tools/store-assets/cover.mjs` from the repository root. The renderer uses vector shapes and system typography at 2×, followed by one Lanczos3 downsample. Essential content sits within the central 70% of the width to allow for cropping.
