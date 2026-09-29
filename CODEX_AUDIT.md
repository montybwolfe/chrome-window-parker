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
