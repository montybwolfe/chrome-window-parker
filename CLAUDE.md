# Claude Code

Read [AGENTS.md](AGENTS.md) first. It is the canonical shared workflow for both agents.

- Work on `agent/claude` in `../chrome-window-parker-claude` (relative to the existing main checkout).
- Read and maintain `CLAUDE_AUDIT.md` before substantial implementation.
- Do not edit, commit, reset, rebase or push `agent/codex`, or modify `CODEX_AUDIT.md`.
- Do not modify main in ordinary work; only an explicitly authorized promotion may touch it. Modify dev only after explicit candidate-integration approval.
- Before reviewing Codex, read `CODEX_AUDIT.md` at the candidate revision, then independently inspect the actual commits, diff, surrounding source, tests and results. Review is findings only by default.

This file supplies project instructions only; it does not configure Claude Code, its model or its tools.
