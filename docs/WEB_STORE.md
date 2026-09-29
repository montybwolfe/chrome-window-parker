# Chrome Web Store submission — v1.5.1.1

GitHub releases and Chrome Web Store submissions are separate. Nothing in this repository submits the extension automatically. This checklist assumes the v1.5.1 runtime and subsequent high-resolution artwork pass were completed.

## Chrome Web Store — what I need to update manually

| Item | Classification | Exact source or unchanged value |
| --- | --- | --- |
| Runtime ZIP | MUST UPDATE | Upload `dist/chrome-window-parker-v1.5.1.1.zip` from the matching GitHub Release. |
| Version | MUST UPDATE | Package manifest supplies `1.5.1.1`; verify after upload. |
| Long description | MUST UPDATE | Paste all of [description.txt](../store-listing/description.txt). |
| Popup screenshot | MUST UPDATE | Upload [screenshot-3-popup-1280x800.png](../store-listing/screenshot-3-popup-1280x800.png). |
| Short description | NO CHANGE NEEDED | Existing manifest summary. |
| Settings screenshot | NO CHANGE NEEDED | Regenerated, byte-identical preserved crop; Support is farther down the page. |
| Parked / other screenshots | NO CHANGE NEEDED | Unchanged; no new screenshot slot. |
| Small / marquee promotional tiles | NO CHANGE NEEDED | Both byte-identical. |
| Store icon | NO CHANGE NEEDED | Existing blue timer, byte-identical. |
| Category / language | NO CHANGE NEEDED | Functionality & UI / English. |
| Homepage URL | NO CHANGE NEEDED | `https://github.com/montybwolfe/chrome-window-parker` |
| Technical support URL | NO CHANGE NEEDED | `https://github.com/montybwolfe/chrome-window-parker/issues` |
| Privacy policy URL | VERIFY ONLY | Same `https://github.com/montybwolfe/chrome-window-parker/blob/main/PRIVACY.md`; published content now explains optional external navigation. |
| Single-purpose declaration | NO CHANGE NEEDED | Existing SINGLE PURPOSE DESCRIPTION in [privacy-fields.txt](../store-listing/privacy-fields.txt). |
| Tabs justification | NO CHANGE NEEDED | Existing TABS PERMISSION JUSTIFICATION, including v1.5.1 immediate-mode behavior. |
| Storage justification | NO CHANGE NEEDED | Existing STORAGE PERMISSION JUSTIFICATION. |
| Alarms justification | NO CHANGE NEEDED | Existing ALARMS PERMISSION JUSTIFICATION. |
| Downloads justification | NO CHANGE NEEDED | Existing DOWNLOADS PERMISSION JUSTIFICATION. |
| Data-use categories | NO CHANGE NEEDED | Existing local Web history / User activity disclosures; no payment-data category. |
| Data-handling explanatory copy | SHOULD UPDATE | If previously entered in a dashboard text field, replace with DATA HANDLING EXPLANATION in [privacy-fields.txt](../store-listing/privacy-fields.txt). |
| Limited-use certifications | VERIFY ONLY | Practices unchanged; personally confirm existing certifications. |
| Remote-code declaration | NO CHANGE NEEDED | Keep No. |
| Remote-code explanatory copy | SHOULD UPDATE | If present in the dashboard, replace the paragraph under REMOTE CODE in [privacy-fields.txt](../store-listing/privacy-fields.txt), retaining No. |
| In-app purchases | NO CHANGE NEEDED | Keep No; rationale below. |
| Mature content | NO CHANGE NEEDED | No. |
| Distribution settings | NO CHANGE NEEDED | Existing audience/regions/visibility; no funding-driven change. |
| Platform wording | VERIFY ONLY | macOS preview testing; installed-extension acceptance outstanding; Windows, Linux and ChromeOS unverified. |

**In-app purchases: No.** Nothing is sold or unlocked. Optional external contributions create no functionality, content, licence, subscription or entitlement in Window Parker. The [official payment policy](https://developer.chrome.com/docs/webstore/program-policies/policies#accepting-payment-from-users) addresses paid products/services and functionality; it does not explicitly define this precise voluntary-contribution case. Retaining No is our reasoned application to this implementation, not a claimed donation-specific ruling. See [the policy review](SUPPORT_DEVELOPMENT.md), including the relevant single plain-text funding URL in the secondary listing section.

All four permissions and the restrictive CSP are unchanged. No new transmission, remote code or data category is introduced. The homepage, help and privacy links keep their existing roles. Review the relevant live acceptance checks in [TESTING.md](../TESTING.md) before submitting.

1. Upload `chrome-window-parker-v1.5.1.1.zip` to the existing item and confirm version **1.5.1.1**. Use the runtime archive, not GitHub's source archive; its SHA-256 is in `dist/RELEASE-SHA256.txt`.
2. Replace the long description with `store-listing/description.txt`.
3. Replace only screenshot 3 with `store-listing/screenshot-3-popup-1280x800.png`; review its preview.
4. If the old explanatory text is present, refresh REMOTE CODE and DATA HANDLING EXPLANATION from `store-listing/privacy-fields.txt`; keep remote code and in-app purchases at **No** and keep the existing data categories.
5. Verify the unchanged privacy URL opens the updated policy, confirm limited-use certifications and accurate platform wording, then save/review the draft and submit when live acceptance is complete.
