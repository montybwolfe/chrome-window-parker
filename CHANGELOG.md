# 1.5.0

- **Let Chrome decide** is now the default tab sleeping mode, including upgrades. Parking leaves the previous tab in the background for Chrome Memory Saver to manage, without explicit discard requests.
- Keep the previous behavior as **Discard immediately**, with the existing eligibility checks and exclusions.
- Add **Auto / Light / Dark** appearance to all three extension pages. Saved changes update open pages; Auto follows the system.
- Treat late messages from removed or navigated parking pages as completed requests. Stop page refresh listeners on teardown, while preserving unexpected errors for diagnosis.
- Rewrite public guidance around the multi-window workflow and refresh store graphics and screenshots.
- Keep permissions and local-only data handling unchanged; document the two new stored preferences.

# 1.4.1

- Make the toolbar popup wider and more compact, with single-line labels and 36px controls.
- Rename the popup action to **Clear parked tabs** and shorten protection and status copy. Parking behavior is unchanged.
- Update the popup store screenshot and matching terminology.

# 1.4.0

- Add **Close parked tabs** to restore all parked windows and remove temporary parking pages, including inactive leftovers and while automation is paused.
- Keep parking-only windows open with a blank tab and give affected windows a fresh inactivity interval without changing settings.
- Recheck parking-page ownership and tab selection after download checks; retain recovery details while duplicate parking pages remain.
- Recover from malformed saved state and reject malformed action messages.
- Keep popup actions stable during requests and refresh counts after closing pages.
- Refresh store copy and screenshots, include the MIT license in release packages, and restrict the local preview server to its required files.

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
