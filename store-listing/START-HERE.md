# Chrome Web Store listing assets

This folder contains the text and graphics prepared for the Chrome Web Store listing for version 1.5.1.3.

The extension package itself is separate. Upload **`chrome-window-parker-v1.5.1.3.zip`** from the matching GitHub Release (or the equivalent package generated in `dist/`). Do not upload this asset folder, the store-listing asset ZIP, or GitHub's automatically generated source archive as the extension package.

## Product details

| Dashboard field | Value |
| --- | --- |
| Title | Chrome Window Parker |
| Summary | Use the summary from `manifest.json` |
| Description | Paste the contents of `description.txt` |
| Category | Functionality & UI |
| Language | English |

The copy explains the default Let Chrome decide mode and optional Discard immediately mode. Testing has been on macOS, with installed-extension acceptance still outstanding. Windows, Linux and ChromeOS remain unverified.

## Graphic assets

| Upload slot | File | Dimensions |
| --- | --- | --- |
| Store icon | `store-icon-128.png` | 128 × 128 PNG |
| Screenshot 1 | `screenshot-1-settings-1280x800.png` | 1280 × 800 PNG |
| Screenshot 2 | `screenshot-2-parked-1280x800.png` | 1280 × 800 PNG |
| Screenshot 3 | `screenshot-3-popup-1280x800.png` | 1280 × 800 PNG |
| Small promotional tile | `small-promo-440x280.png` | 440 × 280 PNG |
| Marquee promotional tile (optional) | `marquee-promo-1400x560.png` | 1400 × 560 PNG |

The screenshots show the current interface rendered from HTML/CSS in Chrome at 4× resolution with synthetic test data, then downsampled once to lossless PNG. The popup screenshot places the actual popup inside a presentation frame. They contain no personal browsing information and do not demonstrate measured memory savings.

## Links

- **Homepage:** https://github.com/montybwolfe/chrome-window-parker
- **Support:** https://github.com/montybwolfe/chrome-window-parker/issues
- **Privacy policy:** https://github.com/montybwolfe/chrome-window-parker/blob/main/PRIVACY.md
- **Official/verified website:** leave blank unless a verified domain is added later
- **Promotional video:** optional; none currently supplied
- **Mature content:** No
- **In-app purchases:** No

## Privacy practices

Use `privacy-fields.txt` when completing the dashboard's privacy and permission questions. The extension handles tab URLs/titles and focus state locally, so those uses should still be disclosed even though no data is transmitted externally.

Review the Chrome Web Store's current wording before submitting and personally confirm any required certifications.

## Publish v1.5.1.3 from your v1.5.0 dashboard

Use [PUBLISH-v1.5.1.3.md](PUBLISH-v1.5.1.3.md) for the complete cumulative checklist and exact text to paste. Replace the package, long description, tabs-permission justification, three screenshots, both promotional tiles and store icon. The package supplies the version automatically.

The Store screenshots and promo files use the full product name **Chrome Window Parker** wherever the product is named. Ordinary status text such as “Window parked” is intentional. The popup has a small Support text action and Settings has a secondary Support development action. The parked page has none. Store promotional artwork keeps the product as its main message; no branded funding graphics are embedded.

Complete the live checks in [TESTING.md](../TESTING.md), review the uploaded images at native size, verify the existing project/privacy/support URLs and certifications, then save and submit when ready. Nothing here submits or publishes the extension automatically.

Source masters and provenance are retained in `sources/`; upload only the final files in the table above. Reproduction details: [tools/store-assets](../tools/store-assets/README.md) and [ASSET-QUALITY.md](ASSET-QUALITY.md).
