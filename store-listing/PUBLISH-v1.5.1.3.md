# Publish Chrome Window Parker v1.5.1.3

Your dashboard still contains **v1.5.0** material. This sheet covers the full cumulative update to **v1.5.1.3**, verified against its preserved commit `bc0530b9649b652f158745536603445db3d08696`; the [comparison record](BASELINE-v1.5.0.json) preserves the evidence. GitHub publication does not update the Chrome Web Store.

## Upload these files — MUST UPDATE

**Extension package:** `dist/chrome-window-parker-v1.5.1.3.zip`, also attached to the [GitHub Release](https://github.com/montybwolfe/chrome-window-parker/releases/tag/v1.5.1.3). Use this runtime ZIP, not the GitHub source archive. Match its checksum against `dist/RELEASE-SHA256.txt`.

**Version/package — MUST UPDATE:** uploading the ZIP supplies **1.5.1.3** from its root manifest. Confirm the displayed version afterward; there is no separate manual version field.

| Dashboard image | Exact repository path | Dimensions / format |
| --- | --- | --- |
| Store icon — MUST UPDATE | `store-listing/store-icon-128.png` | 128×128 PNG |
| Screenshot 1 — MUST UPDATE | `store-listing/screenshot-1-settings-1280x800.png` | 1280×800 PNG |
| Screenshot 2 — MUST UPDATE | `store-listing/screenshot-2-parked-1280x800.png` | 1280×800 PNG |
| Screenshot 3 — MUST UPDATE | `store-listing/screenshot-3-popup-1280x800.png` | 1280×800 PNG |
| Small promo — MUST UPDATE | `store-listing/small-promo-440x280.png` | 440×280 PNG |
| Marquee — MUST UPDATE | `store-listing/marquee-promo-1400x560.png` | 1400×560 PNG |

Replace all six images, including the optional marquee already used in your listing. The high-resolution PNG pass occurred after v1.5.0. Do not upload the 4× masters or the repository-only cover artwork.

## Long description — MUST UPDATE

Source: [store-listing/description.txt](description.txt). Paste the entire text:

```text
Let idle windows rest. Pick up where you left off.

If you keep a Chrome window for each project or desktop, each one has a selected tab even while you work elsewhere. Chrome Window Parker switches an unused window to a lightweight parking page, giving its previous tab a chance to sleep under Chrome Memory Saver.

Your tabs stay in the same window, with their order, pins and groups intact. Return and stay for a moment to bring back your previous tab and close the parking page. Briefly passing through another desktop leaves that window parked.

CHOOSE HOW TABS SLEEP

Let Chrome decide is the default. Chrome Window Parker makes the previous tab a background tab, then leaves unloading to Chrome. It makes no discard requests in this mode. Keep Memory Saver enabled at your preferred level; Chrome decides whether and when to reclaim memory.

Discard immediately is optional. When a window is newly parked, it asks Chrome to unload every currently loaded eligible real tab in that window. Protected and ineligible tabs are skipped individually. Unloading can lose unsaved page state, so use exclusions for important work.

Both modes leave already-sleeping tabs alone. A mode change applies to the next parking cycle, without unloading or waking tabs in already-parked windows. Returning selects only your saved tab and Chrome reloads it if needed. Chrome Window Parker does not change Memory Saver settings or Chrome's always-active site list.

SET IT UP ONCE

• Park after 15 minutes and restore after 2 seconds by default, with adjustable delays.
• Choose Auto, Light or Dark appearance across settings, popup and parking pages.
• Skip windows whose selected tab is pinned, playing audio or excluded.
• Exclude sites or protect individual tabs for the current browser session.
• Check live parked-window and sleeping-tab counts in the toolbar.
• Pause automation or clear parking pages across your windows when needed. Clear parked tabs removes temporary parking pages/state, restores at most one appropriate real tab per affected window and never initiates discards.

BUILT FOR MULTIPLE WINDOWS

Designed around macOS Spaces. Testing has been on macOS, with live release acceptance checks still outstanding. Windows, Linux and ChromeOS are unverified. Requires Chrome 120 or later. Incognito and special browser windows are excluded.

LOCAL BY DESIGN

No account, analytics, advertising, telemetry or remote code. Tab URLs, titles and window/tab activity are handled locally for exclusions and restoration, never sent to the developer. Settings and recovery details stay in your Chrome profile.

GOOD TO KNOW

Parking pauses during active Chrome downloads. Chrome cannot reliably expose every call, upload, screen-sharing session, video or unsaved edit to this extension. Exclude important sites; use Chrome's always-active site list too if they must remain loaded under Memory Saver.

Chrome Window Parker does not move or focus windows. Chrome controls session restoration and window placement. Memory savings depend on your pages and Chrome's decisions; no fixed reduction is promised.

FREE AND OPEN SOURCE

Chrome Window Parker is free and open source. All functionality is available without payment. If it’s useful to you, you can optionally support development: https://buymeacoffee.com/montybwolfe

Support opens a separate third-party website. Contributions unlock nothing, and Chrome Window Parker receives no payment details or supporter identity.

Chrome Window Parker is an independent project, not affiliated with or endorsed by Google.
```

## Tabs permission justification — MUST UPDATE

Source: [store-listing/privacy-fields.txt](privacy-fields.txt), TABS PERMISSION JUSTIFICATION. Paste:

```text
Read tab URLs, titles and state locally to apply exclusions, identify the previously selected tab, create the temporary parking page, restore that tab later, and request discard of every currently loaded eligible real tab in a newly parked window only when the user selects Discard immediately. In the default Let Chrome decide mode, no discard API is called. The Clear parked tabs action restores at most one regular tab per affected window, never initiates discards, and closes only this extension's inactive parking pages after checking a real tab is active. A parking-only window first receives a blank tab to preserve it. It does not read website page contents or transmit browsing information.
```

## Test instructions / access information — SHOULD UPDATE

No credentials or special access are needed. If the dashboard requests reviewer instructions, paste [store-listing/test-instructions.txt](test-instructions.txt):

```text
No account, sign-in, payment, credentials or external service is required. Use Chrome 120 or later in a disposable normal profile with saved test work.

1. Open Settings from the toolbar. Confirm Chrome Window Parker is enabled, Let Chrome decide is selected, and the defaults are 15 minutes / 2 seconds. For a quicker review, choose Custom and set the parking delay to 1 minute, then Save settings.
2. Open two normal Chrome windows with ordinary HTTPS tabs. Leave one window unfocused past the parking delay. Its selected tab should be replaced by the temporary Window parked page. In Let Chrome decide mode, Chrome controls unloading; an immediate rise in sleeping tabs is not required.
3. Return to that window for at least 2 seconds. Its saved tab should become selected and its parking page should close. A brief pass through the window should not restore it.
4. Select Discard immediately, save, and repeat with several loaded eligible real tabs in the idle window. Each eligible tab is considered for unloading; protected/already-sleeping tabs are skipped and Chrome can refuse a discard. Returning or changing settings stops stale remaining work.
5. Use Clear parked tabs. Parking pages/state should clear, at most one real tab per affected window should be restored, and no new discards should start. Check protection, pause/resume and Auto/Light/Dark; reset Settings afterward.

6. Opening the popup or Settings must not open an external page. Activate each small Support action once: one new normal tab should open to https://buymeacoffee.com/montybwolfe. This is optional and does not change settings or unlock anything. The parked page has no Support action.

UI previews and automated regression tests were run on macOS. Installed-extension acceptance is still outstanding; Windows, Linux and ChromeOS are unverified. See the repository's TESTING.md for the complete live checklist.
```

## Explanatory privacy text — SHOULD UPDATE

The declarations and data categories remain unchanged. If these explanatory text fields were previously populated, replace them with the following precise wording from [store-listing/privacy-fields.txt](privacy-fields.txt).

**REMOTE CODE:**

```text
No, I am not using remote code.
All JavaScript and other resources are packaged with the extension. Chrome Window Parker has no backend, background network requests, remotely loaded scripts or remote executable configuration. The optional Support action opens a separate third-party website only after user action.
```

**DATA HANDLING EXPLANATION:**

```text
The extension processes tab URLs, titles, tab/window identifiers, focus/activation state and timing locally for parking, exclusions and restoration. It queries in-progress download metadata only for its safety pause. No user data is sent to the developer or third parties, sold, used for advertising, or used for creditworthiness/lending. There is no telemetry, analytics, account login or tracking service. The optional Support action opens Buy Me a Coffee in a separate tab only after user action, without attaching browsing information. Chrome Window Parker receives no payment details or supporter identity and stores no supporter status.
```

## Fields to leave or verify

| Item | Classification | Final value / action |
| --- | --- | --- |
| Title | NO CHANGE NEEDED | Chrome Window Parker; supplied by package. |
| Short description | NO CHANGE NEEDED | Park idle windows, let Chrome manage tab sleeping, and return to your previous tab when you come back. |
| Category | NO CHANGE NEEDED | Functionality & UI. |
| Language | NO CHANGE NEEDED | English. |
| Promotional video | NO CHANGE NEEDED | Leave blank; no video supplied or required. |
| Homepage | NO CHANGE NEEDED | https://github.com/montybwolfe/chrome-window-parker |
| Technical support | NO CHANGE NEEDED | https://github.com/montybwolfe/chrome-window-parker/issues |
| Privacy policy URL | VERIFY ONLY | https://github.com/montybwolfe/chrome-window-parker/blob/main/PRIVACY.md — same URL, updated wording. |
| Official/verified website | NO CHANGE NEEDED | Leave unset; no verified domain supplied. |
| Mature content | NO CHANGE NEEDED | No. |
| In-app purchases | NO CHANGE NEEDED | No. Voluntary external support unlocks no functionality, content, licence, subscription or entitlement. |
| Single-purpose description | NO CHANGE NEEDED | Existing SINGLE PURPOSE DESCRIPTION in privacy-fields.txt is byte-identical to v1.5.0. |
| Storage justification | NO CHANGE NEEDED | Existing STORAGE PERMISSION JUSTIFICATION is byte-identical. |
| Alarms justification | NO CHANGE NEEDED | Existing ALARMS PERMISSION JUSTIFICATION is byte-identical. |
| Downloads justification | NO CHANGE NEEDED | Existing DOWNLOADS PERMISSION JUSTIFICATION is byte-identical. |
| Remote-code declaration | NO CHANGE NEEDED | No. Refresh only the optional explanatory paragraph above. |
| Data-use disclosures | NO CHANGE NEEDED | Existing local Web history / User activity categories remain byte-identical. No new data category or browsing-data transmission. Refresh only the optional explanation above. |
| Limited-use certifications | VERIFY ONLY | Practices unchanged; personally reconfirm required certifications. |
| Distribution | VERIFY ONLY | Keep your intended existing audience, regions and visibility. No code-driven change; dashboard selection is not in the repository. |
| Platform compatibility wording | VERIFY ONLY | macOS UI previews/automated tests; installed-extension acceptance outstanding; Windows, Linux and ChromeOS unverified. |

**In-app purchases stays No.** The official payment policy does not explicitly define this exact voluntary-contribution case. This decision applies its paid-products/functionality rules to an extension where nothing is sold or unlocked; it does not claim a donation-specific ruling.

## Final pre-submit checks

The package, required artwork, text, declarations and project links are supplied. No account, credentials, paid access or verified domain is needed to test the extension. There is no invented Store URL in the README: approval is pending. Keep **In-app purchases: No** and **Remote code: No**. See [official listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [package-update guidance](https://developer.chrome.com/docs/webstore/update) and [payment policy](https://developer.chrome.com/docs/webstore/program-policies/policies#accepting-payment-from-users).

Complete the installed-extension checks in [TESTING.md](../TESTING.md): real parking in both modes, several loaded eligible tabs, Clear, restore dwell, protection, pause/resume, themes, reload/update/restart, Errors page and permissions. Real Chrome HTTP previews do not replace those checks. No approval outcome is promised. Your signed-in account declarations/contact details and distribution choices must still be verified in the dashboard.

No known store-material blocker remains; any remaining installed-extension acceptance tests are listed separately.

## Ordered Developer Dashboard steps

1. Upload `chrome-window-parker-v1.5.1.3.zip` to the existing item. Confirm version **1.5.1.3**, title and unchanged summary read from the package.
2. Replace the long description with the exact text above.
3. Replace screenshots 1, 2 and 3 with the three named 1280×800 PNGs, preserving their order.
4. Replace the store icon, small promotional tile and existing marquee with their named PNGs.
5. Replace the tabs-permission justification with the exact text above; leave the other permission explanations and single purpose unchanged. Refresh the two explanatory privacy paragraphs if those text fields are present, retaining No remote code and existing data categories.
6. Add/update the supplied reviewer test instructions if that field is present; no credentials are needed.
7. Verify the existing privacy/support/homepage URLs, local-data disclosures, limited-use certifications, No remote code, No in-app purchases, No mature content, intended distribution and accurate platform wording.
8. Preview text and images, save, and submit for review after the installed-extension acceptance checks pass.
