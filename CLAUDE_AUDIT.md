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
- Found: no Git identity was configured anywhere (no `~/.gitconfig`), so the previous entry's two unpushed commits were authored `Monty Wolfe <montybwolfe@MacBook-Pro.modem>`. That address is not linked to the account and exposes the hostname in this public repo. With the user's approval:
  - Set repository-level `user.name=montybwolfe` and `user.email=montybwolfe@users.noreply.github.com`, which covers all worktrees.
  - Re-authored the two commits before their first push: `b817d74` → `043b3e1` and `b1c0a03` → `10c2de4`. Trees and messages are identical, author dates are kept, and dev passes 277/277.
- Refs before: `origin/main` `92a61a9`; `origin/dev` `5b94296` (local `b1c0a03`); `origin/agent/codex` `201a9cd` (local `5b94296`); `origin/agent/claude` `5b94296` (local `b1c0a03`).
- Pushed, fast-forward and without force: dev `5b94296..10c2de4`, and agent/claude `5b94296..10c2de4` followed by this commit.
- Verified via the GitHub API: dev is `10c2de4`, agent/codex `201a9cd` and main `92a61a9`. The re-authored commits are linked to montybwolfe. On both remote branches, the AGENTS.md, CLAUDE.md, CLAUDE_AUDIT.md (including the previous entry) and CODEX_AUDIT.md blobs match local.
- Protection: main is protected by the active ruleset "Protect main". It targets the default branch and blocks deletion and non-fast-forward updates, with no bypass actors, no classic protection, and no required reviews or status checks. The v1.5.5 promotion must therefore be a fast-forward; main `92a61a9` is an ancestor of dev.
- Not changed: main, agent/codex (local `5b94296`, one behind its origin), CODEX_AUDIT.md, branch protection, remotes and product files. This audit-only commit stays off dev.
- Open: none. This resolves the previous entry's unpushed state.
