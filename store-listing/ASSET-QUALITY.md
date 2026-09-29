# Store artwork audit — v1.5.1.3

All five Store compositions were regenerated from current UI/templates with the full product name and compact Support action. The existing pale blue background, timer, typography and layered-window motif are preserved. All product-name text is **Chrome Window Parker**; “Window parked” remains ordinary status text.

| Upload file | Final PNG | Retained PNG master |
| --- | --- | --- |
| screenshot-1-settings-1280x800.png | 1280×800 RGB | 5120×3200 |
| screenshot-2-parked-1280x800.png | 1280×800 RGB | 5120×3200 |
| screenshot-3-popup-1280x800.png | 1280×800 RGB | 5120×3200 |
| small-promo-440x280.png | 440×280 RGB | 1760×1120 |
| marquee-promo-1400x560.png | 1400×560 RGB | 5600×2240 |
| store-icon-128.png | 128×128 RGBA | Original vector rendered at 512×512 |

**Replace all six dashboard images.** Your actual baseline is v1.5.0, which predates the lossless asset pass. The five old compositions were JPEGs; the icon hash also differs. Even unchanged current artwork needs replacement when it differs from that baseline. The [publishing sheet](PUBLISH-v1.5.1.3.md) includes the exact files and the [baseline comparison](BASELINE-v1.5.0.json) records hashes.

The existing [export pipeline](../tools/store-assets/README.md) renders live styled DOM through SVG foreignObject at 4×, preserving form values and compositing the actual popup from its independent 1440×1264 render. Timer graphics use the vector source. Each composition has one Lanczos3 downsample to sRGB PNG. There are no JPEG intermediates or enlarged low-resolution inputs. Settings preserves its readable 1280×800 viewport crop. Synthetic data only; no personal browsing information or measured memory-saving claim.

The verifier checks 10 final marketing raster files, dimensions, source/master hashes, independent vector icons, exact downsample reproduction and absence of legacy JPEGs. Visual review covers native size, 200% details and thumbnails: full product names, selected form values, readable popup controls, icon edges and quiet parked-page content. The documentation promo is byte-identical to the small Store tile; documentation icons remain independent 4× vector exports.

The current source templates, metadata and retained masters correspond to v1.5.1.3. `node tools/store-assets/qa.mjs` reproduces the local review gallery under ignored `work/store-asset-qa/`.
