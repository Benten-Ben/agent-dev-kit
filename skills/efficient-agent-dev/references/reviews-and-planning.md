# Reviews and planning

## Review tiers

| Tier | Agents | Shape |
|---|---|---|
| light | 1 | Haiku low sanity review |
| standard | 1 (the unit's reviewer) | Sonnet medium |
| deep | 1, maybe 2 | Sonnet high; a second lens only if the change is subtle |
| critical | ~6 | 3–4 Opus-high lenses over the **whole** diff + 1 Opus-high skeptic |

- **Never one agent per finding.** A first attempt that gave every finding its own skeptic hit 23+ agents on a 99-line PR.
  One skeptic checks all findings in one pass.
- **Cap rounds.** One review round, fix the minors without re-review. Two rounds at most.
- **Whole-PR, not delta.** A review tool that resumes from an earlier review marker only reviews the delta since then. For a
  critical review after a unit's own review, review the full `base...head` diff explicitly.

### Critical review lenses (pick 3–4 per change)

- **Untrusted input / security:** parsing, allow-lists, injection, file handling (symlinks, TOCTOU), what reaches a shell.
- **Flow correctness:** trace every command path and failure path; refusals happen before any change; old and new versions
  interoperate (an older script reading the new files must fail safe, not proceed).
- **Semantics:** values mean the same thing to every consumer; empty vs unset vs default.
- **Tests and hand-over:** would the new tests fail if the fix were removed (mutation check)? Any assertion that can't fail?
  Is the operator hand-over complete?

Then the **skeptic**: tries to refute each finding against the code; defaults to "not real" when the scenario doesn't
reproduce. Fix only what survives.

## Planning a big breakdown

Use when a feature splits into many items, especially with generated data, pinned values or multi-stage pipelines.

1. **A strong planner (Opus, medium or high)** returns structured work orders:
   - disjoint **file ownership** (exact paths; a file needing two kinds of change goes to one unit that does both);
   - **order** (`depends_on`) only where truly needed (e.g. a lint that enforces the result goes last);
   - a **tier and builder model** per unit;
   - per unit: steps, a grep or test that proves it's done, the exact test commands;
   - a **coverage map**: every requirement mapped to a unit or "kept, because…".
2. **One strong cross-review (Opus)** re-derives coverage and ownership from the real tree, fixes overlaps, orphans,
   infeasible steps and ordering, and returns the corrected plan.
3. **You** answer its open questions as decisions on the issue, file the work orders, and launch build units for every unit
   with no unmet dependency.

Small, self-contained items (polish, review follow-ups) need none of this: build unit straight away.

## Keep the public text clean

Work orders, PR bodies and review comments are often public. If the project must not expose private details (hosts,
addresses, accounts), keep a pattern list outside the repo, check every generated body against it before posting, and
have a CI lint enforce it on the tree. Agents tend to quote the exact private value they just replaced in their PR body.
