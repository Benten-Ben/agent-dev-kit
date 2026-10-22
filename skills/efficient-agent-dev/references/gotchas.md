# Gotchas (each from a real incident)

**A user message reaches every workflow agent launched in its turn.** Builders answered the user's question ("is the GPU box
off?") instead of building and returned nothing; persona panels got biased by the user's framing. A guard line in the prompt
is not enough. Fix: launch workflows only from turns you started yourself, e.g. run `sleep 15; echo trigger` in the
background and launch from its notification. Then check: no agent transcript should contain the relayed request.

**Agents inherit the session's model and effort.** An Opus/xhigh orchestrator silently made every helper Opus/xhigh. Always
pass both explicitly.

**`git stash` is shared by every worktree.** Parallel builders popped each other's stashes. Prompts say: never `git stash`;
use a temporary WIP commit instead.

**Rate limits.** About 14 agents calling the GitHub GraphQL API exhaust an account's hourly budget. Cap gh-heavy agents near
12, or give agents a separate token.

**Usage limits and network drops kill agents mid-task.** Keep work resumable: state in issues, branches, worktrees and files.
After an interruption, check each worktree for half-finished edits and tell the relaunched builder to review them (`git diff`)
and drop probes.

**Back-to-back merges go untested together.** Each PR passed CI alone; the integration tip failed. Re-run CI on the tip after a
burst of merges, and re-run the PRs that touch the same seam.

**Stacked PRs pollute reviews.** A build stacked on an unmerged PR reported the wrong review base; the diff included another
branch's merge and the critical review burned ~1M tokens on unrelated code. Review against the real base.

**Watchers drop red PRs and stop.** An auto-merge watcher that removes a red PR from its list leaves an empty list; re-arming it
then logs "all merged" and exits. Restore the list line before re-arming, and verify merges with the API, never from a log.

**Wall-clock tests flake on shared CI boxes.** Gate timing assertions (skip under CI or under high load), or better, make the
test deterministic: drive frames with a fixed timestep and assert against literal caps. Check with a mutation that the test
can still fail.

**A script that dies under `set -e` hides its failure.** A sourced helper turned on `errexit` inside the CI script, so failed
steps ended the run with no FAIL line, and every failure looked like an infrastructure flake. If failures look silent,
check the shell options first.

**Haiku's structured output drops list fields** it was told are required, failing a step whose work was done. Make those
fields optional in the schema, and let a unit resume from an already-open PR.

**A builder that backgrounds a long test and returns** leaves work uncommitted and resources held. Tell builders to run
tests in the foreground and commit before returning.

**Cleanup on shared machines may need the human.** A permission classifier can (rightly) block bulk deletes on shared boxes.
Write a dry-run-by-default cleanup script the human runs, rather than working around the block.
