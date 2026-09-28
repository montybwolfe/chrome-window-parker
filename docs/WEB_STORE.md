# Chrome Web Store submission

Public listing copy and submission notes for Chrome Window Parker 1.3.0.

## Name

**Chrome Window Parker**

## Short description

Let the selected tab in an idle window sleep. Works alongside Chrome Memory Saver; restores when you return.

## Detailed description

Chrome may keep one selected tab loaded in every browser window, even when you have not used that window for a while. Chrome Window Parker lets that selected tab sleep too.

After a configurable period of inactivity, Window Parker switches the unused window to a lightweight temporary parking page. That allows the previously selected real tab to be discarded while the rest of your window — tabs, order, pins and groups — stays in place.

When you return and remain in the window for a short configurable delay, the previous tab is restored and the temporary parking page closes. Briefly passing through a window does not wake it.

Window Parker is designed to work alongside Chrome Memory Saver. Chrome continues managing normal background tabs; Window Parker focuses on the selected tab in an otherwise idle window. Already-sleeping tabs are left alone.

### Key features

- Adjustable parking and restore delays
- Protection for pinned and audio-playing tabs
- Site and individual-tab exclusions
- Pause/resume control from the toolbar
- Parked-window and sleeping-tab status
- Local-only operation with no telemetry or tracking

### Platform compatibility

Chrome Window Parker is currently **tested on macOS only** and was designed primarily for multi-window workflows using macOS Spaces.

It uses standard Chrome extension APIs and may also work on Windows, Linux and ChromeOS, but those platforms have not yet been formally tested and should be treated as unverified.

Requires Chrome 120 or later.

### Privacy

The extension runs locally in the user's Chrome profile. It has no analytics, advertising, telemetry, tracking, external servers or remote code. Tab URLs and titles are used locally for exclusions and restoration and are not sent to the developer.

### Important limitations

Discarding unloads a page and can lose unsaved work. Chrome cannot expose every kind of activity that should remain loaded, so users should exclude editing sessions, uploads, calls, screen sharing, silent media or other tabs that must stay active.

An active Chrome download temporarily pauses parking. Chrome controls the final discard, session restoration and window placement, so memory savings vary by workload.

Chrome Window Parker is an independent utility and is not affiliated with or endorsed by Google.

## Privacy and permission notes

**Single purpose:** allow the selected tab in an eligible inactive Chrome window to sleep, then restore it when the user deliberately returns.

| Permission | Why it is needed |
| --- | --- |
| `tabs` | Read local tab titles, URLs and state for exclusions, parking and restoration. |
| `storage` | Store settings and local recovery metadata. |
| `alarms` | Schedule inactivity checks and restore delays without continuous polling. |
| `downloads` | Detect active downloads and temporarily pause parking. Download metadata is not retained. |

There are no host permissions, content scripts or remote code. No user data is transmitted to the publisher or third parties.

Because the extension processes local tab URLs, titles and focus state, those uses should still be disclosed in the Chrome Web Store privacy questionnaire. The public privacy policy and the dashboard declarations should remain consistent.

- **Privacy policy:** https://github.com/montybwolfe/chrome-window-parker/blob/main/PRIVACY.md
- **Support:** https://github.com/montybwolfe/chrome-window-parker/issues
- **License:** MIT

## Store assets

Ready-to-upload assets are in [`store-listing/`](../store-listing/):

- `store-icon-128.png`
- `screenshot-1-settings-1280x800.jpg`
- `screenshot-2-parked-1280x800.jpg`
- `small-promo-440x280.jpg`
- `marquee-promo-1400x560.jpg`

The screenshots use synthetic test data and do not contain personal browsing information.

## Package

Run:

```sh
python3 scripts/package.py
```

For version 1.3.0 this creates:

```text
dist/chrome-window-parker-v1.3.0.zip
```

Upload that prepared ZIP to the Chrome Web Store. The same package is attached to the matching GitHub Release.

Do **not** upload:

- GitHub's automatically generated “Source code (zip)” archive;
- the full repository;
- the store-listing asset ZIP.

The runtime ZIP has `manifest.json` at its root and contains only the files needed by the extension.

## Before submitting

- Complete the relevant live checks in [TESTING.md](../TESTING.md).
- Confirm the icon on a real Chrome toolbar and in the Web Store preview.
- Review the screenshots and listing copy.
- Confirm the public privacy and support URLs work.
- Keep Windows/Linux/ChromeOS described as unverified until they have actually been tested.
- Upload the prepared runtime ZIP and complete the privacy declarations in the developer dashboard.

Chrome Web Store approval is handled by Google and is separate from the GitHub release process.
