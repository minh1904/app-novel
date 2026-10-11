import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAgentStore } from './agentStore'

describe('useAgentStore (Task 6.1)', () => {
  beforeEach(() => {
    useAgentStore.getState().reset()
  })

  afterEach(() => {
    useAgentStore.getState().reset()
  })

  it('keeps active agent session and turns when user switches between Work A and Work B', async () => {
    const store = useAgentStore.getState()
    const sessionId = await store.createSession('Phiên dịch chung')

    expect(useAgentStore.getState().sessions.length).toBe(1)
    expect(useAgentStore.getState().activeSessionId).toBe(sessionId)

    // Simulate user in Work A
    store.adapter.setActiveContextGetter(() => ({ workId: 'work-A', chapterId: 'ch-1' }))
    expect(store.adapter.captureContext()).toEqual({ workId: 'work-A', chapterId: 'ch-1' })

    // Simulate adding turn to session
    store.handleStreamEvent({
      requestId: 'r1',
      turnId: 'turn-1',
      eventSeq: 1,
      kind: 'done',
      turnState: 'completed',
      usage: null
    })
    expect(useAgentStore.getState().turns.length).toBe(1)

    // User switches to Work B: session and turns remain preserved!
    store.adapter.setActiveContextGetter(() => ({ workId: 'work-B', chapterId: 'ch-2' }))
    expect(store.adapter.captureContext()).toEqual({ workId: 'work-B', chapterId: 'ch-2' })
    expect(useAgentStore.getState().activeSessionId).toBe(sessionId)
    expect(useAgentStore.getState().turns.length).toBe(1)
  })

  it('HomeScreen sends capture empty context without crashing', async () => {
    const store = useAgentStore.getState()
    await store.createSession('HomeScreen Session')

    // On HomeScreen, adapter returns null / {}
    store.adapter.setActiveContextGetter(() => null)
    expect(store.adapter.captureContext()).toEqual({})

    // Send without electron bridge executes gracefully
    await store.send('Chào trợ lý')
    expect(useAgentStore.getState().isStreaming).toBe(true)
  })

  it('handles stream events: reasoning, answer, activities, operations, and terminal done', () => {
    const store = useAgentStore.getState()

    // 1. Activity start
    store.handleStreamEvent({
      requestId: 'r1',
      turnId: 'turn-1',
      eventSeq: 1,
      kind: 'activity-start',
      activityId: 'act-1',
      stepSeq: 1,
      activity: {
        id: 'act-1',
        turnId: 'turn-1',
        operationId: null,
        stepSeq: 1,
        kind: 'read',
        state: 'running',
        label: 'Đọc dữ liệu',
        detail: null,
        createdAt: 1000,
        updatedAt: 1000
      }
    })

    expect(useAgentStore.getState().activities['turn-1']).toHaveLength(1)
    expect(useAgentStore.getState().activities['turn-1']![0].label).toBe('Đọc dữ liệu')

    // 2. Operation snapshot
    store.handleStreamEvent({
      requestId: 'r1',
      turnId: 'turn-1',
      eventSeq: 2,
      kind: 'operation',
      operation: {
        id: 'op-1',
        turnId: 'turn-1',
        commandId: 'cmd-1',
        capability: 'translate_chapter',
        target: { kind: 'chapter', workId: 'w1', chapterId: 'c1' },
        state: 'running',
        model: undefined,
        progress: { completed: 1, total: 5, unit: 'segments' },
        result: null,
        error: null,
        hasChanges: true,
        createdAt: 1000,
        updatedAt: 1000
      }
    })

    expect(useAgentStore.getState().operations['op-1']).toBeDefined()
    expect(useAgentStore.getState().operations['op-1']!.state).toBe('running')

    // 3. Done event commits turn and finishes streaming
    store.handleStreamEvent({
      requestId: 'r1',
      turnId: 'turn-1',
      eventSeq: 3,
      kind: 'done',
      turnState: 'completed',
      usage: null
    })

    expect(useAgentStore.getState().isStreaming).toBe(false)
    expect(useAgentStore.getState().turns).toHaveLength(1)
    expect(useAgentStore.getState().turns[0].status).toBe('completed')
  })
})
