# 1.3.0

- Remove the temporary parking page after confirming a real tab is active. Recreate it on the next parking cycle. Apply the same guarded cleanup to manual tab selection and interrupted-restoration recovery.
- Retain a parking-only window, handle missing targets and defer unsafe or temporarily refused cleanup. Keep ordinary sleeping backgrounds untouched.
- Give all timer assets distinct filenames, update every manifest/page/favicon/README reference, and use higher-resolution page images. Add 256px and 512px vector-derived artwork.
- Build a runtime-only store ZIP at `dist/chrome-window-parker-v1.3.0.zip`; document the distinction from GitHub source archives.
- Add lifecycle and asset audits. Live Chrome/Spaces acceptance checks remain a prerequisite for store submission.

# 1.2.0

- Replace the multicolor badge with a simple blue timer, using editable vector artwork and clean size-specific PNG exports.
- Use “Parked · previous tab title” for parking pages, including reused pages. Keep parking tabs unpinned and preserve their position and restoration target.
- Reduce the parked page's visual weight with a smaller icon, heading and tighter layout.
- Prepare public repository documentation, privacy and support information, store copy and release packaging. State macOS-only testing and unverified compatibility elsewhere consistently.
- Keep the parking engine, permissions, settings and Memory Saver behavior unchanged.

# 1.1.0

- Fix native timer receiver errors during worker initialization, focus changes and settings saves.
- Keep initialization/queue recovery, retain full originating error stacks, and distinguish expected tab races from programming errors.
- Discard only the formerly selected tab. Leave ordinary background tabs to Chrome Memory Saver; accept existing/concurrent discards without reloads or retries.
- Show live Parked windows / Sleeping tabs counts without claiming provenance. Update only on relevant events while UI pages are open.
- Avoid postponing due parking alarms during unrelated tab activity; retain live settings if persistent storage rejects an update.
- Replace the old P icon with an original multicolour browser ring and crescent badge at 16, 32, 48 and 128 pixels.
- Refine settings, popup and parking-page typography, alignment, control sizing, select arrow, spacing, accessible status messages and responsive behavior.
- Add receiver-sensitive and Memory Saver regression tests plus an isolated native-browser-worker test fixture.

Installed-profile save/reset and macOS Spaces acceptance checks remain manual because internal Chrome page access was blocked during development. See TESTING.md.
