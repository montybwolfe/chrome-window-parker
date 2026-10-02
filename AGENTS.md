# Shared development workflow

This is the canonical instruction file for Codex/Astra, Claude Max and Claude Ultra. Keep this workflow lightweight. Consult [README.md](README.md), [TESTING.md](TESTING.md), [docs/BEHAVIOR.md](docs/BEHAVIOR.md) and [CHANGELOG.md](CHANGELOG.md) for product behavior, testing and release history; do not duplicate them here.

## Accepted state and ownership

**`main` = accepted RELEASE state. `dev` = accepted NEXT-RELEASE development state.**

At bootstrap, v1.5.1.3 is stable and submitted to the Chrome Web Store. Leave its runtime, version and submitted package unchanged unless the user explicitly requests relevant maintenance or release work.

| Branch | Role / owner | Local worktree, relative to the existing main checkout |
| --- | --- | --- |
| `main` | Canonical release state; user-controlled promotion | `.` (existing `Chrome Window Parker` checkout) |
| `dev` | Accepted integration state for the next release | `../chrome-window-parker-dev` |
| `agent/codex` | Codex's disposable candidate lane | `../chrome-window-parker-codex` |
| `agent/claude` | Claude Max's disposable candidate lane | `../chrome-window-parker-claude` |
| `agent/ultra` | Claude Ultra's occasional isolated deep-audit lane | `../chrome-window-parker-ultra` |

- Normal Codex/Max work starts from the latest **dev**, not main. Ultra follows the exact-baseline lifecycle below. Agent lanes are workbenches, not competing product histories.
- Modify, commit, rebase, reset and push only your own agent lane. Never perform these operations on the other agent's branch or edit its working files.
- Modify `dev` only when the user explicitly authorizes integration of an identified candidate. This one-time workflow bootstrap on dev is separately authorized.
- Modify `main` only for the specific promotion/release operation the user explicitly requests. Never silently switch to main.
- Codex owns `CODEX_AUDIT.md`; Claude Max owns `CLAUDE_AUDIT.md`; Ultra owns `ULTRA_AUDIT.md`. After initial bootstrap creation, never edit the other agent's audit. An approved cherry-pick may carry that candidate's existing audit entry unchanged.
- Accepted behavior already in dev is settled. Challenge it only with new concrete evidence of a bug, regression or other problem, not personal preference.

## Occasional Ultra cycles

Read [ULTRA.md](ULTRA.md) before working on `agent/ultra`. Its persistent name has disposable state: it may remain dormant and stale for weeks and is **not expected to stay current**. Ordinary lane refresh/rebase guidance does not apply to Ultra.

Lifecycle: dormant → explicit new-cycle authorization → reinitialize from an exact nominated verified SHA → isolated deep work → independent Claude Max review → selected approved commits integrated through the normal workflow → dormant again.

Do not merge intervening releases into a stale Ultra lane or routinely rebase a large old patch stack. Before a destructive restart, confirm the previous cycle is resolved and preserve genuinely valuable unresolved work under an identifiable archival ref only when needed. Re-evaluate old findings against the new baseline. Ultra must stop if stale without explicit authorization to reinitialize from a specified verified SHA.

Ultra may modify only its own lane; it must never write main, dev, agent/claude or agent/codex, or release/publish/submit anything. Max independently verifies actual commits, the complete baseline-to-candidate diff, source, tests and relevant live behavior before any Ultra-originated product work enters dev. Max may reject, reproduce or accept only part of a cycle; human integration approval is still required.

The initial Ultra infrastructure bootstrap is separately authorized to Codex: create the Ultra lane and its initial documentation and integrate only that workflow setup into dev. This grants no ongoing cross-lane authority and starts no Ultra audit.

## Source of truth

Use this order: (1) current code, (2) actual automated/live behavior, (3) Git commits, diff and history, (4) documented project invariants, (5) audit notes. Audit notes are context, not proof. Report concrete contradictions rather than silently redefining expected behavior.

## Before substantial work

1. Verify the current branch, expected worktree and working-tree status (`git branch --show-current`, `git rev-parse --show-toplevel`, `git status`, `git worktree list`). If the branch/worktree is wrong, stop and report it; do not begin implementation there.
2. Fetch origin and identify the current dev base commit. Check local dev against `origin/dev`; do not ignore unpushed or divergent integration work.
3. Check for unresolved candidate work before syncing your lane. Uncommitted files or an unresolved candidate must be preserved.
4. Read relevant source, tests and documentation, plus your own audit. When reviewing, read the other agent's audit **at the candidate revision**, not just an older copy in your lane.
5. Establish the requested scope and required validation from the user's instructions. Ask only when a material ambiguity remains.

Codex normally works in `../chrome-window-parker-codex` on `agent/codex`; Claude normally works in `../chrome-window-parker-claude` on `agent/claude`. Use explicit working directories; a chat may still be attached to the main checkout.

## Implementation and tests

- Preserve architecture and conventions; prefer narrow fixes. Do not broaden scope, perform speculative cleanup or refactor for style.
- Window/tab event ordering, focus dwell, macOS Spaces, Memory Saver, discard batches, restoration, tab movement/closure, protections, downloads, worker suspension and browser recovery interact. Read the relevant invariants before changing state transitions.
- Preserve default Chrome-managed sleeping, conservative eligibility, saved-tab restoration and Clear parked tabs' no-new-discards behavior unless a concrete, approved change requires otherwise.
- Do not add permissions, host access, remote code, analytics, telemetry, network behavior or dependencies unless explicitly required and approved.
- Do not bump versions, build/repackage releases, change Store assets, tag, publish or submit to the Store unless specifically requested.
- The canonical automated check is `npm test`. Follow TESTING.md and run tests appropriate to the change; do not add tests merely for coverage.
- Use installed-extension testing for Chrome lifecycle behavior where practical. Distinguish mock/unit results from actual Chrome results and record what was really tested.
- Use available chrome-extensions, Modern Web Guidance and Chrome DevTools MCP tooling when relevant. Guidance alone is not a reason to rewrite stable code.
- Never run two development copies of Window Parker simultaneously in the same disposable Chrome profile. Use separate profiles (for example, “Chrome Window Parker — Codex Test” and “Chrome Window Parker — Claude Test”), or coordinate exclusive testing with only one development copy enabled. Do not configure the other agent's tooling without a separate request.

## Candidate delivery and audit

Prefer one small, coherent engineering commit per task, or a short logical stack. Do not mix unrelated cleanup into the candidate. Update your own audit with useful handoff facts, test the candidate and push your own branch. Report the exact candidate SHA/range, files changed, tests actually run, important concerns and readiness for independent review. Then stop; completion is not approval to integrate.

Audit entries are concise engineering handoffs, never reasoning diaries, private reasoning, prompt transcripts, conversation dumps or speculative narratives. Use fields only when useful:

```markdown
### YYYY-MM-DD — Short task title

- Base: `dev @ <commit>`
- Candidate: `<commit/range>`
- Changed: ...
- Why: ...
- Verified: ...
- Found: ...
- Not changed: ...
- Open: ...
```

An entry committed with its candidate may say “this commit” (resolved with `git log -- <AUDIT_FILE>`) to avoid a self-referential hash. Report the exact SHA in the handoff. Include audit updates with useful work; do not create meaningless audit-only commits. Approved audit entries may accompany approved candidates into dev.

## Independent review

- Default to **findings only**. Identify the exact commit/range, inspect the actual diff and surrounding code, relevant tests/docs and real test results, and reason independently. Do not primarily trust the implementer's summary.
- Use read-only Git inspection (`git show`, `git diff`, `git log`) for the other lane. If checks need writable files, use an isolated disposable checkout of the exact candidate, without altering the other agent's branch or worktree. Apply the Chrome profile isolation rule there too.
- Focus on concrete bugs, races, stale state, Chrome API assumptions, event ordering, suspension/restart, focus, unsafe cleanup, regressions and missing tests that could expose those problems.
- A finding must explain a concrete problem with evidence: a failing test, reproduction, broken invariant, specific API behavior or event/state sequence. “I would write this differently” and style preferences are not findings.
- The implementer gets one normal opportunity to fix a finding or explain why it is invalid. If disagreement remains without new evidence, stop and ask the user to decide. Do not reopen the same issue under new wording or perform opportunistic refactors.
- Only implement an alternative when explicitly requested, and only on your own lane. Neither model's candidate is automatically preferred; the user chooses.

Parallel implementation is appropriate for independent tasks or deliberately competing candidates. Do not casually edit the same subsystem in both lanes when the results are expected to combine.

## Integrating an approved candidate into dev

“Merge/integrate this into dev” authorizes integration of the identified approved candidate, not unrelated lane history.

1. Use the dev worktree, fetch origin and verify it is on `dev` and clean. Fast-forward local dev to `origin/dev` when behind; inspect any divergence or unexpected local commits before proceeding.
2. Cherry-pick only the exact approved commit(s), in order. Do not routinely merge whole agent branches. Include only approved prerequisites; report missing dependencies rather than silently pulling in more work.
3. Resolve conflicts conservatively within the approved scope. If resolution requires a new product decision, report it to the user.
4. Run appropriate integrated tests, push dev without rewriting its history, and report source candidate SHA(s) and the resulting dev SHA(s).
5. Do not automatically reset the agent lane. Wait for task resolution and an explicit cleanup/sync instruction, or an instruction that unambiguously includes it.

Serialize integration/promotion operations: only one agent should write the dev or main worktree at a time.

## Refreshing a resolved agent lane

For ordinary Codex/Max lanes, begin unrelated tasks from current dev. Ultra instead follows [ULTRA.md](ULTRA.md). Never reset unresolved work, including a committed but unaccepted candidate. If dev advances during active work, preserve the candidate; deliberately rebase it onto current dev only when appropriate, rerun checks and make the revised SHA(s) available for re-review. Do not casually rewrite dev or main.

After acceptance or rejection/abandonment, and after the user confirms resolution and authorizes cleanup/sync:

1. Verify ownership, expected branch/worktree, clean status, no ongoing process using the lane, and that no unresolved candidate remains.
2. Fetch origin; verify `origin/dev` represents current accepted dev and inspect any unexpected remote lane updates.
3. Reset **only your own** disposable lane to `origin/dev`, then push with `--force-with-lease`, never naked `--force`.

For example, only after those checks, in the Codex worktree:

```sh
git fetch origin
git reset --hard origin/dev
git push --force-with-lease origin agent/codex
```

Claude uses the equivalent command for `agent/claude` in its own worktree. A failed lease is a reason to inspect remote changes, not to retry with `--force`.

## Promoting dev to main

Public GitHub Releases and the public changelog correspond only to versions actually published through the Chrome Web Store. Keep internal milestones as commits or branches (and internal tags only when needed), without public GitHub Releases; the eventual Store release notes should cover all user-visible changes since the previous Store release.

This is separate from development approval. Before a requested promotion, verify clean/current dev, passing automated tests, relevant installed-extension/manual checks, version/release readiness and a reviewed main-to-dev diff/commit list with no unexpected changes. Show the user what differs and perform only the exact authorized operation.

Verify main has not independently diverged. When main is simply behind dev, prefer `git merge --ff-only dev` from the clean main worktree; avoid unnecessary merge commits. Push main only within the authorized promotion scope. Promotion does not authorize tagging, building a release, publishing or Store submission; those require separate explicit decisions.

If a deliberate hotfix lands directly on main, synchronize dev from main before further development. Fast-forward when possible. If they diverged, report the histories and agree a conservative reconciliation; do not blindly reset dev, erase accepted work or maintain competing product histories.
