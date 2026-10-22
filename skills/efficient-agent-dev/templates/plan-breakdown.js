export const meta = {
  name: 'plan-breakdown',
  description: 'Plan a big change as disjoint work orders (strong planner), then one strong cross-review that fixes ownership, coverage and order.',
  phases: [{ title: 'Plan' }, { title: 'Cross-review' }],
}
// Generic template from the efficient-agent-dev skill. args: wt (a read-only checkout), base, goal (what to plan: issue numbers,
// requirements, binding decisions), builder_env (how builders work: test commands, worktrees, what they can and can't run).
// Returns the corrected plan; you file each unit as an issue, record its depends_on, and launch build units.
const A = (typeof args === 'object' && args) || {}
for (const k of ['wt', 'base', 'goal']) if (!A[k]) throw new Error(`plan-breakdown: args.${k} is required`)
const UNIT = { type: 'object', properties: {
  key: { type: 'string' }, title: { type: 'string' }, size: { type: 'string', enum: ['S', 'M', 'L'] },
  tier: { type: 'string', enum: ['light', 'standard', 'deep', 'critical'] }, build_model: { type: 'string', enum: ['haiku', 'sonnet'] },
  owns: { type: 'array', items: { type: 'string' } }, depends_on: { type: 'array', items: { type: 'string' } },
  tests: { type: 'array', items: { type: 'string' } }, work_order: { type: 'string' } },
  required: ['key', 'title', 'size', 'tier', 'build_model', 'owns', 'depends_on', 'tests', 'work_order'] }
const PLAN = { type: 'object', properties: { units: { type: 'array', items: UNIT },
  coverage: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, unit: { type: 'string' } }, required: ['item', 'unit'] } },
  open_questions: { type: 'array', items: { type: 'string' } }, changes: { type: 'array', items: { type: 'string' } } },
  required: ['units', 'coverage', 'open_questions'] }
const CONTEXT = `Read-only checkout: ${A.wt}. Run \`git -C ${A.wt} fetch -q origin\`, then read origin/${A.base} with \`git grep\` / \`git show\`. NEVER edit, commit or file issues: return a plan.
GOAL: ${A.goal}
BUILDER ENVIRONMENT: ${A.builder_env || 'each unit is built by one builder in its own worktree off the base branch, which opens one PR, then gets one review and one fix round.'}
Rules: units are S or M (one builder session); OWNERSHIP IS DISJOINT (exact paths; a file needing two kinds of change belongs to one unit); depends_on only where truly needed; tier critical only for security, untrusted input, data formats or CI/deploy; each work order has Goal, Steps (exact, with quoted current code), Acceptance (a grep or test that proves it), Owns, Depends on, Context; the tests are exact commands.`

phase('Plan')
const plan = await agent(`${CONTEXT}\n\nYOUR JOB: write the work breakdown and the coverage map (every requirement → a unit key, or "kept: <reason>").`,
  { label: 'planner', phase: 'Plan', schema: PLAN, model: 'opus', effort: 'high' })
if (!plan) return { error: 'planner returned nothing' }
log(`planner: ${plan.units.length} units`)

phase('Cross-review')
const final = await agent(`${CONTEXT}\n\nYOUR JOB: cross-review this plan and return the CORRECTED FINAL plan (same schema, with \`changes\` listing what you changed and why).
Check, and fix in what you return: (1) disjoint ownership, by expanding globs against \`git ls-tree -r --name-only origin/${A.base}\`; (2) coverage, by re-deriving the requirements from the tree yourself and assigning any orphans; (3) feasibility for the chosen builder model: precise steps, runnable checks, tests that exist; (4) order and tiers; (5) anything binding the planner missed.
The plan: ${JSON.stringify(plan)}`, { label: 'cross-review', phase: 'Cross-review', schema: PLAN, model: 'opus', effort: 'high' })
return final || plan
