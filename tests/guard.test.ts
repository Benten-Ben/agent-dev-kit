import { describe, expect, test } from 'claude-code/testing'

// Beneath the plugin: answer each event the way the session would, so the plugin's hooks run in a chain.
const world = (on: any) => {
  on('prompt.submit', ($: any, e: any) => ({ text: e.text, origin: e.origin }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', ($: any, e: any) => ({ text: '' }))
  on('tool.call', ($: any, e: any) => ({ result: { ok: true } }))
}

const WF = { tool: 'Workflow', script: "export const meta = { name: 'x', description: 'y' }\nawait agent('do it', { model: 'haiku', effort: 'low' })" }

describe('Workflow launches', () => {
  test('are refused in a turn that began with a typed message', async ($, on) => {
    world(on)
    await $.prompt.submit({ text: 'is the box free?', origin: { kind: 'composer' } } as any)
    await $.turn.start({ text: 'is the box free?', turnId: 't1' })
    const r = await $.tool.call(WF as any)
    expect((r as any).deny ?? (r as any).text).toMatch(/agent-launch-guard: this turn began/)
  })

  test('are refused after a message from another session', async ($, on) => {
    world(on)
    await $.prompt.submit({ text: 'report', origin: { kind: 'peer-send-message' } } as any)
    await $.turn.start({ text: 'report', turnId: 't1' })
    const r = await $.tool.call(WF as any)
    expect((r as any).deny ?? (r as any).text).toMatch(/agent-launch-guard/)
  })

  test('run in a turn a task notification started', async ($, on) => {
    world(on)
    await $.prompt.submit({ text: '<task-notification>', origin: { kind: 'task-notification' } } as any)
    await $.turn.start({ text: '<task-notification>', turnId: 't2' })
    const r = await $.tool.call(WF as any)
    expect((r as any).deny).toBeUndefined()
    expect((r as any).result).toEqual({ ok: true })
  })

  test('run again once the typed turn has completed', async ($, on) => {
    world(on)
    await $.prompt.submit({ text: 'hi', origin: { kind: 'composer' } } as any)
    await $.turn.start({ text: 'hi', turnId: 't1' })
    await $.turn.complete({ turnId: 't1', answer: 'hello', durationMs: 5, isAborted: false, reason: 'answer' } as any)
    await $.turn.start({ text: '', turnId: 't2' })
    const r = await $.tool.call(WF as any)
    expect((r as any).deny).toBeUndefined()
  })

  test("a subagent's turn ending does not lift the block", async ($, on) => {
    world(on)
    await $.prompt.submit({ text: 'hi', origin: { kind: 'composer' } } as any)
    await $.turn.start({ text: 'hi', turnId: 'main' })
    await $.turn.start({ text: 'sub', turnId: 'sub1', agentId: 'a1' })
    await $.turn.complete({ turnId: 'sub1', answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as any)
    const r = await $.tool.call(WF as any)
    expect((r as any).deny ?? (r as any).text).toMatch(/agent-launch-guard/)
  })

  test("a subagent's own Workflow call is not refused", async ($, on) => {
    world(on)
    await $.prompt.submit({ text: 'hi', origin: { kind: 'composer' } } as any)
    await $.turn.start({ text: 'hi', turnId: 'main' })
    const r = await $.tool.call({ ...WF, agentId: 'a1' } as any)
    expect((r as any).deny).toBeUndefined()
  })
})

describe('model warnings', () => {
  test('an Agent call without a model gets a reminder', async ($, on) => {
    world(on)
    const r = await $.tool.call({ tool: 'Agent', description: 'd', prompt: 'p' } as any)
    expect(((r as any).context ?? []).join(' ')).toMatch(/set no `model`/)
  })

  test('an Agent call with a model gets none', async ($, on) => {
    world(on)
    const r = await $.tool.call({ tool: 'Agent', description: 'd', prompt: 'p', model: 'haiku' } as any)
    expect((r as any).context ?? []).toEqual([])
  })

  test('a Workflow script with an agent() call lacking a model gets a reminder', async ($, on) => {
    world(on)
    const r = await $.tool.call({ tool: 'Workflow', script: "export const meta = { name: 'x', description: 'y' }\nawait agent('a')\nawait agent('b', { model: 'haiku' })" } as any)
    expect(((r as any).context ?? []).join(' ')).toMatch(/1 agent\(\) call/)
  })
})
