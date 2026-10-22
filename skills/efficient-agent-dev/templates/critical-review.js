export const meta = {
  name: 'critical-review',
  description: 'Whole-PR critical review: 3-4 Opus lenses over the full diff, then one skeptic who tries to refute every finding.',
  phases: [{ title: 'Review', detail: 'independent lenses' }, { title: 'Skeptic', detail: 'refute each finding' }],
}
// Generic template from the efficient-agent-dev skill. args: repo, pr, base, head (sha), wt (a checkout to read from),
// context (one paragraph: what the PR does and what must stay true), lenses (optional [[key, text], ...]).
const A = (typeof args === 'object' && args) || {}
for (const k of ['repo', 'pr', 'base', 'head', 'wt']) if (!A[k]) throw new Error(`critical-review: args.${k} is required`)
const LENSES = A.lenses || [
  ['untrusted-input', 'LENS: untrusted input and file or network handling: parsing, allow-lists, injection, symlinks/TOCTOU, what can reach a shell, a query or another host.'],
  ['flow', 'LENS: flow correctness. Trace every command and failure path; refusals must happen before anything changes; old and new versions must interoperate (an older reader of the new data must fail safe, not proceed).'],
  ['semantics', 'LENS: semantics: every consumer reads each value the same way; empty vs unset vs default; units; ordering.'],
  ['tests', 'LENS: tests and hand-over: would each new test fail if the fix were removed? Any assertion that cannot fail? Is the operator or user hand-over complete and correct?'],
]
const FIND = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: {
  severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, file: { type: 'string' }, line: { type: 'integer' },
  title: { type: 'string' }, scenario: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'file', 'title', 'scenario', 'fix'] } } }, required: ['findings'] }
const VERD = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
  title: { type: 'string' }, real: { type: 'boolean' }, severity: { type: 'string' }, evidence: { type: 'string' } }, required: ['title', 'real', 'evidence'] } } }, required: ['verdicts'] }
const COMMON = `You are one reviewer in a CRITICAL whole-PR review of PR #${A.pr} in ${A.repo}. Review EXACTLY commit ${A.head}: \`git -C ${A.wt} fetch -q origin\`, then the WHOLE change \`git -C ${A.wt} diff origin/${A.base}...${A.head}\` and files via \`git -C ${A.wt} show ${A.head}:<path>\`. READ ONLY: never edit, commit, comment or approve.
${A.context || ''}
Report only real defects, each with a concrete scenario (inputs/state → wrong outcome). Return your findings (empty if none).`

phase('Review')
const results = await parallel(LENSES.map(([key, lens]) => () =>
  agent(`${COMMON}\n\n${lens}`, { label: `review:${key}`, phase: 'Review', schema: FIND, model: 'opus', effort: 'high' })
    .then(r => (r ? r.findings : []).map(f => ({ lens: key, ...f })))))
const all = results.filter(Boolean).flat()
log(`${all.length} findings from ${LENSES.length} lenses`)
if (!all.length) return { pr: A.pr, head: A.head, findings: [], verified: [] }

phase('Skeptic')
const sk = await agent(`${COMMON}\n\nYou are the SKEPTIC. Try to REFUTE each finding below against commit ${A.head}: read the actual code paths, and default to real=false when the scenario does not reproduce. For each, return real, a corrected severity and file:line evidence.\n\nFindings:\n${JSON.stringify(all, null, 1)}`,
  { label: 'skeptic', phase: 'Skeptic', schema: VERD, model: 'opus', effort: 'high' })
return { pr: A.pr, head: A.head, findings: all, verified: sk ? sk.verdicts : null }
