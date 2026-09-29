# Codex engineering handoff

Owned by Codex. Follow the shared audit rules in [AGENTS.md](AGENTS.md).

### 2026-09-30 — Bootstrap isolated development workflow

- Base: `dev @ 92a61a909ec66e9c8c913d765fd86df0d465ee3d`, created from unchanged main.
- Candidate: This commit; direct dev bootstrap explicitly authorized by the user.
- Changed: Added canonical shared instructions, a short Claude pointer and both initial audit files. Established dev-based candidate lanes with approved-commit cherry-picks and separate release promotion.
- Why: Isolate Codex and Claude work while keeping accepted development and the stable release distinct.
- Verified: Local/remote refs and existing worktrees inspected before creation; only main existed and was clean. The bootstrap changes only these four Markdown files. `npm test` on dev: 221 passed, 0 failed; no live Chrome test was needed or performed.
- Not changed: Extension runtime, v1.5.1.3 version/package, Store assets, public product docs and main. Claude Code/model/tool configuration is deferred.
- Open: No product candidate or product work is started by this bootstrap.

### 2026-09-30 — 1.5.1.4 exclusions and empty parking windows

- Base: `dev @ 5b94296bfc7b643613d818224a3d6f30ab11c0f0`.
- Candidate: This commit on `agent/codex`; no integration approval requested or assumed.
- Changed: Plain-domain-first Settings help, selected/background exclusion explanation and collapsed advanced patterns. Added separate natural empty-shell cleanup with journal/token ownership, two live snapshots per removal, synchronous event invalidation, detach/attach settlement and session recovery. Clear retains window preservation, including requests queued during startup. Updated affected docs and candidate version/changelog to 1.5.1.4.
- Why: Teach existing exclusion semantics and stop extension-owned parking pages from keeping an otherwise-empty window alive.
- Verified: `npm test`: 260 passed, 0 failed. Focused lifecycle/exclusion tests exercise the actual worker queue with simulated Chrome APIs, stale snapshots, tab creation/activation/removal/move/replacement/navigation, settings/Clear interruption, duplicate pages, missing ownership, fallback, paused transfers, worker restart and clock jumps. Chrome 154 on macOS synthetic UI preview: copy rendered in dark/light, plain `meet.google.com` saved, advanced disclosure expanded; no preview console warnings/errors.
- Found: Cross-window detach must remain blocked until attach/removal settles, including across worker restart and while paused. Clear must invalidate natural cleanup before entering the worker queue.
- Not changed: Exclusion matcher, default delays, sleeping/discard/download policy, permissions, CSP, dependencies, privacy/network/support behavior, Store materials and submitted v1.5.1.3 package. `main`, `dev`, Claude's branch/audit remain untouched.
- Open: Installed-extension testing was attempted but MCP refused the Codex path and a separate hash-verified artifact copy because neither was in its configured workspace allowlist. No candidate was installed. Actual Chrome parking, close/move cleanup, Clear and worker error checks remain unverified; the UI preview uses synthetic APIs. Chrome has no atomic conditional tab-removal API, so a last-instant browser change after validation remains a documented limitation. Unknown recovery tokens are deliberately left for explicit Clear.
