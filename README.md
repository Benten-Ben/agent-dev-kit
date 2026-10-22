# agent-dev-kit

Efficient multi-agent development with Claude Code, distilled from building a multiplayer game with a coordinator
session, many parallel agents and a GitHub Project board (October 2026).

## What's inside

| Part | What it does |
|---|---|
| **`efficient-agent-dev`** skill | Running agents cheaply and reliably: cheap parallel build units, the model and effort ladder by role and risk, review tiers, planning big breakdowns, the coordinator's loop, and a gotchas checklist. Three workflow templates: build unit, whole-PR critical review, plan + cross-review. |
| **`github-project-board`** skill | Running work through GitHub Issues and a Project board: issues as work orders, claiming, statuses, sub-issues, "blocked by" links, release gates, setup and a `gh` cookbook. Includes a portable `board` CLI. |
| **Launch guard** (hooks) | Refuses a `Workflow` launch in a turn that began with a message from a person or another session: that message would be relayed to every workflow agent. Also reminds Claude when an `Agent` call or a workflow `agent()` call sets no explicit model. |

## Install

From this repository's marketplace:

```
/plugin marketplace add <owner>/agent-dev-kit
/plugin install agent-dev-kit@agent-dev-kit
```

Or try it locally without installing: `claude --plugin-dir /path/to/agent-dev-kit`.

If `claude plugin list` reports the plugin as **failed to load** with a hook error ("expected record"), check
`claude --version`: an old local install (`~/.claude/local/claude`) predates hook modules and misreports it, while a
current Claude Code loads it. Update or remove the old CLI.

## Use

- Say "use efficient-agent-dev to plan this", or just ask for agent work. The skill loads when the work matches.
- For the board: put `BOARD_OWNER` and `BOARD_NUMBER` in a `.board.env` at the repo root, then run
  `skills/github-project-board/scripts/board help`. Every write supports `--dry-run`.
- The launch guard needs nothing. When it refuses a Workflow, it says how to launch safely (from a turn the session
  started itself, e.g. a background timer's notification).

## Adapt it

The numbers and the model picks were measured on one project in October 2026. Re-measure on yours, and record what you find.
Replace the project specifics in the templates (test commands, how issues are claimed, where builds run).

## Develop

```
claude plugin validate .
claude plugin test .        # the launch guard's tests (tests/guard.test.ts)
```

## License

MIT, see [LICENSE](LICENSE).
