---
name: efficient-agent-dev
description: How to run multi-agent development in Claude Code cheaply and reliably. Use when planning or launching agent work (Agent or Workflow tools), breaking a feature into parallel units, choosing a model and effort per role, building issues with agents, reviewing PRs with agents, or keeping plan usage low. Distilled from the Parkmates project's measured practice (2026-10); adapt the specifics to your project.
---

# Efficient agent development

The goal: **the least plan usage per accepted change, at equal quality.** Measured on a real project, the biggest cost lever was
how the orchestrating session launched agents, not the agents' scripts: Opus/xhigh everywhere, big fan-outs, and agents
inheriting the session's model. Fixing that cut cost several-fold without losing quality.

## The rules

1. **Break work down, then run cheap parallel units.** Each well-specified item goes through one *build unit* (check → build
   → review → fix, at most 4 agents) on **Haiku low**. Run as many units in parallel as your machines and rate limits allow.
   Combine items into one bigger task **only** for a strictly serial track with nothing to parallelize.
2. **Climb the model ladder only where evidence says the cheap rung breaks.**
   Haiku low → Haiku with a precheck → Sonnet medium/high → Opus medium → Opus high. Opus is roughly 40× Haiku's price
   and Sonnet about 20×. Escalate by **risk tier**, not by habit (see the table below).
3. **Always set `model` and `effort` explicitly on every agent you launch.** An agent without them inherits the session's
   model and effort; if the session is Opus/xhigh, so is every helper. Never use xhigh for helpers.
4. **A good work order is what makes Haiku work.** It names the files it owns, quotes the code and contract it touches,
   gives exact steps, the test commands and a pass/fail acceptance. Run a cheap **precheck** on any agent-written work order:
   it corrects stale quotes and values and surfaces design gaps before a builder spends anything.
5. **Big breakdowns need a strong planner.** Opus writes the skeleton (interfaces, file ownership, ordering, computed
   values) and **one** strong cross-review checks it. Cheap per-item reviews miss the seams between items.
6. **Keep review fan-out fixed by risk tier, never per finding.** Light 1 agent, standard 1–3, deep 3–4, critical about
   6 (lenses plus one skeptic who checks all findings in one pass). Cap review rounds at two; fix minors without re-review.
7. **Test once.** Builders run only the tests their change touches; CI runs the full suite. A test that passed on code that
   hasn't changed keeps its result. Releases get a light gate: the integration PR's CI plus a nightly judged by functional
   results; timing-only misses become documented known limits.
8. **Launch workflows only from turns you started yourself** (a timer or task notification), never from a turn that began
   with a user message: that message is relayed to every workflow agent, and they answer it instead of working.
9. **Isolate parallel builders**: one git worktree and one test slot per unit, disjoint file ownership, no shared
   `git stash`. The coordinator merges; units never merge.
10. **Don't over-build process.** Ship the product. Tooling work only when it unblocks building, as one small step. Prefer
    one cheap live run over elaborate mocks.
11. **Do small things yourself.** Every agent call carries a fixed prefix of tens of thousands of tokens. A one-line fix, a merge
    conflict, a citation or a doc paragraph you already understand is cheaper inline. This holds even when a session mode
    says to use workflows for everything.

## Model and effort by role

| Role | Default | Escalate to | When |
|---|---|---|---|
| Classifier, gatherer, poller, mechanical step | Haiku low | – | never |
| Work-order precheck | Haiku low | Sonnet medium | the order cites lots of code |
| Builder, well-specified item | Haiku low | Sonnet medium | needs judgment (test design, refactors) |
| Builder, **critical or untrusted-input** (network, auth, save formats, CI/deploy, validation) | **Sonnet high** | – | always this rung |
| Single PR reviewer | Haiku low (light) / Sonnet medium (standard) | **Opus high** | critical tier |
| Skeptic fixer | Haiku low | Sonnet high | critical tier |
| Whole-PR critical review | 3–4 Opus high lenses + 1 Opus high skeptic | – | critical PRs, before merge |
| Planner of a big breakdown | **Opus medium/high** | – | plus one Opus cross-review |
| Research gathering | Sonnet medium | – | – |
| Synthesis, final judge | Opus high | – | – |

Evidence behind these picks: `references/model-ladder.md`.

## Workflow shapes (templates in `templates/`)

- **Build unit** (`templates/build-unit.js`): precheck → build (opens a PR) → one review → skeptic fix. The default for
  every well-specified issue. Details: `references/build-unit.md`.
- **Whole-PR critical review** (`templates/critical-review.js`): independent lenses over the *whole* diff, then one skeptic
  who tries to refute each finding. Use for critical-tier PRs before merge.
- **Plan + cross-review** (`templates/plan-breakdown.js`): a strong planner returns structured work orders with disjoint file
  ownership, then one strong reviewer fixes overlaps, gaps and order. You then file the work orders and launch build units.
  Details: `references/reviews-and-planning.md`.

## Launching a template

Copy a template into the project (e.g. `tools/agent-workflows/`) and adapt it, then run it by its **absolute** path
(`~` is not expanded):

```
Workflow({ scriptPath: "/abs/path/to/project/tools/agent-workflows/build-unit.js",
           args: { repo: "owner/name", issue: 123, base: "main", wt: "/abs/path/.claude/worktrees/i123",
                   test_cmd: "npm test -- path/to/affected.test.js", tier: "standard" } })
```

The Workflow tool may refuse a `scriptPath` outside the working directory and the directories added to the session,
which includes this plugin's own folder. Then copy the template into the project, or pass its whole text as `script`.
Write `model` and `effort` literally in each `agent()` call: the launch guard reads the script's text, so a value spread
from a helper (`...cellsFor(role)`) reads to it as missing.

Where the work comes from and goes back to (issues as work orders, claiming, sub-issues, "blocked by" links, gate issues): the **github-project-board** skill.

The coordinator's side of the loop (launching safely, reading results, merging, recovering from interruptions, what stays
with the human): `references/coordinator.md`.

## Gotchas checklist (before every launch)

- [ ] Launched from a turn **I** started (timer or notification), not from a user message? (rule 8)
- [ ] Every agent has an explicit `model` and `effort`?
- [ ] Fan-out fixed by tier, stated before launching anything big?
- [ ] Each parallel unit owns disjoint files, its own worktree and its own test slot?
- [ ] Prompts say "never `git stash`" (the stash list is shared by all worktrees)?
- [ ] Work is resumable? Usage limits and network drops kill agents mid-task; keep state in issues, branches and files.
- [ ] Not more than about 12 agents hitting the GitHub API at once (rate limits)?
- [ ] Workflow scripts and their inputs saved in the project (git-ignored), not in the session's temporary folder?
- [ ] Did a person's message arrive during this turn? Then it is theirs: restart the timer and launch from its notification.

More gotchas, each from a real incident: `references/gotchas.md`.

The numbers here were measured in October 2026 on two projects. Models and prices change, so re-measure before trusting a
ratio (`scripts/measure-usage.py` reads your agents' transcripts), and record what you find.

## Adapting this to your project

Replace the project specifics in the templates: the test command, how issues are claimed, where builds run and how PRs merge.
Keep the shape: cheap parallel units, explicit models, fixed fan-out, a strong planner for big breakdowns, and an
escalation only where your own evidence says the cheap rung breaks. Record each model change as a short decision with its
evidence, so the next session knows why.
