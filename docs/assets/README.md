# Artwork

`../../icons/parker-timer.svg` is the editable vector master. It contains only geometric shapes, one solid blue and white clock hands, with a transparent background. It has a 128-unit viewBox and a 1024-pixel default canvas. There are no filters, embedded raster images, fonts or external resources.

PNG exports were rasterized from that source at each target size, rather than repeatedly scaling small PNGs. Export the same square canvas at 16, 32, 48 and 128 pixels after editing; preserve transparency and inspect at actual size on light and dark backgrounds. The 256-, 512- and 1024-pixel copies are independently rasterized from the vector master at 4× target size and downsampled once with Lanczos3. The 440×280 promotional image pairs the timer with the core message: “Let idle windows rest.” Its lossless PNG is identical to the new store small tile. Its editable layout is in `../../tests/browser/promo.html`; it matches the store promotional tile.

The timer is an original geometric design, not a Chrome logo or a Google affiliation mark. Current store screenshots and promotional images are in `store-listing/`. Screenshots render the real interface with synthetic fixture data; they contain no personal browsing information.

The reproducible export pipeline is in [tools/store-assets](../../tools/store-assets/README.md). It replaces the old JPEG store exports without changing their design.

The repository-only [support-page artwork](BUY-ME-A-COFFEE.md) has separate source/provenance and is excluded from Store exports and the runtime package.
