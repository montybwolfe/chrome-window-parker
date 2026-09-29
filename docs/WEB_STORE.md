# Chrome Web Store submission

Use the v1.5.1 files in [store-listing](../store-listing/START-HERE.md) to update the existing listing. GitHub releases and Chrome Web Store submissions are separate; nothing in this repository submits the extension automatically.

## Copy and graphics

- **Long description:** paste [description.txt](../store-listing/description.txt).
- **Short description:** supplied by `manifest.json` in the uploaded package; mirrored in [fields.json](../store-listing/fields.json).
- **Category, language and links:** use [fields.json](../store-listing/fields.json).
- **Single purpose, permissions and privacy answers:** use the named sections of [privacy-fields.txt](../store-listing/privacy-fields.txt).
- **Images:** use the exact filenames in [START-HERE.md](../store-listing/START-HERE.md).

The listing introduces the multi-window workflow first. It explains that **Let Chrome decide** is the default and **Discard immediately** is optional. Screenshots show the final interface with synthetic data; the popup appears in a presentation frame. Promotional art uses the same blue timer and the message “Let idle windows rest.”

Screenshots, promotional tiles and the store icon are unchanged from v1.5.0 and do not need replacement for v1.5.1. The Settings screenshot shows the unchanged Chrome-managed default; the revised helper text appears only when Discard immediately is selected. The screenshot files are 1280 × 800, the small tile is 440 × 280, and the optional marquee is 1400 × 560. These dimensions follow [Chrome's listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

## Runtime package

```sh
python3 scripts/package.py
```

Upload `dist/chrome-window-parker-v1.5.1.zip`, also attached to the [matching GitHub release](https://github.com/montybwolfe/chrome-window-parker/releases/tag/v1.5.1). It has `manifest.json` at the root and contains only runtime files, four icons and the MIT license. Check its SHA-256 against `dist/RELEASE-SHA256.txt`.

GitHub's automatic source archive and the separate store asset bundle are not extension packages.

## Privacy and compatibility

Permissions remain `tabs`, `storage`, `alarms` and `downloads`. No host permission, content script or remote code was added. The browsing data categories, stored preferences and local-only processing are unchanged. Update the tabs justification to describe immediate mode covering every currently loaded eligible real tab in a newly parked window. Single-purpose, storage, alarms and downloads explanations remain valid.

Disclose local tab URLs/titles and window/tab activity in the dashboard's relevant data-use categories. Local processing is not the same as handling no data. Review the current labels and personally confirm the limited-use certifications. The [privacy policy](../PRIVACY.md) explains retention and removal.

Keep platform wording consistent: testing has been on macOS, with installed-extension release acceptance still outstanding; Windows, Linux and ChromeOS are unverified. Complete the live checklist in [TESTING.md](../TESTING.md) before store submission.

## Submission order

1. Complete the relevant live checks in TESTING.md.
2. Upload the v1.5.1 runtime ZIP to the existing item and verify the version.
3. Replace the long description from `store-listing/description.txt`.
4. Replace TABS PERMISSION JUSTIFICATION from `store-listing/privacy-fields.txt`.
5. Save the draft and review the changed text. Existing screenshots, artwork, summary and other declarations remain applicable.
6. Submit for Google's review when the draft and live checks are complete.
