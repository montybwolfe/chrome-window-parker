# Fill the Chrome Web Store listing

This folder contains upload assets and text for version 1.3.0. The extension's runtime ZIP is separate: `dist/chrome-window-parker-v1.3.0.zip` in the repository. Do not upload this asset folder/asset ZIP as the extension package.

The dashboard rejected automated access, so none of its fields or uploads have been saved by this task. Enter the following values and save the draft. Nothing has been submitted for review or published to the Chrome Web Store.

## Product details

| Dashboard field | What to enter |
| --- | --- |
| Title from package | Already populated: Chrome Window Parker |
| Summary from package | Already populated from manifest.json; leave it unchanged |
| Description | Paste all of `description.txt` as plain text |
| Category | Functionality & UI |
| Language | English; if the dashboard requires a regional variant, English (United States) |

The description prominently states macOS-only testing and unverified Windows/Linux/ChromeOS compatibility. Functionality & UI is the store category for tab managers and other browser-interface utilities.

## Graphic assets

| Upload slot | File | Dimensions |
| --- | --- | --- |
| Store icon | `store-icon-128.png` | 128 × 128, transparent PNG |
| Screenshot 1 | `screenshot-1-settings-1280x800.jpg` | 1280 × 800, JPEG |
| Screenshot 2 | `screenshot-2-parked-1280x800.jpg` | 1280 × 800, JPEG |
| Small promotional tile | `small-promo-440x280.jpg` | 440 × 280, JPEG |
| Marquee promotional tile (optional) | `marquee-promo-1400x560.jpg` | 1400 × 560, JPEG |
| Promotional video (optional) | Leave empty; no video has been supplied | — |

Screenshots are unedited browser captures of the actual packaged HTML/CSS interface, rendered locally with synthetic test data. Settings shows the default configuration. The parked page shows sample tabs with automation paused so it stays visible. These demonstrate the interface, not an installed-extension test, measured memory savings, or a real user's browsing. No personal tabs are shown. Replace them with installed-copy captures if you want live-profile screenshots before submission. The timer artwork is exported from the original vector master; no low-resolution image was enlarged to create it.

## Additional fields

- **Official URL / verified website:** leave None/blank unless you already have a verified domain. The GitHub repository is not a domain-ownership verification.
- **Homepage URL:** https://github.com/montybwolfe/chrome-window-parker
- **Support URL:** https://github.com/montybwolfe/chrome-window-parker/issues
- **Mature content:** No / unchecked.
- **In-app purchases:** No, if this field appears.
- **Privacy policy URL:** https://github.com/montybwolfe/chrome-window-parker/blob/main/PRIVACY.md

No review badges, videos, verified-domain claims or support email addresses have been invented. Publisher identity/contact or account-verification fields must use your own account information if the dashboard requests them.

## Privacy practices

Use the separately labeled sections in `privacy-fields.txt` for single purpose, each permission, remote-code declaration and privacy URL. Disclose local tab URLs/titles and focus/activation activity. Local-only processing is still user-data handling under the store's guidance. Review and personally confirm the limited-use certifications; these have not been submitted automatically.

## Finish

Save the listing draft, check each upload preview, and complete the remaining installed-extension checks in TESTING.md before submitting for review. This work has not changed your distribution settings or selected a publication date.

Sources checked 28 September 2026: [listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [image sizes](https://developer.chrome.com/docs/webstore/images), [category guidance](https://developer.chrome.com/docs/webstore/best-practices#choose_your_extensions_category_well), [local-data disclosure](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq#3_does_an_extension_need_to_disclose_user_data_handling_if_the_data_is_only_processed_or_stored_locally_on_a_users_device).
