# Chrome Web Store submission

Use the v1.5.0 files in [store-listing](../store-listing/START-HERE.md) to update the existing listing. GitHub releases and Chrome Web Store submissions are separate; nothing in this repository submits the extension automatically.

## Copy and graphics

- **Long description:** paste [description.txt](../store-listing/description.txt).
- **Short description:** supplied by `manifest.json` in the uploaded package; mirrored in [fields.json](../store-listing/fields.json).
- **Category, language and links:** use [fields.json](../store-listing/fields.json).
- **Single purpose, permissions and privacy answers:** use the named sections of [privacy-fields.txt](../store-listing/privacy-fields.txt).
- **Images:** use the exact filenames in [START-HERE.md](../store-listing/START-HERE.md).

The listing introduces the multi-window workflow first. It explains that **Let Chrome decide** is the default and **Discard immediately** is optional. Screenshots show the final interface with synthetic data; the popup appears in a presentation frame. Promotional art uses the same blue timer and the message “Let idle windows rest.”

The store icon remains unchanged. Replace all three screenshots and both promotional tiles. The screenshot files are 1280 × 800, the small tile is 440 × 280, and the optional marquee is 1400 × 560. These dimensions follow [Chrome's listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

## Runtime package

```sh
python3 scripts/package.py
```

Upload `dist/chrome-window-parker-v1.5.0.zip`, also attached to the [matching GitHub release](https://github.com/montybwolfe/chrome-window-parker/releases/tag/v1.5.0). It has `manifest.json` at the root and contains only runtime files, four icons and the MIT license. Check its SHA-256 against `dist/RELEASE-SHA256.txt`.

GitHub's automatic source archive and the separate store asset bundle are not extension packages.

## Privacy and compatibility

Permissions remain `tabs`, `storage`, `alarms` and `downloads`. No host permission, content script or remote code was added. Tab sleeping mode and appearance are new local preferences; the browsing data categories and local-only processing are unchanged. Update the single-purpose, tabs and storage wording to describe the new default accurately. Alarms and downloads justifications remain valid.

Disclose local tab URLs/titles and window/tab activity in the dashboard's relevant data-use categories. Local processing is not the same as handling no data. Review the current labels and personally confirm the limited-use certifications. The [privacy policy](../PRIVACY.md) explains retention and removal.

Keep platform wording consistent: testing has been on macOS, with installed-extension release acceptance still outstanding; Windows, Linux and ChromeOS are unverified. Complete the live checklist in [TESTING.md](../TESTING.md) before store submission.

## Submission order

1. Complete live installed-extension checks and save the results.
2. Upload the v1.5.0 runtime ZIP to the existing item; verify version and summary.
3. Replace the long description, screenshots and promotional tiles.
4. Check the icon, category, language and public links.
5. Update single-purpose, tabs and storage answers; review unchanged permission and privacy answers against the actual behavior.
6. Review data-use categories and personally confirm the limited-use certifications, remote-code answer, mature-content answer and purchase answer.
7. Save the draft, preview the listing and inspect every image at its intended size.
8. Submit for Google's review when the draft and live checks are complete.
