# Chrome Web Store listing assets

This folder contains the text and graphics prepared for the Chrome Web Store listing for version 1.5.1.1.

The extension package itself is separate. Upload **`chrome-window-parker-v1.5.1.1.zip`** from the matching GitHub Release (or the equivalent package generated in `dist/`). Do not upload this asset folder, the store-listing asset ZIP, or GitHub's automatically generated source archive as the extension package.

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

## v1.5.1.1 changes

Upload the v1.5.1.1 runtime ZIP, replace the long description, and replace only `screenshot-3-popup-1280x800.png`. Settings was regenerated from the same 4× pipeline but remains byte-identical: the new bottom Support section is outside the preserved viewport crop. The parked screenshot, both promotional tiles and store icon are also byte-identical to the completed high-resolution asset pass.

Keep **In-app purchases: No**: voluntary external support unlocks nothing and the extension sells no functionality, goods, subscription or entitlement. See [the official-policy review and its precise scope](../docs/SUPPORT_DEVELOPMENT.md). The short description, single purpose, four permission justifications, data categories, remote-code answer and three project URLs remain unchanged. If the dashboard contains the old explanatory paragraphs, refresh only REMOTE CODE and DATA HANDLING EXPLANATION from `privacy-fields.txt` to distinguish deliberate external navigation from background networking.

## Before submitting

1. Complete the relevant live checks in [TESTING.md](../TESTING.md).
2. Confirm the icon and screenshots look correct in the Web Store preview.
3. Upload the prepared runtime ZIP, not GitHub's source-code ZIP.
4. Confirm the privacy policy and support links are publicly accessible.
5. Keep the listing's platform wording accurate: macOS tested; other desktop platforms unverified.
6. Save the draft, review it once more, then submit it through the Chrome Web Store Developer Dashboard.

Nothing in this folder submits or publishes the extension automatically.

## Earlier high-resolution asset pass (already completed)

That earlier pass replaced all six uploaded images with PNG files. For v1.5.1.1, only the popup image changes. The visual direction is unchanged. Source masters and provenance are retained in `sources/`; upload only the final files listed above. The documentation promo and high-resolution timer exports were also regenerated. Reproduction and QA details: [tools/store-assets](../tools/store-assets/README.md) and [ASSET-QUALITY.md](ASSET-QUALITY.md). That artwork-only pass required no runtime/version changes; v1.5.1.1 now requires the runtime and copy updates above.
