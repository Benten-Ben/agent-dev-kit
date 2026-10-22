# The coordinator (your main session)

The coordinator holds the context and makes the calls; the agents do bounded work. Most of the quality and most of the
savings come from how the coordinator runs the loop.

## The loop

1. **Plan or pick** the next items (from the board or a breakdown). Answer open design questions yourself when the human
   has delegated them, and post each answer on its issue so builders and future sessions see it.
2. **Launch from a turn you started.** If the human just wrote, start `sleep 15; echo trigger` in the background, reply,
   and launch from the notification turn. Then check that no agent transcript contains the relayed user request.
3. **Read every result**, including empty ones: an agent can do the work and only fail its structured return. Check its
   journal or worktree before assuming nothing happened.
4. **Check before merging:** the diff at its head sha, the PR body (agents quote private values they just removed), CI
   green, and draft PRs marked ready (a clean review skips the fix round, which is what usually marks a PR ready).
5. **Merge** (or arm a watcher that merges on green), close or update the issue, free the worktree and test slot, and launch
   whatever was waiting on this item.
6. **Record** decisions and lessons where the next session will find them: issue comments, short decision files, and the
   project's memory or handoff doc.

## Do it yourself when…

Launching an agent costs a fixed prefix (tens of thousands of tokens) plus coordination. Do it inline when:
- it's a one-line fix, a citation, a merge conflict or a doc paragraph you already understand;
- you already hold the context the agent would have to rebuild;
- it's a single lookup or check (one grep, one API call).

If a session-level mode tells you to use workflows for every task, these efficiency rules still win for small work.

## Watching without polling

- Use background commands that wait for a state change and exit (a PR merging, a CI run completing, a host coming back
  after a reboot); their completion wakes you. Don't poll with sleeps in the foreground.
- A merge watcher should verify state through the API, keep its list intact when it drops a red PR, and never be trusted
  from its log alone: confirm "merged" with `gh pr view`.

## Interruptions (usage limits, network drops, reboots)

- Keep state outside the conversation: issues, branches, worktrees, a small runs table (issue → workflow run id).
- After an interruption, list what stopped. For each: what the worktree holds, whether a PR exists, and what CI says.
  Relaunch with precheck off and a comment telling the builder to review the leftover edits.
- A CI job killed by a runner shutdown isn't a code failure: confirm from the job log, then rerun.
- After a pause longer than a few hours, don't resume a workflow run: start a fresh one from the old run's journal
  (see gotchas.md).

## What stays with the human

Confirm before anything irreversible or outward-facing unless the human has delegated it explicitly: production deploys and
promotions, release tags, deleting data, credentials and accounts, billing, and anything published. Delegation is per action
or scope. "Tag this release for me" covers that release, not every future one. When a permission check blocks something
on shared infrastructure, write a dry-run-by-default script for the human to run rather than working around the block.
