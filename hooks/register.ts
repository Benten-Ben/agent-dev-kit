import type { Register } from 'claude-code'

// The message that opens a turn is relayed to every agent of a Workflow launched in that turn, and
// the agents answer it instead of doing their job (efficient-agent-dev skill, references/gotchas.md).
// Only turns the session started itself are safe to launch from: a background task's notification,
// a scheduled trigger, an auto-continuation. Anything a person or another session sent is not.
const SELF_STARTED = new Set(['task-notification', 'scheduled-trigger', 'auto-continuation'])

const DENY =
  'agent-launch-guard: this turn began with a message from a person or another session, and a Workflow ' +
  'launched in it relays that message to every one of its agents (they tend to answer it instead of working). ' +
  'Reply first, then start `sleep 15; echo trigger` with run_in_background, and launch the Workflow from the ' +
  'turn its completion notification starts.'

const NO_MODEL_AGENT =
  'agent-launch-guard: this Agent call set no `model`, so it runs on the session\'s model and effort. ' +
  'Set `model` (and `effort`) explicitly: Haiku or Sonnet for most helpers (efficient-agent-dev skill).'

const noModelWorkflow = (missing: number) =>
  `agent-launch-guard: ${missing} agent() call(s) in this Workflow script look like they set no \`model\`; ` +
  'an agent without one inherits the session\'s model and effort. Pass `model` and `effort` on every agent() call.'

// agent( calls that carry no `model:` inside their parentheses' options, roughly: count calls and model keys.
const missingModels = (script: string): number => {
  const calls = (script.match(/\bagent\s*\(/g) ?? []).length
  const models = (script.match(/\bmodel\s*:/g) ?? []).length
  return Math.max(0, calls - models)
}

export const register: Register = on => {
  let mainTurn: string | undefined // the main loop's current turn id
  let blocked = false // the current main-loop turn holds a message from someone else

  on('prompt.submit', ($, e, next) => {
    if (!SELF_STARTED.has(e.origin.kind)) blocked = true
    return next(e)
  }).catch(($, e, next) => next(e)) // a guard bug must never block work: fail open

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) mainTurn = e.turnId
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.turnId === mainTurn) {
      blocked = false
      mainTurn = undefined
    }
    return next(e)
  })

  on('tool.call', { tool: 'Workflow' }, async ($, e, next) => {
    if (e.agentId === undefined && blocked) return { deny: DENY }
    const ran = await next(e)
    const missing = typeof e.script === 'string' ? missingModels(e.script) : 0
    return ran.deny === undefined && missing > 0
      ? { ...ran, context: [...(ran.context ?? []), noModelWorkflow(missing)] }
      : ran
  }).catch(($, e, next) => next(e)) // a guard bug must never block work: fail open

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const ran = await next(e)
    return ran.deny === undefined && e.model === undefined
      ? { ...ran, context: [...(ran.context ?? []), NO_MODEL_AGENT] }
      : ran
  }).catch(($, e, next) => next(e)) // a guard bug must never block work: fail open
}
