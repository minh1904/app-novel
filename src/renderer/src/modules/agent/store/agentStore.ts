import { create } from 'zustand'
import type {
  AgentActivity,
  AgentContext,
  AgentOperation,
  AgentSessionView,
  AgentStreamEvent,
  AgentTurnView
} from '../../../../../shared/contracts/agent'
import { registerStoreReset } from '../../../lib/testing/resetStores'
import {
  defaultWorkspaceAgentAdapter,
  type WorkspaceAgentAdapter,
  type TargetRef
} from '../adapter/workspaceAdapter'
import { DeltaBuffer } from '../components/DeltaBuffer'

export interface AgentState {
  sessions: AgentSessionView[]
  activeSessionId: string | null
  turns: AgentTurnView[]
  activities: Record<string, AgentActivity[]>
  operations: Record<string, AgentOperation>
  streamingTurnId: string | null
  streamingAnswer: string
  streamingReasoning: string
  isStreaming: boolean
  adapter: WorkspaceAgentAdapter

  // Actions
  loadSessions: () => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  createSession: (title?: string) => Promise<string>
  send: (instruction: string) => Promise<void>
  cancel: (turnId?: string) => Promise<void>
  undo: (operationId: string) => Promise<void>
  handleStreamEvent: (event: AgentStreamEvent) => void
  listenCoordinator: () => () => void
  reset: () => void
}

let answerBuffer: DeltaBuffer | null = null
let reasoningBuffer: DeltaBuffer | null = null

export const useAgentStore = create<AgentState>((set, get) => {
  const resetBuffers = () => {
    answerBuffer?.reset()
    reasoningBuffer?.reset()
    answerBuffer = null
    reasoningBuffer = null
  }

  return {
    sessions: [],
    activeSessionId: null,
    turns: [],
    activities: {},
    operations: {},
    streamingTurnId: null,
    streamingAnswer: '',
    streamingReasoning: '',
    isStreaming: false,
    adapter: defaultWorkspaceAgentAdapter,

    loadSessions: async () => {
      if (typeof window === 'undefined' || !window.mira?.agent?.sessions?.list) return
      const res = await window.mira.agent.sessions.list()
      if (res.ok) {
        set({ sessions: res.value.sessions })
        const currentActive = get().activeSessionId
        if (!currentActive && res.value.sessions.length > 0) {
          await get().selectSession(res.value.sessions[0]!.id)
        }
      }
    },

    selectSession: async (sessionId: string) => {
      set({ activeSessionId: sessionId })
      if (typeof window === 'undefined' || !window.mira?.agent?.sessions?.get) return
      const res = await window.mira.agent.sessions.get(sessionId)
      if (res.ok) {
        set({
          turns: res.value.turns,
          streamingTurnId: null,
          streamingAnswer: '',
          streamingReasoning: '',
          isStreaming: false
        })
      }
    },

    createSession: async (title?: string) => {
      if (typeof window === 'undefined' || !window.mira?.agent?.sessions?.create) {
        const id = `mock-session-${Date.now()}`
        set((s) => ({
          sessions: [
            { id, title: title ?? 'Phiên mới', createdAt: Date.now(), updatedAt: Date.now() },
            ...s.sessions
          ],
          activeSessionId: id,
          turns: []
        }))
        return id
      }
      const res = await window.mira.agent.sessions.create(title)
      if (res.ok) {
        const newSession = res.value
        set((s) => ({
          sessions: [newSession, ...s.sessions],
          activeSessionId: newSession.id,
          turns: []
        }))
        return newSession.id
      }
      throw new Error(res.error.message)
    },

    send: async (instruction: string) => {
      const state = get()
      if (state.isStreaming) return

      let sessionId = state.activeSessionId
      if (!sessionId) {
        sessionId = await state.createSession(instruction.slice(0, 30))
      }

      // Capture context strictly via adapter (empty outside workspace)
      const context: AgentContext = state.adapter.captureContext()

      resetBuffers()
      answerBuffer = new DeltaBuffer({
        intervalMs: 40,
        onCommit: (text) => set({ streamingAnswer: text })
      })
      reasoningBuffer = new DeltaBuffer({
        intervalMs: 40,
        onCommit: (text) => set({ streamingReasoning: text })
      })

      set({
        isStreaming: true,
        streamingAnswer: '',
        streamingReasoning: ''
      })

      if (typeof window === 'undefined' || !window.mira?.agent?.turn?.send) {
        // Fallback for isolated unit tests without electron bridge
        const mockTurnId = `mock-turn-${Date.now()}`
        set({ streamingTurnId: mockTurnId })
        return
      }

      const res = await window.mira.agent.turn.send({
        sessionId,
        clientCommandId: crypto.randomUUID(),
        instruction,
        context
      })

      if (res.ok && get().isStreaming) {
        set({ streamingTurnId: res.value.turnId })
      } else {
        resetBuffers()
        set({ isStreaming: false, streamingTurnId: null })
      }
    },

    cancel: async (turnId?: string) => {
      const targetId = turnId ?? get().streamingTurnId
      if (!targetId) return

      if (typeof window !== 'undefined' && window.mira?.agent?.turn?.cancel) {
        await window.mira.agent.turn.cancel({ turnId: targetId })
      }
      resetBuffers()
      set({ isStreaming: false, streamingTurnId: null })
    },

    undo: async (operationId: string) => {
      if (typeof window === 'undefined' || !window.mira?.agent?.operations?.undo) return
      const res = await window.mira.agent.operations.undo({ operationId })
      if (res.ok) {
        set((s) => {
          const op = s.operations[operationId]
          if (!op) return s
          return {
            operations: {
              ...s.operations,
              [operationId]: { ...op, state: 'undone' }
            }
          }
        })
      }
    },

    handleStreamEvent: (event: AgentStreamEvent) => {
      const state = get()
      if (state.streamingTurnId && event.turnId !== state.streamingTurnId) {
        return
      }

      switch (event.kind) {
        case 'reasoning-delta':
          reasoningBuffer?.append(event.text)
          break

        case 'answer-delta':
          answerBuffer?.append(event.text)
          break

        case 'activity-start':
        case 'activity-update':
        case 'activity-finish': {
          const act = event.activity as AgentActivity
          set((s) => {
            const list = s.activities[event.turnId] ?? []
            const existingIdx = list.findIndex((a) => a.id === act.id)
            const nextList =
              existingIdx >= 0
                ? [...list.slice(0, existingIdx), act, ...list.slice(existingIdx + 1)]
                : [...list, act]
            return {
              activities: { ...s.activities, [event.turnId]: nextList }
            }
          })
          break
        }

        case 'operation': {
          const op = event.operation as AgentOperation
          set((s) => ({
            operations: { ...s.operations, [op.id]: op }
          }))
          break
        }

        case 'done': {
          answerBuffer?.flush()
          reasoningBuffer?.flush()
          const finalAns = answerBuffer?.committed ?? state.streamingAnswer
          const finalReason = reasoningBuffer?.committed ?? state.streamingReasoning

          set((s) => {
            const newTurn: AgentTurnView = {
              id: event.turnId,
              sessionId: s.activeSessionId ?? '',
              instruction: '',
              answer: finalAns,
              reasoning: finalReason,
              status: event.turnState,
              context: {},
              usage: (event.usage as any) ?? null,
              costUsd: null,
              legacyRef: null,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            return {
              turns: [...s.turns, newTurn],
              isStreaming: false,
              streamingTurnId: null,
              streamingAnswer: '',
              streamingReasoning: ''
            }
          })
          resetBuffers()
          break
        }

        case 'error': {
          answerBuffer?.flush()
          reasoningBuffer?.flush()
          set(() => ({
            isStreaming: false,
            streamingTurnId: null,
            streamingAnswer: '',
            streamingReasoning: ''
          }))
          resetBuffers()
          break
        }

        case 'cancelled': {
          answerBuffer?.flush()
          reasoningBuffer?.flush()
          set(() => ({
            isStreaming: false,
            streamingTurnId: null,
            streamingAnswer: '',
            streamingReasoning: ''
          }))
          resetBuffers()
          break
        }
      }
    },

    listenCoordinator: () => {
      if (typeof window === 'undefined' || !window.mira?.agent?.coordinator) {
        return () => {}
      }

      const unbindIntent = window.mira.agent.coordinator.onWriteIntent(async (intent) => {
        const adapter = get().adapter
        const target: TargetRef = {
          workId: intent.target.workId,
          chapterId: intent.target.chapterId,
          side: intent.target.side
        }

        if (!adapter.hasEditor(target)) {
          await window.mira.agent.coordinator.ackWriteIntent({
            intentId: intent.intentId,
            status: 'not-open'
          })
          return
        }

        // Flush dirty target before ack
        const flushRes = await adapter.flushDirty(target)
        if (flushRes.ok) adapter.setLocked(target, true)

        // Send acknowledgement to main coordinator
        await window.mira.agent.coordinator.ackWriteIntent({
          intentId: intent.intentId,
          status: flushRes.ok ? 'ack' : 'flush-failed',
          revision: flushRes.revision
        })
      })

      const unbindChanged = window.mira.agent.coordinator.onTargetChanged(async (ev) => {
        const adapter = get().adapter
        const target: TargetRef = {
          workId: ev.target.workId,
          chapterId: ev.target.chapterId,
          side: ev.target.side
        }
        // Reload once at terminal revision and unlock
        await adapter.reloadTarget(target, ev.lastAppliedRev)
        adapter.setLocked(target, false)
      })

      const unbindStream = window.mira.agent.onStreamEvent?.((ev) => {
        get().handleStreamEvent(ev)
      })

      return () => {
        unbindIntent?.()
        unbindChanged?.()
        unbindStream?.()
      }
    },

    reset: () => {
      resetBuffers()
      set({
        sessions: [],
        activeSessionId: null,
        turns: [],
        activities: {},
        operations: {},
        streamingTurnId: null,
        streamingAnswer: '',
        streamingReasoning: '',
        isStreaming: false
      })
    }
  }
})

registerStoreReset(() => useAgentStore.getState().reset())
