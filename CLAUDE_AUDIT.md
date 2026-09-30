# Claude engineering handoff

Owned by Claude after this initial bootstrap. Follow the shared audit rules in [AGENTS.md](AGENTS.md).

### 2026-09-30 — v1.5.1.4 final review, cold-start fix and Settings polish

- Base: `dev @ 5b94296`. Astra's candidate was integrated first, so this stack builds on `dev @ 201a9cd`.
- Reviewed: `origin/agent/codex @ 201a9cd`, one commit over `5b94296`; local `agent/codex` was clean and one commit behind. Read `CODEX_AUDIT.md` at `201a9cd` and inspected all 19 changed files.
- Integrated: `201a9cd` into dev by exact fast-forward cherry-pick. This stack (the cold-start commit and this commit) follows the same way, so dev carries identical SHAs.
- Found (Astra): no destructive defect. Empty-shell cleanup requires journaled ownership, two fresh snapshots and synchronous invalidation, and Clear still preserves windows. The copy said a plain domain covers "every page on that site", but domain rules do not match non-standard ports (`localhost` does not match `localhost:3000`). Narrowed the wording and added a port note.
- Found (pre-existing, confirmed): a cold MV3 worker woken by `onFocusChanged` signalled focus before `init()` loaded state, so leaving a dwell-qualified window kept its stale `lastUse`. The window could then park at the next sweep: 1.1 s after leaving in a live run where the departure created a window, otherwise up to about 30 s. Astra's new `init()` awaits widened that gap. Exposure needs the worker to stay stopped for longer than the parking delay while the user stays in one window. A restart while the window is still focused re-dwells and refreshes `lastUse`.
- Found (pre-existing, Settings): Chrome's extension-page stylesheet sets `body { font-size: 75% }`, so text without an explicit size rendered at 9.75 px, with labels smaller than the 12 px hints. The http preview harness does not apply that stylesheet.
- Found (introduced here, fixed): moving individual tabs into the form made Enter on a tab checkbox implicitly submit Settings. Enter is now suppressed on that list.
- Changed: `init()` records the first focus change seen before state loads. Before its next await, it gives any still-qualified window that is not focused that departure time (or now) and clears its qualification; brief visits never qualify. Settings changes:
  - Protect individual tabs sits inside Tab protection, in a list that scrolls within `min(340px, 50vh)` and clamps titles to two lines with the full title as a tooltip.
  - The list is outside the settings fieldsets, so it still works if settings fail to load.
  - Page order is Tab protection, then a quieter Diagnostics, then Save/Reset, then Support.
  - A header Light/Dark/Auto radio group with icons, labels and tooltips replaces the Appearance section; the choice still applies on Save.
  - Settings-only scale: 14 px base text, 720 px column, larger controls and spacing.
- Why: v1.5.1.4 scope (lifecycle bug, Settings hierarchy, contained tab list, compact theme control, restrained polish).
- Verified:
  - `npm test`: 277/277 here; Astra's candidate 260/260, run independently.
  - Unit tests: the new cold-start tests gate `init()` in the real `background.js` until after the focus event; 5 of them fail on `201a9cd`. The new Settings tests fail 5/5 on the old page.
  - Live installed-extension checks via CDP in disposable headless Chrome 154 profiles, against the extracted package:
    - Empty-shell cleanup passed 12/12 in each sleeping mode with no worker errors: close, move away, a remaining tab keeps the window, Clear preserves a parking-only window, Let Chrome decide discards nothing, and Discard immediately unloads every eligible tab.
    - Cold and warm departures parked after 60.3 s; the unfixed cold departure parked after 1.1 s.
    - Settings rendered correctly in light, dark, Auto and at 420 px, with keyboard access. With 42 tabs the expanded page is 1851 px, down from 3943 px.
  - Packaging: 20 runtime files, with no workflow, audit, test or docs files.
- Not changed: permissions, CSP, exclusion matcher, cleanup, Clear, discard and download policy, theme save semantics, popup, parked page, Store assets, the `store-listing` version, the README release link, and main.
- Open:
  - Headless reports every window as focused, so focus was emulated by minimize and restore.
  - Not tested: headful macOS Spaces, real tab-strip drags, Windows or Linux.
  - The popup and parked page still render text without an explicit size at 75%; this predates the task and is outside its scope.
  - Not pushed: Claude's shell has no GitHub credentials, so local `dev` and `agent/claude` are ahead of origin.

### 2026-09-30 — Git/GitHub reconciliation before v1.5.5

- Auth: `gh` logged in as montybwolfe (keyring, HTTPS). Git uses the system `osxkeychain` helper holding that login, so HTTPS fetch and push work without prompts and `gh auth setup-git` was not needed. Claude's sandboxed shell cannot read the keychain, so its pushes run unsandboxed.
- Checked: four clean worktrees on main, dev, agent/codex and agent/claude, with no stashes, locks or prunable metadata. There is a single `origin` (`https://github.com/montybwolfe/chrome-window-parker.git`) with no embedded credentials. Upstreams were already correct: each branch tracks `origin/<same name>`.
- Found: no Git identity was configured anywhere (no `~/.gitconfig`), so the previous entry's two unpushed commits were authored with an automatic `user@hostname` address (redacted here), which isn't linked to the account and would expose the computer's name in this public repo. With the user's approval:
  - Set repository-level `user.name=montybwolfe` and `user.email=montybwolfe@users.noreply.github.com`, which covers all worktrees.
  - Re-authored the two commits before their first push: `b817d74` → `043b3e1` and `b1c0a03` → `10c2de4`. Trees and messages are identical, author dates are kept, and dev passes 277/277.
- Refs before: `origin/main` `92a61a9`; `origin/dev` `5b94296` (local `b1c0a03`); `origin/agent/codex` `201a9cd` (local `5b94296`); `origin/agent/claude` `5b94296` (local `b1c0a03`).
- Pushed, fast-forward and without force: dev `5b94296..10c2de4`, and agent/claude `5b94296..10c2de4` followed by this commit.
- Verified via the GitHub API: dev is `10c2de4`, agent/codex `201a9cd` and main `92a61a9`. The re-authored commits are linked to montybwolfe. On both remote branches, the AGENTS.md, CLAUDE.md, CLAUDE_AUDIT.md (including the previous entry) and CODEX_AUDIT.md blobs match local.
- Protection: main is protected by the active ruleset "Protect main". It targets the default branch and blocks deletion and non-fast-forward updates, with no bypass actors, no classic protection, and no required reviews or status checks. The v1.5.5 promotion must therefore be a fast-forward; main `92a61a9` is an ancestor of dev.
- Not changed: main, agent/codex (local `5b94296`, one behind its origin), CODEX_AUDIT.md, branch protection, remotes and product files. This audit-only commit stays off dev.
- Open: none. This resolves the previous entry's unpushed state.

### 2026-09-30 — v1.5.5: optional sync, last-window hardening, bug reports, public refresh

- Base: `dev @ 10c2de4` (complete v1.5.1.4) plus the resolved audit commit `6817836`; this stack builds on `6817836`, which is carried into dev as its prerequisite.
- Candidate, in order:
  - `ec5da02` fixes the Discard immediately race.
  - `2bca192` adds optional per-setting sync.
  - `6f4a2dd` adds the last-window tests.
  - `c3a5ae3` adds the sync controls, the bug button and full-size text.
  - `3ccacc8` rewrites the public docs and Store text.
  - `2ecdc7a` rebuilds the Store artwork.
  - `83e6a80` bumps the version to 1.5.5 and adds this entry.
  - `4b0ce80` redacts the old hostname address from the reconciliation entry.
  - This commit adds the Store reviewer instructions (`store-listing/test-instructions.txt`) and the release-ZIP check below.
- Sync design:
  - The local settings object stays authoritative, so everything works offline, signed out or with Chrome sync off.
  - `storage.local.syncPolicy` holds this device's per-setting choices and never syncs. Seven settings can opt in: parking delay, restore delay, sleeping mode, pinned tabs, audio tabs, site exclusions and theme.
  - Chosen values are mirrored in `storage.sync`, one key per setting.
- Sync behaviour:
  - Everything is off by default, so upgrading uploads nothing.
  - Turning a setting on shares this device's value if nothing is shared yet, and turns on straight away if the shared value matches. If they differ, Settings asks which to keep. If the shared value fails validation, only this device's value is offered.
  - Turning a setting off keeps the local value and leaves the shared one alone.
  - Remote changes are validated, then applied with the same runtime path as a local change (a theme-only change doesn't interrupt parking). A relevant change bumps `safetyEpoch` synchronously.
  - Startup re-applies missed changes and re-shares missing values. A sync failure never blocks startup.
  - If Chrome refuses a write (for example a site list over 8 KB), the value stays local, that setting's sync turns off, and Settings explains why.
  - Reset restores defaults and turns sync off on this device only.
  - Pausing, debug logging, protected tabs and all runtime or recovery state never sync.
- Last normal window: worker-level tests cover closing the tab, moving it into a new window, duplicate parking pages, a worker that starts afterwards, popup and incognito windows present, and Clear keeping its window. Live: the window closes naturally, with no blank tab and no quit.
- Found and fixed (my own review):
  - Discard immediately skipped the entire batch when a newly created parking page hadn't committed yet (empty `url`, our address in `pendingUrl`). It reproduced live, with 0 of 4 tabs discarded, and in a unit test. The still-parked check now matches our own tab by token.
  - Popup and parked-page text was at 75% size (`body { font: inherit }`); the parked-page hierarchy is slightly larger.
  - The header theme now applies immediately.
  - Enter on a sync or tab-list checkbox no longer saves Settings.
  - Validation messages use plain wording.
  - A sync-status error no longer hides "Settings saved."
- Bug reporting: a small inline SVG bug button (icon-only in the popup, icon plus label in Settings). It opens only `https://github.com/montybwolfe/chrome-window-parker/issues`, on a trusted click, with nothing attached. Added a GitHub issue form.
- Public copy:
  - Rewritten: README (801→466 words), Store description (547→298), BEHAVIOR (2881→1734), PRIVACY (now covers sync), SUPPORT, CHANGELOG, TESTING, the store-listing text and the docs READMEs.
  - Stale "pending approval" wording removed.
  - Live listing verified (`…/detail/chrome-window-parker/agdejolopcplaedpollnlgpboldnfbfi`, listing v1.5.1.3) and linked first in the README.
  - Added plain explanations of the permission warnings and a Help note on Enhanced Safe Browsing, following Google's "a few months" wording.
- Marketing:
  - New dependency-free `tools/store-assets` pipeline: it installs this build in a disposable headless profile with synthetic tabs, parks windows for real, and captures the UI. It then composes the artwork and verifies it against SHA-256 records.
  - New set: 5 screenshots (parked, popup, Settings, Sync, dark), both promo tiles, the Store icon (timer kept, now 96px artwork with 16px padding) and the Buy Me a Coffee cover.
  - Removed the dom-to-image/sharp tool, the 4× masters and stale records.
- Verified:
  - `npm test` passes on a clean export of each commit: 278, 296, 300, 307, 307, 308 and 308 tests. The artwork verifier passes, including its UI check.
  - Package: 20 runtime files, v1.5.5, permissions and CSP unchanged.
  - Live, in headless Chrome 154:
    - Sync event path: seed, apply, ignore, invalid value, conflict, disable, reset.
    - Instant theme, and both bug links (scripted clicks ignored).
    - Last-window close, move and Clear.
    - Empty-window cleanup 12/12 in each mode.
    - Cold and warm departure at 60.5 s and 60.7 s.
    - The discard fix, with no worker errors.
  - The unzipped release ZIP (SHA-256 `ed4087bd…`) passed 22/22 live checks: the sync event path, the instant theme, both bug links, last-window close, move and Clear, and Discard immediately (4 of 4 tabs). There were no worker errors.
- Integration (authorized for this release): fast-forward `6817836` and this stack into dev, then fast-forward main to dev. The "Protect main" ruleset allows only fast-forward pushes. No tag, GitHub Release or Store submission. The resulting SHAs are in the handoff report.
- Not changed: permissions, CSP, host access, the parking model, download safety and Clear semantics. The GitHub About/Website fields and the Chrome Web Store Dashboard are left for the user.
- Open:
  - Not tested: real syncing between two signed-in computers, headful macOS Spaces, real tab-strip drags, Windows and Linux.
  - Codex hasn't reviewed this release (possible 1.5.5.1).

### 2026-09-30 — v1.5.5 GitHub publication

- Tagged: annotated `v1.5.5` (tag object `7c77908`) on `e82b3a4`, the tested release commit and current main. Pushed.
- Released: a public GitHub Release, "Chrome Window Parker v1.5.5". It isn't a draft or a prerelease and is marked Latest. The notes are the `CHANGELOG.md` 1.5.5 section plus install lines.
- Assets: `chrome-window-parker-v1.5.5.zip` (37,112 bytes, SHA-256 `ed4087bd…5b98`) and `RELEASE-SHA256.txt`. Before publishing, a clean rebuild of `e82b3a4` matched the tested build. After publishing, anonymous downloads matched it too.
- About: the website is set to the Chrome Web Store listing and the description to the manifest summary. Topics and other settings are unchanged.
- Not changed: main, dev, product code, branch protection and agent/codex. This audit-only entry stays on agent/claude so main remains exactly at the tagged commit.
- Open: the Chrome Web Store upload, listing and privacy updates, and submission are deliberately left to the user.

### 2026-09-30 — Store reviewer instructions within 500 characters

- Changed: `store-listing/test-instructions.txt` is cut from 1,291 to 488 characters (plain ASCII) for the Dashboard's 500-character Test instructions field. It keeps the 1-minute parking setup, what keeps a window awake, and the new sync controls. `tests/assets.test.js` now enforces the limit, counting line breaks as CRLF.
- Not changed: product code, the release ZIP, and the `v1.5.5` tag and release. This change is on agent/claude only and hasn't been integrated into dev or main.

### 2026-09-30 — v1.5.5.1: moved parking pages and the tab-list scroll cue

- Base: `dev @ 9c32728`. That is the v1.5.5 runtime (tag `v1.5.5` is on `e82b3a4`) plus the two audit and Store-text commits `ab18576` and `9c32728`, which were integrated into dev and main before this task. agent/claude equalled dev, with no unresolved work.
- Candidate, in order:
  - `88001bd` adds the moved-parking-page lifecycle fix and its tests.
  - `9374575` adds the scroll cue and window numbering, with UI tests and the capture records.
  - This commit adds the docs, the 1.5.5.1 version bump and this entry.
- Bug: dragging a parking page out of a parked window left it open as a parking-only window.
- Root cause: reproduced in headless Chrome 154, with the drag-time refusal injected into the worker's `tabs.remove`. There were three causes:
  1. Chrome refuses tab edits while a tab is held ("Tabs cannot be edited right now"). Cleanup triggered by the drag's events was deferred and never retried after the drop. The same refusal broke v1.5.5's empty-window cleanup when the last real tab was physically dragged away, and left a stale page when a real tab was dragged into a parked window.
  2. `adopt()` treated any parking page as its window's own. A page dropped into another window made that window parked, with the other window's journal.
  3. The source window kept its old `lastUse`. The `windows.onCreated` or `onDetached` sweep re-parked it 42–167 ms after the detach with a new page, recording Chrome's neighbouring tab as "previous".
- Chosen behaviour: a page belongs to the window it was made for.
  - Ownership is a session-scoped `owners` map (token → window), persisted in `runtimeState` and set in `park()` before `tabs.create`. Tokens with no known owner (after a browser restart or an update) are claimed by their window, which preserves restart recovery. Startup validates the map and prunes tokens with no live page.
  - In any other window, a journaled page is removed and never adopted:
    - Case A, a new window holding only that page: the window closes naturally, with no `about:blank`.
    - Case B, an existing window: only that page goes; the window's tabs, order and selection are untouched.
  - Case C, the source window: it keeps its tabs and becomes unparked. Nothing is activated or focused. The page leaving counts as use, via the `wasParked && !ownPage` rule in `adopt()`, so the window waits a full delay before parking again.
  - Dragged back home, the page is its own again.
  - Clear keeps its window-preserving semantics.
- Race safety in `cleanupStray()`:
  - Removal requires a committed parking address, a recovery record, a known owner other than this window, and no unresolved transfer.
  - It takes two fresh snapshots. The `shellEpoch` check means any tab event cancels it and asks for a follow-up pass.
  - Clear (`clearRequests`) goes first, and the clock must be sane.
  - Refusals from `cleanupStray()`, `cleanupEmptyParked()` or `cleanupParking()` call `deferCleanup()`. That schedules a cleanup-only `tidy()` every 500 ms (at most 240 times), plus a 30-second `cleanup-retry` alarm for a stopped worker.
- Tests:
  - `tests/moved-parking.test.js` has 23 tests on the real worker queue. They cover a new window in Chrome's observed event order and three stress orders; a held drag and the drop; the retry alarm; worker restarts (stopped, cold, and a browser restart); existing windows, selected or not; another parked window; out and back; duplicate, unknown, other-extension, navigating and real tabs; paused parking; Clear; and the last real tab dragged out or a real tab dragged in under refusal.
  - 15 of the 23 fail on v1.5.5.
  - The engine audit now counts 3 `tabs.remove` call sites.
- Live checks, in headless Chrome 154 with disposable profiles and synthetic pages:
  - What was exercised: Chrome's own detach and attach via `windows.create({tabId})` and `tabs.move`, with the drag-time refusal injected for a held drag. No physical tab-strip drag was performed.
  - v1.5.5 reproduced all three defects. The fix passed 17/17: the leftover window closed 402 ms after the drop, the source was not re-parked, Case B was handled selected and unselected, out-and-back kept the page, and the last real tab dragged out closed the source. With the worker stopped mid-drag, the alarm woke it and the window closed 27 s later.
- Scroll cue:
  - `#tabScroll` wraps the list. Pseudo-element fades in `--control` show at the bottom while more is below and at the top once scrolled, with `pointer-events: none`, inset past a visible scrollbar.
  - A 28 px chevron (`tabindex="-1"`, `aria-hidden`) scrolls 80% of the panel, with no smooth scroll under reduced motion.
  - State is set from scroll events, a `ResizeObserver` and each refresh, and `scroll-padding-block` keeps focused rows clear of the fades.
  - Live 12/12: one tab, 6 tabs just overflowing and 42 tabs at top, middle and bottom; a real chevron click; 41 Tab presses; refresh down to one tab; dark theme.
  - Screenshots were reviewed in light, dark and at 420 px.
- Found and fixed (related): rows showed Chrome's internal window IDs ("Window 509769978"); windows are now numbered in order. Physical drags of real tabs are also covered by the retry above.
- Assets: a fresh capture of this tree was byte-identical for all five UI sources, because no Store image shows this panel. Only `capture.json`'s three UI hashes and one `assets.json` input hash were updated. Re-rendering showed anti-aliasing noise in screenshots 1 and 2 (70 and 67 pixels) and the icon (21 pixels), so no PNG was changed. `verify.mjs` passes, including its UI check.
- Verified: `npm test` passes on a clean export of each commit (332, 335, 335). The package has 20 runtime files at v1.5.5.1, permissions and CSP are unchanged, and there is no network or backend change. The final live smoke of the unzipped ZIP passed 23/23 with no worker errors. It covered ordinary parking, exclusions and a protected tab, zero explicit discards in Let Chrome decide, restoration, the final real tab, Discard immediately (4 of 4), moved pages (held drag, source, existing window), Clear, sync, the instant theme, Report a bug, the scroll cue with no console or CSP errors, and the last normal window.
- Not changed: permissions, CSP, sync, exclusions, protection, discard, dwell and download logic, Clear semantics, README, the Store description and images, main, agent/codex and `CODEX_AUDIT.md`.
- For Astra:
  - Claiming ownerless tokens in `adopt()`: after a browser restart, a token present in two windows goes to the first window enumerated, and the other copy is removed.
  - The `adopt()` use rule, which also delays re-parking after any unrestored page loss.
  - The retry polling during a held drag.
  - The deliberate change for moved pages with no journal: they are no longer swept from the destination and go on the next tab selection there, or with Clear.
  - The chevron is not focusable.
  - After an out-and-back drag, `previousId` may point to the neighbour Chrome selected.
- Open: a physical tab-strip drag, headful macOS, Windows and Linux are not tested. Promotion to main, the tag, the release and the Store update are left for Astra and the user.

### 2026-09-30 — v1.5.5.2: moved parking pages, scroll cue, coffee link

- Base: `dev @ e40908d`. That is the unpublished v1.5.5.1 candidate (`88001bd`, `9374575`, `e40908d`), folded into 1.5.5.2 instead of being released separately. main is `9c32728` (v1.5.5 runtime; tag `v1.5.5` on `e82b3a4`). agent/codex and `CODEX_AUDIT.md` were unchanged.
- Candidate, in order:
  - `d0cf10c` handles a moved page that is closed or still loading.
  - `66d729a` adds the coffee link, the README button, the button-name docs and the targeted Store images.
  - This commit bumps the version to 1.5.5.2 and adds the changelog entry and this entry.
- Movement bug, root cause, lifecycle behaviour and race safety are as in the v1.5.5.1 entry. New here:
  - A moved page closed before its cleanup, or one that vanishes just as it is removed, no longer leaves its journal and owner entry until the next worker start. `removed()` forgets owned tokens that belong to no window's state and have no live page, and skips the window read when there are none.
  - A moved page that is still loading is removed once it commits.
- Tests:
  - The moved-parking suite now has 26 tests. Both new journal tests fail without the change.
  - A support test pins the coffee control: inline cup, visible label, accessible name, no vague "Support" control, a distinct bug control, footer order, a one-line footer at the fixed 360 px width, and the README button's destination.
  - `npm test` passes on a clean export of each commit: 338, 339, 339.
- Scroll cue (unchanged from `9374575`): extra live checks passed 6/6. They cover very long titles (two-line clamp), Auto switching to dark while open (the fade follows the panel colour), 400 px width, the bottom state, and refreshing down to one row.
- Coffee UX:
  - The popup footer reads "Parking on", a bug icon, a cup with "Buy me a coffee" in the muted colour, then "Settings…" in the accent colour. Settings uses the same cup and label beside Report a bug.
  - Accessible names are "Buy me a coffee (opens in a new tab)" and "Report a bug on GitHub (opens in a new tab)".
  - Live: the footer stays on one line for every status text with at least 18 px spare, in light and dark. Keyboard order is bug, coffee, Settings. There are no console or CSP errors.
  - Destinations are unchanged: `https://buymeacoffee.com/montybwolfe` and `https://github.com/montybwolfe/chrome-window-parker/issues`.
- README: restored Buy Me a Coffee's official blue button image, as used before v1.5.5 (`cdn.buymeacoffee.com/buttons/v2/default-blue.png`, width 217, since GitHub strips inline styles), linking to the same page.
- Store assets, from a full pipeline run on a scratch copy:
  - The popup captures changed only in the footer, and the Settings capture only in its support section, which is below both Settings crops.
  - Screenshots 2 and 5 are regenerated.
  - Screenshots 3 and 4 re-rendered byte-identically from the new inputs; only their records changed.
  - Screenshot 1, both promos, the icon and the cover keep their files and records, because their inputs are unchanged and fresh renders showed only anti-aliasing noise.
  - The verifier passes, including its UI check.
- Web Store delta against v1.5.5:
  - Replace the ZIP, and screenshots 2 and 5.
  - Unchanged: the summary, description, icon, screenshots 1, 3 and 4, both promo tiles, the URLs, the test instructions (488 characters, as prepared after 1.5.5), the permissions, the data categories and the certifications.
  - Only the data-handling note in `privacy-fields.txt` and `PRIVACY.md` name the button differently.
- Verified:
  - The package has 20 runtime files: v1.5.5.2, 39,721 bytes, SHA-256 `8eabf37f…b9be`. Permissions and CSP are unchanged, and the only URLs are the two fixed links.
  - Live, on the unzipped ZIP in headless Chrome 154 with disposable profiles: the release smoke passed 25/25. It adds real clicks on the popup's coffee and bug links to the 23 v1.5.5.1 checks.
  - The movement suite passed 17/17. The held-drag window closed 403 ms after the drop, and with the worker stopped mid-drag the alarm cleaned up after 26 s.
  - Moves used `windows.create({tabId})` and `tabs.move`, with the drag-time refusal injected. No physical tab-strip drag was performed.
- Not changed: permissions, CSP, sync, exclusions, protection, discard, dwell and download logic, Clear semantics, the Store description and the other Store images, main, agent/codex and `CODEX_AUDIT.md`.
- For Astra:
  - Everything listed for v1.5.5.1.
  - The orphan-journal prune in `removed()`.
  - The asset records: kept or refreshed according to whether inputs changed.
  - The README's hotlinked official button image.
  - The muted coffee link's contrast (it uses `--muted`, the same colour as other popup hints).
- Open: a physical tab-strip drag, headful macOS, Windows and Linux are not tested. Promotion, tag, release and the Store update are left for Astra and the user.

### 2026-09-30 — v1.5.5.3: sync by group with local intent, excluded-site tidying, popup and icon polish

- Base: `dev @ fe54679`, which is v1.5.5.2 as released and tagged. agent/claude was fast-forwarded from `73301f9`, with no unresolved work.
- Candidate, in order:
  - `eebdd9d` adds local intent, grouped sync with one combined question, Restore defaults, stale-copy protection and the keyboard focus fix.
  - `9c1ebc4` tidies excluded sites: paste cleanup, Sort A–Z, sorted defaults, plainer help and errors.
  - `f3ddbf7` adds the icon-only popup footer, Settings section icons, the 16/24 px toolbar icons and `tools/store-assets/icons.mjs`.
  - This commit bumps the version to 1.5.5.3 and adds the changelog, docs, Store text and caption, regenerated screenshots and this entry.
- Local intent:
  - Stored in `storage.local.customized`: one boolean per `SYNCABLE` key (`syncFlags`), never synced. Missing means all false, with no migration.
  - Set only when that key's stored value really changes, through Save (`configure`) or the header theme (`setAppearance`).
  - Cleared when a synced value replaces the value (`applySettings(next, false)`, from sync, the startup pull or adoption) and by Restore defaults. `reset` passes all-false flags, so the defaults never count as chosen.
  - Save without changes, same-value sync events, turning sync off and non-syncable settings leave it alone.
- `configure(settings, shown)`: Settings and the popup's pause toggle send the values they showed. Only fields that differ from those are applied over the current settings, so a value changed meanwhile (by sync or another page) is neither overwritten nor claimed as chosen here.
- `syncEnable(keys, choices)` is the single path for one setting, a group or everything:
  - Keys already syncing are skipped.
  - Nothing shared → share. Equal → turn on. Different and not chosen here → adopt. Different and chosen here, or unusable (`null`) → conflict.
  - Nothing is written until every conflict has an answer. An answer carries `{use, local, synced}` and counts only while both values still match; otherwise the question is asked again.
  - `local` marks the key as chosen here. `off`, offered only for unusable values, leaves the key off.
  - Shares are written one key at a time. Refusals come back in `failed`, and only those keys stay off.
  - `sync-resolve` is gone. `background.js` now bumps `safetyEpoch` synchronously for `sync-enable`, because it can adopt settings. `syncNotice` is now a list of `{key, reason}`.
- Settings UI:
  - "Sync all settings", then Parking and Tab protection group boxes (matching the page's own sections), then a Theme leaf. Theme is a single setting, so it has no group box.
  - Group and master states are derived (checked or indeterminate) and never stored.
  - One panel holds a radio pair per setting, with Apply, Cancel and Escape. The tree is locked meanwhile, and focus returns to the box used.
  - Save settings, Restore defaults and Refresh list keep keyboard focus. This fixes a pre-existing problem: Chrome dropped focus to the page when they disabled themselves.
- Exclusions:
  - `simplifyRule` turns a home-page http(s) address into a lowercase host[:port], dropping default ports. Anything with a path, query, `#`, `*`, sign-in details or non-ASCII text is kept as it is.
  - It runs on paste for whole lines only, drops repeats within the paste, and inserts with `insertText` so Undo works.
  - `compareRules` sorts by site, then by the rest of the address, ignoring `http(s)://`, `*://` and `*.`, case-insensitively, with the exact text breaking ties. It drives Sort A–Z and the defaults-order test.
  - `DEFAULTS.exclusions` is reordered to match, and the invalid-site message now says what to enter instead.
- Icons:
  - The existing 16/32/48/128 px PNGs were already native renders of the SVG: a fresh render differs by at most 2.6/255 on average.
  - Added a native 24 px toolbar icon for 1.5× screens.
  - Re-rendered the 16 px icon with its 1 px stem, crown and hands moved half a pixel onto whole pixels, which is visibly sharper at 1×.
  - The SVG, the 32/48/128 px PNGs, `docs/assets` and all marketing art are unchanged. Retina toolbars use the unchanged 32 px icon.
- Found (harness, not product): CDP Space/Enter on a button in the sync panel hangs headless Chrome 154's renderer, even with a no-op handler, and `Debugger.pause` also times out. The identical steps work in headful Chrome, so keyboard checks were run headful.
- Verified:
  - `npm test`: 367/367 here, against 339 at the base. The results for each commit, on a clean export, are in the handoff report.
  - New queue case: `sync-enable` stops an in-flight discard batch, and it fails without the `background.js` change. The focus test fails without the fix.
  - The Settings tests run against the real engine.
- Live, in disposable Chrome 154 profiles over the CDP pipe:
  - Settings sync, headful: 36 of 37 checks passed. The one miss was my own expectation: after Restore defaults, the unchanged Tab sleeping adopted the synced value without asking, which is correct.
  - Excluded sites, headful: 11/11.
  - Keyboard Apply with Space and Enter, and Save/Refresh focus, headful.
  - The real toolbar popup via `action.openPopup`, headful: 360×313, no overflow, a one-line footer, and the gear opens Settings.
  - All manifest and toolbar icon references resolve at their declared sizes.
  - The DevTools MCP on the http preview: accessible names, and `checked="mixed"` for a partly synced group. No console messages.
- Store assets, from capture and compose runs on a scratch copy:
  - `parked-light` and `parked-dark` were byte-identical and kept.
  - `popup-light` and `popup-dark` (2 px taller, new footer) and `settings-light` were updated, along with `capture.json` (`syncTop` 1029 → 1060).
  - Screenshots 2 (popup), 3 (Parking heading icon), 4 (Sync) and 5 (dark popup) are replaced.
  - Screenshot 1 is kept: its inputs are unchanged and the fresh render showed 70 anti-aliasing pixels, max 8/255.
  - The promos, Store icon and cover were byte-identical. `verify.mjs` passes all 9 images, including the UI check.
- Package: 21 runtime files (the new 24 px icon added). Version 1.5.5.3, with permissions and CSP unchanged. The size and SHA-256 are in the handoff report. The unzipped ZIP passed a 13/13 live smoke: real parking in both modes, restore, Clear, sync adoption, Restore defaults, and the popup and Settings pages, with no errors.
- Not changed: permissions, CSP, host access, `SYNCABLE`, debug logging, parking/dwell/restore/discard/download/Clear/last-window/moved-page logic, the Store description and privacy fields, main, dev, agent/codex and `CODEX_AUDIT.md`.
- For Astra:
  - The adopt-without-asking rule and where intent is set and cleared.
  - The `shown` merge in `configure`.
  - Per-key share writes.
  - Stale-answer handling.
  - `off` offered only for unusable values.
  - The 16 px half-pixel alignment.
  - The reviewer test instructions text changed in source, which is optional for the Dashboard.
- Open:
  - Not tested: real two-computer sync, a real clipboard paste (synthetic paste events were used), rendering on a 1.5× display, physical tab drags, headful Spaces, Windows and Linux.
  - The Store needs the new ZIP and screenshots 2, 3, 4 and 5.

### 2026-09-30 — 1.5.6: parked-window identity, Clean up, Settings version

- Base: `dev @ 9c7199d` (v1.5.5.3 as released). agent/claude was fast-forwarded from `1e557b5`, an ancestor with no unique commits; clean tree, no unexpected work. Baseline `npm test` 373/373.
- Candidate, in order: `d783b51` Clean up and the Settings version; `e3ea633` parked-window identity (plus the version label's move to the corner, per Monty's redirect); `f2872ab` version 1.5.6, docs, Store text and artwork; this commit (comment accuracy, capture fingerprints, this entry).
- Parked-window identity: RETAINED after live review of 17 really parked windows (12 synthetic favicon/title cases plus GitHub, Wikipedia, HN, MDN, Apple) in light/dark, 420 px and 200 % zoom.
  - Page: small "⏱ Window parked" line, then `<h1>` = [20 px favicon, `alt=""`] saved title (24 px, two-line clamp, balanced wrap), then the unchanged Restore tab and details. The tab keeps `icons/parker-timer-32.png`; `document.title` stays `Parked · <title>` (existing; judged right for window switchers without impersonating the site).
  - Icon: `/_favicon/?pageUrl=<saved url>&size=64`, Chrome's local favicon cache (no network; CSP `img-src 'self'` covers it). Hidden until it loads; Chrome returns its default globe for unknown pages. A faint opposite-tone `drop-shadow` hairline (`--icon-edge`) keeps white glyphs visible on light and black glyphs on dark. 20 px because Chrome keeps ≤32 px bitmaps: 24 px (1.5× upscale) looked soft.
  - Engine: `parked-info` also returns the saved record's `url` (or `''`). No lifecycle, state or storage change.
  - Permission: `favicon`. `chrome.management.getPermissionWarningsByManifest` in Chrome 154 returns the same two warnings with and without it (`tabs` covers it; alone it would warn "Read the icons of the websites that you visit"), also for the packaged manifest. So no new install warning and no re-approval on update. The Store's Privacy tab needs the new justification.
- Clean up (replaces Sort A–Z; helper "Sort A–Z · remove duplicates"; accessible name "Clean up sites to exclude"): `cleanUpRules` sorts with the unchanged `compareRules`. Websites (no `://`) repeat when equal after the matcher's own normalisation (lowercase, strip `*.`), keeping a plain lowercase spelling if listed, else the first in A–Z order. A full home address is dropped only when `simplifyRule` of it is a listed website. Every other full address repeats only when identical. Kept entries are never rewritten; a property test checks matching is unchanged over sample URLs. It only edits the field, like Sort A–Z did: a clean list is left untouched, and Save (`configure` with `shown`) records intent and syncs through the existing path.
- Version: `v` + `chrome.runtime.getManifest().version`, a `<p>` after `<main>`, absolutely placed at the page's top-right corner (7 px / 10 px, 11 px muted). Outside the Store Settings crops (x 88–1192 of 1280), so version bumps alone don't change screenshots 3/4. Popup unchanged.
- Verified: `npm test` 377/377 (3 new tests plus extended parked-page, options and permission guards). `verify.mjs` 9/9 including the UI check. `git diff --check` clean.
- Live (headless Chrome 154 over the CDP pipe, disposable profiles; worktree unpacked, then the extracted ZIP): favicon at 64 px natural size on every page including no-icon and empty-title ones; parking tabs' `favIconUrl` is Window Parker's; no horizontal overflow; a real mouse click on Restore tab restored the saved tab; after `ServiceWorker.stopAllWorkers`, reloading a parking page woke the worker and rendered title and icon; the packaged build parked 12 windows and restored one by dwell after focus. Clean up: no-op on defaults (field, storage and intent unchanged after Save); trusted browser paste (Cmd+C/Cmd+V commands through Chrome's clipboard) → Clean up → Save stored the cleaned list with intent; with Sites to exclude synced, `chrome.storage.sync` received the cleaned list. Version label = manifest in light/dark/400 px. Zero exceptions or console errors from options, parking pages and the watched worker.
- Harness finding (not product): CDP `Target.createTarget` without `newWindow` opens a tab in the last-focused window; in a parked window that correctly unparks it.
- Store assets: capture pages got plain made-up icons (`ICONS` in capture.mjs, mirrored in compositions/style.css). Recaptured and composed: screenshots 1 and 5 and the marquee promo change; popups, small promo and cover are byte-identical. Screenshots 3/4 (20 px, ≤2/255 on a tab placeholder) and the Store icon (21 px anti-aliasing noise) keep their previous bytes, with records pointed at them. A later comment-only edit to settings.js refreshed its `capture.json` fingerprint and screenshot 4's input record without re-rendering.
- Package: `dist/chrome-window-parker-v1.5.6.zip`, 21 files; size and SHA-256 are in the handoff report. Permissions tabs/storage/alarms/downloads/favicon; CSP, host access (none), content scripts (none), remote code (none) unchanged.
- Store handoff: ZIP; screenshots 1 and 5; marquee promo; description (one new bullet); Privacy tab (favicon justification, web-history line). Test instructions and other fields unchanged.
- Not changed: parking, dwell, restore, discard, download, Clear, last-window, moved-page and sync logic; `SYNCABLE`; popup; main, dev, agent/codex and `CODEX_AUDIT.md`.
- Open: headless only, so there was no macOS Mission Control or Window-menu look, no 1.5×/2× physical-display check of favicon sharpness, and no macOS-pasteboard paste. Adaptive favicons (e.g. GitHub) show the variant Chrome stored under the system theme at load time, which can differ from a forced Window Parker theme; the hairline keeps them visible.

### 2026-09-30 — 1.5.6 final hardening pass (in progress; checkpoint)

- Base: `dev @ d28267f` (v1.5.5.3 `9c7199d` plus the workflow-only Ultra bootstrap). The four 1.5.6 commits were rebased onto it and lease-pushed with Monty's approval: `d783b51→1b4e215`, `e3ea633→285d6d2`, `f2872ab→4abb6ad`, `1269303→504ed95`; trees identical apart from dev's five workflow files; 377/377 before and after.
- Ultra: no local `agent/ultra` branch or Ultra worktree exists on this Mac, although the bootstrap entry describes one; `origin/agent/ultra` `1c4e3a1` is tree-identical to dev. Recorded only; not touched.
- Environment: Chrome 154.0.8037.58, macOS 27.0 (M1 Pro, built-in 2× Retina), Node 24.21, Python 3.9.6. No Docker, VM or container runtime; only Chrome and Safari installed. Computer Use (Full Control) grants Chrome READ tier only (screenshots; no clicks, keys or drags), with clipboard read/write and system keys.
- Live harness: disposable Chrome profiles over the CDP pipe (`Extensions.loadUnpacked`), popup-type driver window, local test site; kept in ignored `work/hardening-1.5.6/` with the coverage matrix and findings.
- Found and fixed (this pass): Chrome 154 gives a tab a new ID when it discards it, through `tabs.discard` and Chrome's own discard (`chrome://discards` Urgent Discard), and fires `tabs.onReplaced`; protection kept the dead ID and was silently lost. See the fix commit for the ordering evidence.
- Phase 1 live (disposable Chrome 154, build = candidate runtime):
  - Headful, real macOS focus: 7-window run (pinned, grouped, excluded selected and background, protected, audible); tabs, pins, groups and bounds unchanged; page last, unpinned, ungrouped; the parking tab keeps the timer icon and "Parked · <title>"; brief visit stays parked; 2 s return restores (+2.02 s); Restore button 24 ms; Clear discards nothing. Chrome kept losing app focus about 1 s after programmatic activation (the Claude app was frontmost); the engine handled those real sequences as designed.
  - `chrome://discards` after parking: the previous tab is "hidden" and the parking page visible; Chrome's own reason, "Tab is recently visible", starts its timer.
  - Headless: a real in-progress download held parking 100 s (resumed 20 s after cancel); Chrome stopped the idle worker itself after 29 s and the waking departure still waited a full delay (61 s); Discard immediately unloaded exactly the eligible tabs and a return woke only the previous tab; closing the last real tab closed only that window.
  - Freezing only the disposable Chrome process tree (SIGSTOP/SIGCONT, a sleep stand-in): an interrupted return restarted its delay (restored 2032 ms after resume); an interrupted discard batch stopped (1 of 40).
  - Update path: a developer reload (dev mode on) of v1.5.5.3 (rebuilt byte-identical to the release) to 1.5.6 closed its parking pages, leaving each window on its last tab. Store updates differ: Chromium's `UpdateInstallGate` delays MV3 updates while the extension has frames or a process, until they end or Chrome restarts.
  - Restart: a real relaunch is not testable here (CDP-loaded unpacked extensions are not persisted in branded Chrome; a persistent install needs the native folder picker). Engine side passed 6/6: empty session plus a new worker rebuilt parked windows, owners and remembered tabs, including the second copy of a duplicated page.
- Phase 2 live: page out to its own window, into another window, out and back (held, then dropped and selected), held drag (leftover closed 122 ms after the drop), last real tab moved out, Clear during a pending move, and a worker stopped mid-drag (alarm cleaned up after 27 s): all pass. No physical tab-strip drag: Computer Use has read-only access to Chrome.
- UX found, to fix in Phase 6: after a failed Restore click the parked page says "No tab is available to restore" although tabs are available, and the text persists.
- Privacy to verify in Phase 12: a closed parked window's record can outlive the window until the next tab removal; records of windows parked at quit stay by design, which PRIVACY.md attributes only to crashes.
- Checkpoint: phases 0–2 complete. Next: phase 3 (settings and storage).
