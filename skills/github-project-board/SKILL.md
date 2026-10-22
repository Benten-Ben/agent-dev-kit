---
name: github-project-board
description: Run a project's work through GitHub Issues and a GitHub Project (v2) board. Use when setting up a new repo or project board, filing or breaking down work into issues, claiming and moving work, linking dependencies or sub-issues, planning releases with gate issues, or coordinating several humans and Claude sessions on one codebase. Includes a portable `board` CLI. Pairs with the efficient-agent-dev skill.
---

# Project management on a GitHub Project board

One place holds all outstanding work: the board. Issues are the work orders; PRs close them; decisions are written on
the issue they decide. This lets several humans and many Claude sessions (including ones that start fresh tomorrow) pick
up work without asking.

## The rules

1. **Outstanding work lives only on the board.** Not in docs, TODO comments, memory files or chat. Anything you find
   elsewhere (a doc list, a review finding, a "later" in a PR) becomes an issue.
2. **Every issue is a work order** (template in `templates/task.md`): Goal, Acceptance (pass/fail), Owns (files it may
   change), Depends on, Context. A good work order is what lets a cheap agent build it.
3. **Claim before you work** (`board claim <n>`): assigns you and sets "In progress". Someone else's claim is theirs
   unless it's clearly stale.
4. **Status flow:** Backlog → Ready → In progress → In review → Done. "Ready" means fully specified and unblocked.
5. **PRs link their issue:** `Closes #n` when the PR finishes it; `Part of #n` for a piece of a bigger issue (it does
   **not** close the parent, so close parents yourself with a summary).
6. **Order and structure:**
   - **Sub-issues** for a breakdown (an issue can have only one parent);
   - **"Blocked by" links** for ordering (GitHub issue dependencies), plus a `blocked` label the tooling keeps in sync;
   - **Tracking issues** per phase or epic, and **gate issues** for releases (e.g. "exit sign-off", "release PR and tag")
     that are blocked by everything the release needs.
7. **Decisions go on the issue** they decide, as a comment starting "Decided (who, date):" with the reasons. Lasting
   decisions also get a short file in `docs/decisions/`.
8. **Labels carry routing** (`area:*`, `phase:*`, `size:S|M|L`, `review:light|standard|deep|critical`), plus states
   (`blocked`, `decision-needed`, `needs-design`). `board next` skips state labels.
9. **Releases get a light gate:** the release PR's own CI, plus the latest nightly judged by functional results. Timing or
   performance misses become documented known limits, filed for the next phase rather than blocking the tag.
10. **Keep the board honest:** close finished parents, remove stale `blocked` labels (`board sync-blocked`), and refile or
    close issues that no longer apply. A board nobody trusts stops being used.

## The `board` CLI (`scripts/board`)

A small, portable helper: bash plus `gh` and `python3`, configured by environment variables or a `.board.env` in the repo root:

```
BOARD_OWNER=your-login-or-org
BOARD_NUMBER=2                 # from the project's URL
BOARD_REPO=owner/repo          # optional; defaults to the current repo
```

Copy it into the project (e.g. `tools/board`), or run it from `~/.claude/skills/github-project-board/scripts/board`.
Commands: `ls [Status]`, `next [label]`, `new "<title>" [labels…]`, `claim <n> [--take]`, `unclaim <n>`, `status <n> <Status>`,
`block <n> <blockers…>`, `unblock <n> <blockers…>`, `blockers <n>`, `sync-blocked`. Add `--dry-run` to any write to see the
exact `gh` commands it would run.

## References

- `references/setup.md`: creating the project, fields, labels, templates and views; `gh` auth scopes.
- `references/operations.md`: a cookbook of `gh` and GraphQL commands (sub-issues, dependencies, fields, bulk edits).
- `references/gotchas.md`: things that bit us.

## With agents

Agents use the board the same way: the coordinator files and claims work orders and launches one build unit per issue;
units open PRs with `Closes #n`, and the coordinator merges and moves the card. See the efficient-agent-dev skill.
