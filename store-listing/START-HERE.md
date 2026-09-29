# Chrome Web Store listing assets

This folder contains the text and graphics prepared for the Chrome Web Store listing for version 1.5.1.

The extension package itself is separate. Upload **`chrome-window-parker-v1.5.1.zip`** from the matching GitHub Release (or the equivalent package generated in `dist/`). Do not upload this asset folder, the store-listing asset ZIP, or GitHub's automatically generated source archive as the extension package.

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
| Screenshot 1 | `screenshot-1-settings-1280x800.jpg` | 1280 × 800 JPEG |
| Screenshot 2 | `screenshot-2-parked-1280x800.jpg` | 1280 × 800 JPEG |
| Screenshot 3 | `screenshot-3-popup-1280x800.jpg` | 1280 × 800 JPEG |
| Small promotional tile | `small-promo-440x280.jpg` | 440 × 280 JPEG |
| Marquee promotional tile (optional) | `marquee-promo-1400x560.jpg` | 1400 × 560 JPEG |

The screenshots show the current interface rendered in Chrome with synthetic test data. The popup screenshot places the actual popup inside a presentation frame. They contain no personal browsing information and do not demonstrate measured memory savings.

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

## v1.5.1 changes

Upload the v1.5.1 runtime ZIP, replace the long description, and update TABS PERMISSION JUSTIFICATION in `privacy-fields.txt`. Immediate mode now covers every currently loaded eligible real tab in a newly parked window. The short description, all three screenshots, promotional tiles and store icon are unchanged; no image replacement is needed. Permission scope, privacy practices and other declarations remain the same.

## Before submitting

1. Complete the relevant live checks in [TESTING.md](../TESTING.md).
2. Confirm the icon and screenshots look correct in the Web Store preview.
3. Upload the prepared runtime ZIP, not GitHub's source-code ZIP.
4. Confirm the privacy policy and support links are publicly accessible.
5. Keep the listing's platform wording accurate: macOS tested; other desktop platforms unverified.
6. Save the draft, review it once more, then submit it through the Chrome Web Store Developer Dashboard.

Nothing in this folder submits or publishes the extension automatically.
