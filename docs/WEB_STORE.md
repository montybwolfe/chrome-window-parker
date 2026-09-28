# Chrome Web Store submission

Prepared for version 1.2.0. This document is submission copy and a release checklist; it does not mean the extension has been submitted or approved.

## Name

Chrome Window Parker

## Short description

Let the selected tab in an idle window sleep. Works alongside Chrome Memory Saver; restores when you return.

## Detailed description

Chrome may keep one selected tab loaded in every window, even while you work elsewhere. Window Parker gives an unused window a lightweight parking tab so the previously selected page can sleep too.

**Platform status**

Chrome Window Parker has currently only been tested on macOS and is designed primarily for multi-window workflows across macOS Spaces. It uses standard Chrome extension APIs and may work on Windows, Linux, and ChromeOS, but those platforms have not been formally tested; their compatibility is unverified.

**How it works**

After an adjustable period of inactivity, Window Parker switches an eligible window to its parking page without asking Chrome to move or focus that window. Your real tabs stay in place. Return and remain in the window for a short, adjustable delay to restore the previous tab; brief visits do not wake it. You can also select a tab or use Restore tab at any time.

Window Parker complements Chrome Memory Saver rather than replacing it. Only the formerly selected real tab is explicitly discarded; Chrome continues managing ordinary background tabs. Existing sleeping tabs are left alone. The extension does not change Chrome's Memory Saver settings or exclusions.

Defaults are a 15-minute parking delay and a two-second return delay. Pinned tabs and tabs playing audio are protected by default. Add site or individual-tab exclusions and pause automation from the toolbar popup. Sleeping-tab counts describe the current state, including tabs put to sleep by Chrome; they do not claim how much memory this extension saved.

**Privacy**

Local-only, with no telemetry, analytics, tracking, external servers or remote code. Settings and the previous tab's recovery details stay in your Chrome profile. Tab URLs and titles are used locally and are not sent to the developer. The extension does not inspect page content.

**Before using it**

Requires Chrome 120 or later. Incognito windows are excluded. Discarding unloads a page and can lose unsaved work. Exclude editing sessions, calls, screen sharing, uploads, silent video and other activities that must stay loaded; these cannot all be detected reliably. An active Chrome download pauses parking. Chrome may delay or decline parking operations, and memory savings vary. Chrome controls startup restoration and window placement. Other desktop platforms remain unverified as stated above.

An independent utility, not affiliated with or endorsed by Google.

## Privacy and permissions for the dashboard

Single purpose: allow eligible selected tabs in inactive windows to sleep, then restore the saved tab when the user deliberately returns.

| Permission | Reason |
| --- | --- |
| `tabs` | Read local tab titles, URLs and state for exclusions, parking and restoration. |
| `storage` | Store local settings and recovery metadata; keep transient window state and exclusions in session storage. |
| `alarms` | Schedule inactivity checks and recover interrupted return delays without continuous polling. |
| `downloads` | Check whether any download is in progress and pause parking globally. Download metadata is not retained. |

No host permissions, content scripts or remote code are used. No user data is transmitted to the publisher or third parties. The extension does access and retain local tab URLs/titles for its purpose; do not describe it as never accessing browsing information. Review the current dashboard definitions when completing the data-use declarations and disclose local processing where applicable. The declarations and the policy must agree.

Public policy: https://github.com/montybwolfe/chrome-window-parker/blob/main/PRIVACY.md

Support: https://github.com/montybwolfe/chrome-window-parker/issues

## Assets

- `icons/icon.svg`: editable vector master with a 1024-pixel default size.
- `icons/16.png`, `32.png`, `48.png`, `128.png`: transparent extension exports, wired into the manifest.
- `docs/assets/icon-1024.png`: high-resolution transparent artwork.
- `docs/assets/promo-440x280.png`: small promotional image.
- Capture at least one **actual installed-extension** screenshot before submission (1280×800 or 640×400). Development fixture previews are not evidence of installed behavior and should not be submitted as such.

## Before submitting

1. Complete and record the live macOS checks in [Testing](../TESTING.md), including exact OS and Chrome versions. Keep other platforms described as unverified.
2. Capture genuine screenshots with synthetic, non-private tabs. Check the icon on light and dark toolbars at normal and Retina scale.
3. Verify the public policy and support links, review the current dashboard privacy questions and [program policies](https://developer.chrome.com/docs/webstore/program-policies/), and choose a source-code license if you intend to grant reuse rights. Public repository visibility alone does not do that.
4. Run tests and `python3 scripts/package.py`; upload the versioned ZIP with `manifest.json` at its root. Do not upload the entire repository.
5. Enter the copy above, attach assets and privacy disclosures, and submit through your developer account. Review approval is a separate step; nothing here guarantees approval. This task does not publish to the store.

Asset sizes follow the [Chrome Web Store image guidance](https://developer.chrome.com/docs/webstore/images). See the [publishing guide](https://developer.chrome.com/docs/webstore/publish) for the current submission process.
