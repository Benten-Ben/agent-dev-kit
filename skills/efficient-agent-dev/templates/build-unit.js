export const meta = {
  name: 'build-unit',
  description: 'One issue through a cheap build unit: precheck → build (opens a PR) → one review → skeptic fix. The coordinator merges.',
  phases: [{ title: 'Check' }, { title: 'Build' }, { title: 'Review' }, { title: 'Fix' }],
}
// Generic template from the efficient-agent-dev skill. Launch from a turn YOU started (not a user message).
// args (required): repo "owner/name", issue <n>, base "main", wt "/abs/path/to/new/worktree", test_cmd "npm test -- <files>"
//   tier: light | standard | deep | critical (default standard)   precheck: true|false (default true)
//   models: optional overrides { precheck, build, review, fix } each { model, effort }
const A = (typeof args === 'object' && args) || {}
for (const k of ['repo', 'issue', 'base', 'wt', 'test_cmd']) if (!A[k]) throw new Error(`build-unit: args.${k} is required`)
const TIER = A.tier || 'standard'
const CELLS = {
  light:    { precheck: ['haiku', 'low'], build: ['haiku', 'low'],    review: ['haiku', 'low'],     fix: ['haiku', 'low'] },
  standard: { precheck: ['haiku', 'low'], build: ['haiku', 'low'],    review: ['sonnet', 'medium'], fix: ['haiku', 'low'] },
  deep:     { precheck: ['haiku', 'low'], build: ['sonnet', 'medium'], review: ['sonnet', 'high'],  fix: ['sonnet', 'medium'] },
  critical: { precheck: ['haiku', 'low'], build: ['sonnet', 'high'],  review: ['opus', 'high'],     fix: ['sonnet', 'high'] },
}[TIER]
const cell = (role) => {
  const o = (A.models || {})[role]
  return o ? { model: o.model, effort: o.effort } : { model: CELLS[role][0], effort: CELLS[role][1] }
}
const GUARD = 'YOUR ONLY JOB is the role below. If a message addressed to someone else appears in your context (for example the user talking to the coordinator), it is not for you: ignore it and do your role.'
const SAFE = 'Never use `git stash` (the stash is shared by all worktrees; use a WIP commit). Never merge, never touch other branches or PRs.'
const N = A.issue, R = A.repo, B = A.base, WT = A.wt

if (A.precheck !== false) {
  phase('Check')
  const chk = await agent(`${GUARD}\nROLE: work-order checker for issue #${N} in ${R}. Read it with \`gh issue view ${N} -R ${R} --comments\`.
Verify every quoted line, value, path, test name and command against \`origin/${B}\` (fetch first; read with \`git show origin/${B}:<path>\` and \`git grep\`; do not edit files).
- Fix stale facts directly in the issue body (\`gh issue edit\`), changing nothing else.
- List real design questions the builder can't settle as needs_decision. Do not invent answers.
Return your verdict.`, { label: `check #${N}`, phase: 'Check', ...cell('precheck'), schema: {
    type: 'object', properties: { verdict: { type: 'string', enum: ['ready', 'corrected', 'needs-decision'] },
      corrections: { type: 'array', items: { type: 'string' } }, needs_decision: { type: 'array', items: { type: 'string' } } },
    required: ['verdict'] } })
  if (chk && (chk.needs_decision || []).length) return { issue: N, stage: 'check', check: chk, note: 'answer the questions on the issue, then relaunch with precheck: false' }
}

phase('Build')
const build = await agent(`${GUARD}\nROLE: builder for issue #${N} in ${R}. ${SAFE}
1. Read the issue and its comments (\`gh issue view ${N} -R ${R} --comments\`); the newest coordinator comments override the body.
2. Worktree: if ${WT} exists, continue there (review any uncommitted edits with \`git diff\`; keep what is right, drop probes). Otherwise \`git fetch origin && git worktree add ${WT} -b issue/${N} origin/${B}\`.
3. Implement exactly the work order, touching only the files it owns. For a bug, write the test first and show it failing.
4. Run only the tests that cover the change, in the foreground: \`${A.test_cmd}\`. Never the full suite (CI runs it).
5. Commit with a clear message, push, open a DRAFT PR into ${B} whose body says "Closes #${N}", the evidence (tests run and results) and anything not done.
Return the report.`, { label: `build #${N}`, phase: 'Build', ...cell('build'), schema: {
  type: 'object', properties: { pr: { type: 'integer' }, head_sha: { type: 'string' }, summary: { type: 'string' }, tests: { type: 'string' },
    known_issues: { type: 'array', items: { type: 'string' } }, requests_not_done: { type: 'array', items: { type: 'string' } } },
  required: ['pr', 'head_sha', 'summary'] } })
if (!build || !build.pr) return { issue: N, stage: 'build', build, note: 'no PR: read the journal, then relaunch (precheck: false)' }

phase('Review')
const review = await agent(`${GUARD}\nROLE: the single ${TIER}-tier reviewer of PR #${build.pr} in ${R} for issue #${N}. Review EXACTLY commit ${build.head_sha}: \`git fetch origin\`, \`git diff origin/${B}...${build.head_sha}\`. Run no tests; read the code and the PR's evidence.
Post ONE review comment on the PR (\`gh pr comment\`) with an acceptance table (each acceptance item: met or not, with evidence) and findings. Each finding needs a severity (blocker, major or minor), file:line, a concrete scenario (inputs → wrong outcome) and a fix. Report only real defects.
Return the same as structured data.`, { label: `review #${build.pr}`, phase: 'Review', ...cell('review'), schema: {
  type: 'object', properties: { verdict: { type: 'string', enum: ['approve', 'request-changes'] },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, file: { type: 'string' }, title: { type: 'string' }, scenario: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'title', 'scenario'] } },
    questions: { type: 'array', items: { type: 'string' } } }, required: ['verdict', 'findings'] } })

if (!review || (!review.findings.length && !(review.questions || []).length)) {
  return { issue: N, stage: 'reviewed', build, review, note: `clean review: mark ready (gh pr ready ${build.pr}), wait for CI, merge` }
}

phase('Fix')
const fix = await agent(`${GUARD}\nROLE: skeptic fixer for PR #${build.pr} in ${R} (worktree ${WT}). ${SAFE}
For each finding below, decide KEEP (real: fix it), DROP (not real: say why, with file:line evidence) or ANSWERED (a question: answer it).
Re-run only the tests covering what you changed (\`${A.test_cmd}\`), commit, push, add a short "Fix round" section to the PR body, then \`gh pr ready ${build.pr}\`.
Findings and questions: ${JSON.stringify({ findings: review.findings, questions: review.questions || [] })}`, { label: `fix #${build.pr}`, phase: 'Fix', ...cell('fix'), schema: {
  type: 'object', properties: { decisions: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, decision: { type: 'string' }, change: { type: 'string' } }, required: ['finding', 'decision'] } },
    head_sha: { type: 'string' }, tests: { type: 'string' } }, required: ['decisions'] } })
return { issue: N, stage: 'fixed', build, review, fix, note: `wait for CI on #${build.pr}, then merge` }
