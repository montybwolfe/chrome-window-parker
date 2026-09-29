# Buy Me a Coffee button artwork

`buy-me-a-coffee-blue.png` is an unmodified copy of the official static blue button, downloaded on 29 September 2026 from:

https://cdn.buymeacoffee.com/buttons/v2/default-blue.png

It belongs to Buy Me a Coffee and is not relicensed under this repository's MIT license. It is used only in the README to link to the project's support page; it is excluded from the extension runtime ZIP. The installed extension contains no funding interface, image or widget.

The official [brand kit](https://buymeacoffee.com/brand) supplies downloadable graphics for promoting a creator page. The official [button integration guide](https://help.buymeacoffee.com/en/articles/3336564-monetising-medium-with-buy-me-a-coffee) specifically instructs creators to download the assets, upload the button image and link it to their page. Those published instructions support this use. The general [terms](https://buymeacoffee.com/terms) retain Buy Me a Coffee's intellectual-property rights; no broad redistribution or relicensing rights are claimed.

SHA-256: `db8acba743bbb963572096938e76ba9f317eb2a9f9740f532cb86843893dec02`

## Cover image

Upload `docs/assets/buy-me-a-coffee-cover-1600x400.png` manually using the cover-image control on your Buy Me a Coffee page. It is a 1600×400 RGB sRGB PNG, with original vector source and a 3200×800 PNG master retained under `docs/assets/sources/`. This original project banner features “Small tools, thoughtfully made.” and **Chrome Window Parker**, with the existing timer and layered-window motif. It is not a Store or runtime asset.

Reproduce from the repository root with `node tools/store-assets/cover.mjs` after installing the existing store-tool dependencies. The renderer uses vector shapes and system typography at 2×, then one Lanczos3 downsample. Source/master/output hashes are in `sources/buy-me-a-coffee-cover.json`. Essential content stays within the central 70% of the width with generous vertical margins; review the site's own crop preview when uploading. No amounts, payment logos, private details or external raster inputs appear in the cover.
