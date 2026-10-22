# The build unit

One issue in, one reviewed PR out. At most 4 agents. The coordinator (your main session) merges; the unit never does.

```
precheck (Haiku low)  →  build (Haiku low / Sonnet high)  →  review (1 agent)  →  skeptic fix (1 agent)
```

## 1. The work order (the issue body)

A builder on Haiku succeeds or fails on this. Template:

```
**Goal:** one or two sentences, the outcome.

**Steps:** numbered, exact. Quote the current code or contract lines it touches (file:line).
Give replacement rules, not vibes ("X becomes Y in these files"), and the exact commands to run.

**Acceptance:** pass/fail checks: test names, a grep that must print nothing, a command's expected output.

**Owns:** the exact files (or directories) this unit may change. Disjoint from every parallel unit.

**Depends on:** issue numbers that must merge first, or "nothing".

**Context:** links to the design section, decisions, related issues.
```

## 2. Precheck (Haiku low)

Reads the work order against the real code at the base branch: every quoted line, value, path and test name.
- Corrects stale facts in the issue body itself.
- Returns `needs_decision` items for real design questions. **Stop the unit** if there are any, answer them on the issue
  (you or the human), then relaunch with the precheck off.
- Always run it on agent-written work orders; it's cheap and catches a lot.

## 3. Build

- Fresh git worktree from the base branch; its own test slot or port range.
- Implement exactly the work order. Write the test first when there's a bug to fix, and show it failing first.
- Run **only** the tests that cover the change. CI runs the full suite.
- Commit, push, open a **draft** PR (`Closes #n`), return a structured report: PR number, head sha, tests and results,
  known issues, anything not done.

## 4. Review (one agent)

- Reviews exactly the head sha. Posts one review comment with an acceptance table (each item met or not, with evidence)
  and findings, each with a concrete scenario (inputs → wrong outcome) and a fix.
- Reviewers run no tests; they read code and the builder's evidence.

## 5. Skeptic fix (one agent)

- For each finding: **KEEP** (real, fix it), **DROP** (not real, say why), or **ANSWERED** (a question).
- Re-runs only the tests covering what it changed. Pushes, marks the PR ready.

## Tiers

| Tier | Build | Review | Fix | Then |
|---|---|---|---|---|
| light / standard | Haiku low | Haiku low (light) or Sonnet medium | Haiku low | merge on green CI |
| deep (tricky logic) | Haiku low or Sonnet medium | Sonnet high | Sonnet medium | merge on green CI |
| critical (network, auth, save formats, CI/deploy, untrusted input) | **Sonnet high** | **Opus high** | Sonnet high | **whole-PR critical review**, then merge |

## After the unit

The coordinator: checks the PR's diff for anything sensitive, waits for CI, merges, frees the slot, and launches anything
that was waiting on this item. Watch for a unit that "succeeded" with an empty result: read its journal before assuming
it did nothing (agents can finish the work and fail only the structured return).
