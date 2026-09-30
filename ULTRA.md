# Claude Ultra operating contract

Read [AGENTS.md](AGENTS.md) first. Ultra is an occasional, compute-intensive deep-audit and experimental hardening lane, not a continuously current development branch. The name `agent/ultra` persists; its state is disposable between resolved cycles. Initial setup alone authorizes no audit or product work.

## Start each new cycle

1. Inspect branch, worktree, status, remotes and previous cycle disposition. Work only on `agent/ultra` in `../chrome-window-parker-ultra`, relative to the main checkout.
2. Require explicit new-cycle authorization and an **exact nominated verified product SHA**. Usually this is verified main/release; dev is valid only when deliberately approved for an unreleased audit. Ultra must not choose what “latest” means or select by timestamps.
3. Verify the nominated commit and its validation evidence after fetching. Confirm the lane was freshly initialized from that SHA, and record it and the objective in [ULTRA_AUDIT.md](ULTRA_AUDIT.md) before investigation. For a resumed cycle, verify its recorded baseline and checkpoint instead of resetting.
4. Reconstruct understanding from current code, docs and tests. Old Ultra context is historical only. Source priority: current code → observed behavior/tests → Git → current docs → audit files → old Ultra context.

If stale, **stop unless the human/reviewer explicitly authorized reinitialization from a specified verified SHA**. Do not catch up by merging weeks of development, routinely rebasing a huge stale patch stack, or reconstructing old conversations.

## Reinitialize safely

The authorized operator first confirms the prior cycle is accepted/rejected/resolved, checks clean status and no active process using the lane, and checks local/remote refs for unexpected updates. Never erase valuable unresolved work. If preservation is genuinely needed, retain an identifiable archival ref before resetting; do not create archives automatically for every cycle.

After those checks, fetch and resolve the nominated full SHA. Reset **only agent/ultra** to that exact commit and push with `--force-with-lease` against the inspected remote tip; inspect a failed lease rather than bypassing it. Never substitute `origin/dev` for the nominated SHA. If the baseline predates these workflow files, explicitly arrange the reviewed workflow-only bootstrap before investigation and record it separately from the product baseline.

Retain useful prior cycle summaries in the current audit (copy them from the inspected old tip before resetting if necessary). Mark the current cycle and baseline unmistakably. Reproduce interesting old findings against the new baseline; old fixes are not presumed applicable.

## Isolated work and checkpoints

Investigate aggressively within the authorized objective; all changes stay on `agent/ultra`. Never modify main, dev, agent/claude, agent/codex or their working files/audits. Never publish releases, tags or Store submissions. Follow existing product constraints and use an exclusive disposable Chrome profile for live testing; do not run two development copies together.

Keep coherent Git checkpoints and concise handoffs. At major boundaries, check status and update the audit with exact baseline/checkpoint, completed areas, evidence, remaining work and next action. On interruption, preserve the working tree and record current phase, last good commit, changed files, tests run/not run and commit/push status. Do not commit broken work just for a checkpoint. Never store private chain-of-thought, prompt dumps or conversation transcripts.

## Review and disposition

Deliver exact baseline and final candidate SHAs, complete diff, concrete findings and tests actually run, with live-test limits stated. Claude Max must independently inspect commits, the full baseline-to-Ultra diff, surrounding source, tests and relevant live behavior; Ultra's written findings are not proof. Max may accept, reject, reproduce differently or select only part of a cycle.

Only independently verified, human-approved commits may enter dev through its normal integration workflow, performed by the authorized integrator, never Ultra. Release promotion remains separate. Once resolved, the lane may become dormant again; it has no synchronization obligation.
