# Working on Chrome Window Parker

Chrome Window Parker is a Manifest V3 Chrome extension. When a window has gone unused for a while, it selects a small local parking page in that window so the page that was selected there can sleep, and it brings that page back when you return. [README.md](README.md) and [docs/BEHAVIOR.md](docs/BEHAVIOR.md) describe the product, [TESTING.md](TESTING.md) the checks, and [CHANGELOG.md](CHANGELOG.md) the releases.

Claude is the only engineering agent on this project. The multi-agent workflow of September and October 2026 is retired: `dev` and the `agent/*` branches are frozen, and `CLAUDE_AUDIT.md`, `CODEX_AUDIT.md`, `ULTRA.md` and `ULTRA_AUDIT.md` are kept only as historical records.

## Approvals

The owner approves each of these explicitly, one step at a time. Approval of one step doesn't cover the next.

- Merging into `main`.
- Version bumps, tags and GitHub Releases.
- Anything in the Chrome Web Store.
- New permissions, host access, remote code, analytics, network behavior or dependencies.
- Deleting branches or tags, and rewriting history.

GitHub Releases and the public changelog follow the versions actually published in the Chrome Web Store, not internal candidates. Each Store release's notes cover every user-visible change since the previous Store release.

## Workflow

1. Branch from the latest `main`, one task per branch.
2. Make the smallest change that does the job, with its tests. Leave unrelated cleanup and refactoring out.
3. Run `npm test` (Node 20 or later; there is nothing to install).
4. Check the installed extension wherever the change could affect it (see Testing).
5. Open a draft pull request that says what changed and why, which tests ran and their counts, which live checks ran on which Chrome build and where, and what wasn't tested and why.
6. Before a change to runtime code is merged, a fresh Claude session reviews it from the diff and the surrounding code rather than the author's summary. A finding needs evidence: a failing test, a reproduction, a broken invariant or a concrete event sequence. The author fixes it or explains once; if they still disagree, the owner decides.
7. The owner merges. The repository allows squash merges only.

When sources disagree, trust current code first, then test and live-Chrome results, then Git history, then these documents, then the historical audit files.

## Invariants

Window and tab events, focus, worker suspension, discards and cleanup interact. Read the code involved before changing a state transition.

- `background.js` registers every Chrome listener synchronously at the top level, before any `await`, so an event that wakes a stopped worker is never lost.
- All work runs through one promise queue. Listeners bump epoch counters synchronously, and queued work re-checks them after any `await` that could race the user, abandoning the work if they changed. Interrupted parking and discard batches are never resumed after a restart; restore delays start again from zero.
- **Let Chrome decide** never calls `chrome.tabs.discard()`. The only call runs in **Discard immediately**, after a window has parked, and re-checks each tab just before asking.
- The recovery record is saved before the parking page is selected.
- Only verified parking pages that belong to this extension are ever removed. **Clear parked tabs** never discards, brings back at most one tab per window and keeps windows open, adding a blank tab only when a window would otherwise be empty.
- A download in progress, or a failure to check downloads, pauses parking and discards everywhere. When eligibility is uncertain, the window stays awake.
- The extension never moves, pins or groups tabs and never uses the windows API to change a window. The parking page goes at the end of its window, unpinned and ungrouped. When a parked window's last real tab is closed or moved away, the extension removes its own parking page so Chrome can close the empty window.
- Leaving a window you used gives it a full parking delay, even when that focus change is what wakes a stopped worker. Brief visits don't count as use.
- Settings saves each valid change on its own and never a half-typed or invalid value. Sync is off by default and chosen on each computer; pausing, protected tabs and window state never sync.
- `scripts/package.py` checks the exact permission list and that there are no host permissions or content scripts.

## Testing

- `npm test` runs the suite against the real `engine.js` and `background.js` with a simulated Chrome API, plus UI tests of the extension pages.
- `npm run preview` serves the pages with simulated tabs. It's for layout only and doesn't apply Chrome's extension-page stylesheet.
- For installed-extension checks, `tools/store-assets/cdp.mjs` starts Chrome with a throwaway profile over the DevTools pipe; install the extension with `Extensions.loadUnpacked`. Set `CHROME` to the browser binary. In Claude's cloud environment, use the pre-installed Chromium and, because it runs as root, pass `--no-sandbox` through `launch({extraArgs})`. Headless Chrome reports every window that isn't minimized as focused, so model focus by minimizing and restoring windows.
- Focus timing, macOS Spaces, tab drags, sleep and wake, two-computer sync and anything specific to a Chrome version need real Chrome on a Mac. Say exactly what ran where and on which Chrome build, and what didn't run.
- Never use the owner's own Chrome profile or installed copy of the extension, and never load two development copies into one profile.
- For a release candidate, build with `python3 scripts/package.py`, compare each packaged file with `git show HEAD:<file>`, load the unzipped package in a fresh profile, repeat the relevant checks, and run `node tools/store-assets/verify.mjs`.

## Git and public files

- Commit as `montybwolfe <montybwolfe@users.noreply.github.com>`. Set it in each new clone before the first commit.
- `main` is protected against force pushes and deletion. Don't rewrite shared history.
- This repository is public. Tracked files must never contain local paths, machine names or generated machine addresses, personal email addresses, credentials, session IDs or private notes.
- End each piece of work with what changed, the tests run (unit separately from live Chrome), remaining risks, commit SHAs, and "Manual actions required" (or "None"). Release handoffs also end with "Manual updates required" (or "None").
