import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAllStores } from './resetStores'
import { useAiChatStore } from './aiChatStore'

describe('aiChatStore', () => {
  beforeEach(() => {
    resetAllStores()
    vi.restoreAllMocks()
    ;(globalThis as unknown as { window: unknown }).window = {
      mira: {
        ai: {
          chat: {
            onChunk: vi.fn().mockReturnValue(() => {}),
            cancel: vi.fn()
          }
        }
      }
    }
  })

  it('initializes with empty session', () => {
    const state = useAiChatStore.getState()
    expect(state.session.turns).toEqual([])
    expect(state.isListening).toBe(false)
  })

  it('begins turn and updates session', () => {
    const turn = useAiChatStore.getState().beginTurn({ question: 'Xin chào' })

    expect(turn.question).toBe('Xin chào')
    expect(useAiChatStore.getState().session.turns.length).toBe(1)
    expect(useAiChatStore.getState().session.turns[0].status).toBe('sending')
  })

  it('keeps each work session when switching chapters and tabs', () => {
    const store = useAiChatStore.getState()
    store.selectWork('work-a')
    store.setSessionId('session-a')
    store.beginTurn({ question: 'Hỏi' })
    store.selectWork('work-a')
    expect(useAiChatStore.getState()).toMatchObject({
      workId: 'work-a',
      sessionId: 'session-a'
    })
    expect(useAiChatStore.getState().session.turns).toHaveLength(1)
    store.selectWork('work-b')
    expect(useAiChatStore.getState()).toMatchObject({ workId: 'work-b', sessionId: null })
    expect(useAiChatStore.getState().session.turns).toEqual([])
    store.selectWork('work-a')
    expect(useAiChatStore.getState()).toMatchObject({ workId: 'work-a', sessionId: 'session-a' })
    expect(useAiChatStore.getState().session.turns).toHaveLength(1)
  })

  it('tells the proposal queue to reload when a writing tool made a proposal', () => {
    const events: string[] = []
    ;(window as unknown as { dispatchEvent: (event: Event) => void }).dispatchEvent = (event) =>
      events.push(event.type)
    const store = useAiChatStore.getState()
    const turn = store.beginTurn({ question: 'Sửa đoạn 3' })
    store.attachRequestId(turn.localId, 'req-p')
    store.receiveChunk({
      requestId: 'req-p',
      kind: 'proposal',
      proposal: {
        type: 'edit',
        proposalId: 'p',
        partIds: ['x'],
        chapterId: 'c',
        label: 'Sửa đoạn 3'
      }
    })
    expect(events).toEqual(['mira:proposals-changed'])
    expect(useAiChatStore.getState().session.turns[0].proposals).toHaveLength(1)
  })

  it('routes a late stream and send result back to their original work', () => {
    const store = useAiChatStore.getState()
    store.selectWork('work-a')
    const turn = store.beginTurn({ question: 'A' })
    store.selectWork('work-b')
    store.beginTurn({ question: 'B' })
    store.receiveChunk({ requestId: 'request-a', kind: 'delta', text: 'Bản A' })
    store.clearSession()
    store.attachRequestIdForWork('work-a', turn.localId, 'request-a')
    store.receiveChunk({
      requestId: 'request-a',
      kind: 'done',
      usage: null,
      usd: null,
      keyTail: null,
      finishReason: 'stop'
    })
    expect(useAiChatStore.getState().session.turns).toEqual([])
    store.selectWork('work-a')
    expect(useAiChatStore.getState().session.turns[0]).toMatchObject({
      question: 'A',
      answer: 'Bản A',
      status: 'done'
    })
  })

  it('attaches request id and receives chunks', () => {
    const turn = useAiChatStore.getState().beginTurn({ question: 'Dịch câu này' })

    useAiChatStore.getState().attachRequestId(turn.localId, 'req-123')
    expect(useAiChatStore.getState().session.turns[0].requestId).toBe('req-123')
    expect(useAiChatStore.getState().session.turns[0].status).toBe('sending')

    useAiChatStore.getState().receiveChunk({
      requestId: 'req-123',
      kind: 'delta',
      text: 'Bản dịch thử nghiệm'
    })
    expect(useAiChatStore.getState().session.turns[0].status).toBe('running')
    expect(useAiChatStore.getState().session.turns[0].answer).toBe('Bản dịch thử nghiệm')

    useAiChatStore.getState().receiveChunk({
      requestId: 'req-123',
      kind: 'done',
      usage: null,
      usd: null,
      keyTail: null,
      finishReason: 'stop'
    })
    expect(useAiChatStore.getState().session.turns[0].status).toBe('done')
  })

  it('replays chunks that arrive before the send IPC returns its request id', () => {
    const turn = useAiChatStore.getState().beginTurn({ question: 'Dịch' })
    useAiChatStore.getState().receiveChunk({ requestId: 'fast', kind: 'delta', text: 'Đã xong' })
    useAiChatStore.getState().receiveChunk({
      requestId: 'fast',
      kind: 'done',
      usage: null,
      usd: null,
      keyTail: null,
      finishReason: 'stop'
    })
    expect(useAiChatStore.getState().session.turns[0].status).toBe('sending')
    useAiChatStore.getState().attachRequestId(turn.localId, 'fast')
    expect(useAiChatStore.getState().session.turns[0]).toMatchObject({
      status: 'done',
      answer: 'Đã xong'
    })
  })

  it('starts listening to IPC onChunk and cleans up on unmount', () => {
    const unsubscribeMock = vi.fn()
    window.mira.ai.chat.onChunk = vi.fn().mockReturnValue(unsubscribeMock)

    const cleanup = useAiChatStore.getState().startListening()
    expect(window.mira.ai.chat.onChunk).toHaveBeenCalledTimes(1)
    expect(useAiChatStore.getState().isListening).toBe(true)

    cleanup()
    expect(unsubscribeMock).toHaveBeenCalledTimes(1)
    expect(useAiChatStore.getState().isListening).toBe(false)
  })
})
