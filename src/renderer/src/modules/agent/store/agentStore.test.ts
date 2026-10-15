import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AgentActivity,
  AgentOperation,
  AgentSessionDetailView,
  AgentStreamEvent,
  AgentTurnView
} from '../../../../../shared/contracts/agent'
import { resetAllStores } from '../../../lib/testing/resetStores'
import { NEW_CHAT, useAgentStore } from './agentStore'

const session = { id: 's1', title: 'Phiên', createdAt: 1, updatedAt: 1 }
const turn = (patch: Partial<AgentTurnView> = {}): AgentTurnView => ({
  id: 't1',
  sessionId: 's1',
  instruction: 'dịch chương này',
  answer: '',
  reasoning: '',
  context: {},
  status: 'running',
  usage: null,
  costUsd: null,
  legacyRef: null,
  createdAt: 10,
  updatedAt: 10,
  ...patch
})
const operation = (patch: Partial<AgentOperation> = {}): AgentOperation => ({
  id: 'op1',
  turnId: 't1',
  taskItemId: null,
  commandId: 'c',
  capability: 'translate_chapter',
  target: { kind: 'chapter', workId: 'w', workLabel: 'W', chapterId: 'c', chapterLabel: 'C' },
  state: 'running',
  progress: null,
  model: null,
  usage: null,
  result: null,
  error: null,
  createdAt: 11,
  updatedAt: 11,
  ...patch
})
const activity = (patch: Partial<AgentActivity> = {}): AgentActivity => ({
  id: 'a1',
  turnId: 't1',
  operationId: null,
  stepSeq: 1,
  kind: 'read',
  state: 'running',
  label: 'Đọc',
  detail: null,
  createdAt: 11,
  updatedAt: 11,
  ...patch
})
const detail = (patch: Partial<AgentSessionDetailView> = {}): AgentSessionDetailView => ({
  session,
  turns: [],
  activities: [],
  operations: [],
  pending: [],
  ...patch
})
const event = (patch: Record<string, unknown>): AgentStreamEvent =>
  ({ requestId: 'r', turnId: 't1', eventSeq: 1, ...patch }) as AgentStreamEvent

function bridge(get: () => Promise<{ ok: true; value: AgentSessionDetailView }>) {
  const api = {
    sessions: {
      get: vi.fn(get),
      list: vi.fn(async () => ({ ok: true, value: { sessions: [session] } })),
      create: vi.fn()
    },
    turn: {
      send: vi.fn(async () => ({
        ok: true,
        value: { requestId: 'r', turnId: 't1', sessionId: 's1' }
      })),
      cancel: vi.fn()
    }
  }
  ;(globalThis as unknown as { window: unknown }).window = { mira: { agent: api } }
  return api
}

const model = { connectionId: 'c1', entryId: 'e1' }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('agentStore', () => {
  beforeEach(() => resetAllStores())
  afterEach(() => {
    ;(globalThis as unknown as { window?: unknown }).window = undefined
  })

  it('reads the snapshot back after a missed event and shows what the DB committed', async () => {
    let snapshot = detail({ turns: [turn()] })
    const api = bridge(async () => ({ ok: true, value: snapshot }))
    await useAgentStore.getState().selectSession('s1')
    expect(useAgentStore.getState().isStreaming).toBe(true)

    // The operation event was missed; the turn finished in Main.
    snapshot = detail({
      turns: [turn({ status: 'completed', answer: 'Đã dịch.', updatedAt: 20 })],
      operations: [operation({ state: 'completed', updatedAt: 19 })]
    })
    useAgentStore.getState().handleStreamEvent(event({ kind: 'answer-delta', text: 'Đã d' }))
    useAgentStore
      .getState()
      .handleStreamEvent(event({ eventSeq: 3, kind: 'done', turnState: 'completed', usage: null }))
    await flush()
    const state = useAgentStore.getState()
    expect(state.turns[0]).toMatchObject({ status: 'completed', answer: 'Đã dịch.' })
    expect(state.operations.op1.state).toBe('completed')
    expect(state.isStreaming).toBe(false)
    expect(api.sessions.get).toHaveBeenCalledTimes(2)
  })

  it('keeps an event that arrives while the snapshot is being read', async () => {
    let release: (value: { ok: true; value: AgentSessionDetailView }) => void = () => {}
    bridge(() => new Promise((resolve) => (release = resolve)))
    useAgentStore.setState({ activeSessionId: 's1', turns: [turn()] })
    const hydrating = useAgentStore.getState().refresh()
    // Newer activity arrives before the (older) snapshot lands.
    useAgentStore.getState().handleStreamEvent(
      event({
        kind: 'activity-finish',
        activityId: 'a1',
        stepSeq: 1,
        activity: activity({ state: 'completed', updatedAt: 30 })
      })
    )
    release({ ok: true, value: detail({ turns: [turn()], activities: [activity()] }) })
    await hydrating
    expect(useAgentStore.getState().activities.t1).toEqual([
      expect.objectContaining({ id: 'a1', state: 'completed', updatedAt: 30 })
    ])
  })

  it('reads an unknown turn back once, as a turn sent from another window', async () => {
    const api = bridge(async () => ({ ok: true, value: detail({ turns: [turn({ id: 't2' })] }) }))
    useAgentStore.setState({ activeSessionId: 's1' })
    useAgentStore
      .getState()
      .handleStreamEvent(event({ turnId: 't2', kind: 'answer-delta', text: 'x' }))
    useAgentStore
      .getState()
      .handleStreamEvent(event({ turnId: 't2', kind: 'answer-delta', text: 'y' }))
    await flush()
    expect(api.sessions.get).toHaveBeenCalledTimes(1)
    expect(useAgentStore.getState().turns.map((t) => t.id)).toEqual(['t2'])
    expect(useAgentStore.getState().streamingTurnId).toBe('t2')
  })

  it('keeps drafts per session and only clears the one that was sent', async () => {
    const api = bridge(async () => ({ ok: true, value: detail({ turns: [turn()] }) }))
    const store = useAgentStore.getState()
    store.setDraft('chưa có phiên')
    await store.selectSession('s1')
    useAgentStore.setState({ isStreaming: false, streamingTurnId: null })
    useAgentStore.getState().setDraft('nháp phiên 1')
    expect(useAgentStore.getState().drafts).toEqual({
      [NEW_CHAT]: 'chưa có phiên',
      s1: 'nháp phiên 1'
    })

    api.turn.send.mockResolvedValueOnce({
      ok: false,
      error: { code: 'conflict', message: 'Phiên đang bận.' }
    } as never)
    expect(await useAgentStore.getState().send('nháp phiên 1')).toBe(false)
    expect(useAgentStore.getState().drafts.s1).toBe('nháp phiên 1')
    expect(useAgentStore.getState().lastError).toBe('Phiên đang bận.')

    expect(await useAgentStore.getState().send('nháp phiên 1')).toBe(true)
    expect(useAgentStore.getState().drafts).toEqual({ [NEW_CHAT]: 'chưa có phiên' })
  })

  it('sends the model chosen in the composer, and none when the composer has none', async () => {
    const api = bridge(async () => ({ ok: true, value: detail({ turns: [turn()] }) }))
    await useAgentStore.getState().selectSession('s1')
    useAgentStore.setState({ isStreaming: false, streamingTurnId: null })
    await useAgentStore.getState().send('dịch', { modelSelection: model })
    useAgentStore.setState({ isStreaming: false, streamingTurnId: null })
    await useAgentStore.getState().send('dịch tiếp')
    expect(api.turn.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ modelSelection: model })
    )
    expect(api.turn.send).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ modelSelection: expect.anything() })
    )
  })

  it('answers a pending action bound to its call and digest', async () => {
    const pending = {
      turnId: 't1',
      toolCallId: 'call',
      argsDigest: 'sha256:x',
      name: 'resolve_target',
      kind: 'choose' as const,
      label: 'Chọn đích',
      candidates: [{ handle: 't2', label: 'B' }],
      createdAt: 1
    }
    const api = bridge(async () => ({
      ok: true,
      value: detail({ turns: [turn({ status: 'waiting_user' })], pending: [pending] })
    }))
    await useAgentStore.getState().selectSession('s1')
    expect(useAgentStore.getState().pending).toHaveLength(1)
    await useAgentStore.getState().reply(pending, 't2', 'B', model)
    expect(api.turn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        modelSelection: model,
        continuesTurnId: 't1',
        pendingReply: { toolCallId: 'call', argsDigest: 'sha256:x', choice: 't2' },
        instruction: 'B'
      })
    )
  })
})
