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

**The session's scratchpad isn't durable.** During a four-day pause, macOS cleaned the session's temporary folder
(`/private/tmp/...`) of idle files: the helper that lets a new agent pick up a stopped one, a patched workflow script,
and half of a test virtualenv's packages. Keep workflow scripts, helpers, run inputs and test environments in a
git-ignored folder inside the project (e.g. `data/dev/wf/`), never in the scratchpad.

**Resuming a workflow after a long pause can re-run finished work.** `resumeFromRunId` reused the finished builds but
started finished *reviews* again as new agents (their cache keys no longer matched), which would have re-fixed work
that was already merged. After anything longer than a short interruption, write a fresh, small workflow that reads
the old run's results from its `journal.jsonl` through a file (not through large `args`), and check the journal for
unexpected `started` lines right after any resume.

**Browser tests time out on a busy machine.** On a laptop shared with other sessions' browsers, specs failed by
timeout again and again at a load average of 20–150; the same specs passed at about 10. Check `uptime` before a
browser run, run one spec run at a time behind a lock, and rerun a timeout-only failure at low load before calling
it a regression.

**A symlinked `node_modules` in a worktree leaks into the primary checkout.** SvelteKit writes its generated
tsconfig into `node_modules/$app/`; through a symlink, `svelte-check` resolved paths into the primary checkout (24 false
`./$types` errors) and the worktree's build rewrote the primary's generated files. Give each worktree its own copy; on
APFS, `cp -cR` makes it nearly free.

**A message that arrives mid-turn makes the turn a person's.** A user message delivered while the coordinator was
working counts as starting the turn, so a Workflow launched later in that same turn would relay it, and the launch guard
refuses it. Reply, start the `sleep 15; echo trigger` timer again, and launch from its notification.

**The instructions file is paid on every call of every agent.** Each agent starts with the project's CLAUDE.md (and the
other instructions) in its context, and re-reads its whole context on every model call. On one project a 300 KB
CLAUDE.md put every agent's first call at about 140k tokens before any work. Keep it short, move dated status and
history to other files, and measure with `scripts/measure-usage.py`.

**Agent-driven PRs multiply CI minutes, and a failed payment stops every hosted job.** Each push to a PR re-runs CI, and
every job is billed rounded up to the minute, so a month of agent PRs on a private repo can pass GitHub Free's 2,000
minutes. When the overage charge then failed, GitHub stopped starting hosted jobs on that account ("recent account
payments have failed or your spending limit needs to be increased"), and the nightly backup and monitors went quiet with
it. Run CI only on PRs marked ready (`types: [opened, synchronize, reopened, ready_for_review]` and `if:
github.event.pull_request.draft == false`), set the spending limit to $0 so running out pauses instead of charging, and
have something outside GitHub notice a backup that stopped.

**Self-hosted runners keep working when hosted jobs are blocked, with three cautions.** On a personal account a runner
serves one repository (only an organization can share runners across repos), so "use the existing runners" means a new
runner instance per repo. Keep runners that run PR code apart from jobs that hold real secrets (a separate runner, or
at least a separate user, for the backup or deploy), and off any host where the runner's user can reach production (a
runner user in the docker group of production's daemon is root over it). Never put a self-hosted runner on a public
repo without fork-PR protection: approval for outside collaborators, a head-repo check in the job, and a root-owned
job-started hook set in the service unit (`ACTIONS_RUNNER_HOOK_JOB_STARTED`), failing closed.
