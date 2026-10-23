# The model ladder: the evidence

Measured on the Parkmates project (Godot/GDScript multiplayer game, two maintainers plus agents), October 2026.

## Baseline and the biggest lever

- **Baseline:** all Opus, mostly at xhigh. About $43 of plan usage per merged PR.
- **Where usage actually went:** the pipeline scripts were only about half. The rest came from how the orchestrating session
  worked: effort defaulting to xhigh, a workflow for every task, and the fixed prefix (around 50k tokens) every agent call
  carries.
- **A drift check one week in:** in 24 hours, 1,433 agents ran, 61% of them Opus (about 80% of output tokens) and only 7%
  Haiku. Opus seg-units with deep reviews had quietly become the default. Writing the rules down and checking them before
  every launch fixed it.

## What each rung proved

| Finding | Evidence |
|---|---|
| **Haiku low with a precheck builds well-written work orders** | An overnight run: about 40 issues, 53 PRs merged. Coaster sub-issues came back clean or with minor findings. Every precheck corrected stale citations or values; three surfaced real design gaps before any build. |
| **Haiku low does not build critical or untrusted-input code** | A packet guard had 2 blockers (wrong wire shape, missing session operations); an auth gate had 1 blocker, 6 majors and then a Host-header bypass; Haiku fixers only partly fixed them. Sonnet high builds of comparable lanes were much cleaner. |
| **One reviewer is not a critical review** | A whole-PR 6-agent review of one network PR found 20 issues (3 majors) that its single Opus-medium reviewer missed. On a deploy-config PR, a 4-lens + skeptic review found 8 real issues after an approving Opus review, including one that would have let an old script deploy empty addresses to production. |
| **Opus medium is the best-value single reviewer** | 74% recall at about $0.89 per review, against Opus high's 76% at $1.09. |
| **Haiku low ties every model at picking a review tier** | About $0.005 per pick. |
| **Haiku effort buys almost nothing on review tasks** | Medium/high Haiku ≈ low on review recall. |
| **Fable is never worth it** | Higher cost, no quality gain on any measured role. |
| **Cheap reviews miss seams in big plans** | A 20-item breakdown: Haiku plan, Haiku shape review, Haiku per-item reviews and a Haiku revision; then one Opus-medium review still found 7 blockers and ~15 majors, almost all at the seams between items or in values only computing reveals. |

## A second project's baseline (a website, October 2026)

- Before adopting these rules: 46 workflows ran 303 agents in ten days, every one on Opus at xhigh. An agent averaged
  about 93 model calls and about 29 million cache-read tokens; its first call already held about 140k tokens, most of
  it the project's instructions file.
- The first chunk under the rules (a check of a 223-row backlog: eight Sonnet-medium readers and one Opus-high critic)
  averaged about 14 calls and 2.4 million cache-read tokens per agent, and the owner accepted the result unchanged.
- Measured with `scripts/measure-usage.py`, which reads the agents' own transcripts.
- **One reviewer is not a critical review, again.** On the same project a harness PR (the build-unit script, path-based
  review floors, merge helpers) passed its single Opus-high review after one fix round. The whole-PR critical review
  (four Opus-high lenses and one skeptic) then confirmed 21 of its 24 findings, among them a blocker: the floor check
  printed nothing on macOS, so no PR's review tier would ever have been raised.

## Rules of thumb

- **Price ratios** (approximate): Opus ≈ 40× Haiku, Sonnet ≈ 20× Haiku.
- **Escalate one rung at a time**, and only for the role and tier where the cheaper rung failed.
- **Keep model selection open to evidence.** Record each change as a short decision with the run that justified it.
- **Measure, don't estimate:** `scripts/measure-usage.py` prints agents, models, calls and tokens per workflow run.
- **The orchestrator can stay strong** (it holds the context and makes the calls); it's the helpers that must be cheap.
