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
