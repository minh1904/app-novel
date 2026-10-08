import { create } from 'zustand'
import type { ChatChunk, ChatError, ChatLocation } from '../../../shared/contracts/aiChat'
import type { AiTurnView } from '../../../shared/contracts/aiHistory'
import {
  applyChunk,
  attachRequestId,
  beginTurn,
  emptySession,
  failTurn,
  restoredSession,
  type Session,
  type TurnView
} from '../features/chapter/chat/chatTurns'
import { registerStoreReset } from './resetStores'

export interface BeginTurnInput {
  localId?: string
  question: string
  chapterId?: string
  location?: ChatLocation
}

export interface AiChatState {
  workId: string | null
  sessionId: string | null
  session: Session
  isListening: boolean

  // Actions
  startListening(): () => void
  selectWork(workId: string): void
  setSessionId(sessionId: string | null): void
  setSessionIdForWork(workId: string, sessionId: string | null): void
  receiveChunk(chunk: ChatChunk): void
  beginTurn(input: BeginTurnInput): TurnView
  attachRequestId(localId: string, requestId: string): void
  attachRequestIdForWork(workId: string, localId: string, requestId: string): void
  failTurn(localId: string, error: ChatError): void
  failTurnForWork(workId: string, localId: string, error: ChatError): void
  setSession(session: Session | ((previous: Session) => Session)): void
  setSessionForWork(workId: string, update: (previous: Session) => Session): void
  restoreSession(views: AiTurnView[]): void
  clearSession(): void
  reset(): void
}

let unsubscribeChunk: (() => void) | null = null
const earlyChunks = new Map<string, ChatChunk[]>()
const otherWorkSessions = new Map<string, { sessionId: string | null; session: Session }>()

export const useAiChatStore = create<AiChatState>((set, get) => {
  const workSession = (workId: string): { sessionId: string | null; session: Session } => {
    const state = get()
    return state.workId === workId
      ? { sessionId: state.sessionId, session: state.session }
      : (otherWorkSessions.get(workId) ?? { sessionId: null, session: emptySession })
  }
  const updateWork = (
    workId: string,
    update: (current: { sessionId: string | null; session: Session }) => {
      sessionId: string | null
      session: Session
    }
  ): void => {
    const next = update(workSession(workId))
    if (get().workId === workId) set(next)
    else otherWorkSessions.set(workId, next)
  }
  const replay = (requestId: string): void => {
    const waiting = earlyChunks.get(requestId) ?? []
    earlyChunks.delete(requestId)
    for (const chunk of waiting) get().receiveChunk(chunk)
  }

  return {
    workId: null,
    sessionId: null,
    session: emptySession,
    isListening: false,

    selectWork: (workId) => {
      const current = get()
      if (current.workId === workId) return
      if (current.workId)
        otherWorkSessions.set(current.workId, {
          sessionId: current.sessionId,
          session: current.session
        })
      const selected = otherWorkSessions.get(workId) ?? { sessionId: null, session: emptySession }
      otherWorkSessions.delete(workId)
      set({ workId, ...selected })
    },
    setSessionId: (sessionId) => set({ sessionId }),
    setSessionIdForWork: (workId, sessionId) =>
      updateWork(workId, (current) => ({ ...current, sessionId })),

    startListening: () => {
      if (unsubscribeChunk || typeof window === 'undefined' || !window.mira?.ai?.chat?.onChunk) {
        return () => {
          if (unsubscribeChunk) {
            unsubscribeChunk()
          }
        }
      }
      set({ isListening: true })
      const cleanup = window.mira.ai.chat.onChunk((chunk) => {
        get().receiveChunk(chunk)
      })
      unsubscribeChunk = () => {
        cleanup()
        unsubscribeChunk = null
        set({ isListening: false })
      }
      return unsubscribeChunk
    },

    receiveChunk: (chunk: ChatChunk) => {
      const active = get()
      if (active.session.turns.some((turn) => turn.requestId === chunk.requestId)) {
        set({ session: applyChunk(active.session, chunk) })
      } else {
        const other = [...otherWorkSessions.entries()].find(([, value]) =>
          value.session.turns.some((turn) => turn.requestId === chunk.requestId)
        )
        if (other)
          otherWorkSessions.set(other[0], {
            ...other[1],
            session: applyChunk(other[1].session, chunk)
          })
        else {
          if (earlyChunks.size >= 100) earlyChunks.clear()
          earlyChunks.set(chunk.requestId, [...(earlyChunks.get(chunk.requestId) ?? []), chunk])
          return
        }
      }
      // A writing tool just made a proposal: the queue and the cards read it from main.
      if (chunk.kind === 'proposal' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mira:proposals-changed'))
      }
    },

    beginTurn: (input: BeginTurnInput) => {
      const localId = input.localId ?? crypto.randomUUID()
      const session = beginTurn(get().session, { ...input, localId })
      set({ session })
      return session.turns[session.turns.length - 1]!
    },

    attachRequestId: (localId: string, requestId: string) => {
      const workId = get().workId
      if (workId) get().attachRequestIdForWork(workId, localId, requestId)
      else {
        set((state) => ({ session: attachRequestId(state.session, localId, requestId) }))
        replay(requestId)
      }
    },
    attachRequestIdForWork: (workId, localId, requestId) => {
      updateWork(workId, (current) => ({
        ...current,
        session: attachRequestId(current.session, localId, requestId)
      }))
      replay(requestId)
    },

    failTurn: (localId: string, error: ChatError) => {
      set((state) => ({
        session: failTurn(state.session, localId, error)
      }))
    },
    failTurnForWork: (workId, localId, error) =>
      updateWork(workId, (current) => ({
        ...current,
        session: failTurn(current.session, localId, error)
      })),

    setSession: (sessionOrUpdater) => {
      set((state) => ({
        session:
          typeof sessionOrUpdater === 'function'
            ? sessionOrUpdater(state.session)
            : sessionOrUpdater
      }))
    },
    setSessionForWork: (workId, updater) =>
      updateWork(workId, (current) => ({
        ...current,
        session: updater(current.session)
      })),

    restoreSession: (views: AiTurnView[]) => {
      let session = restoredSession(views)
      for (const turn of session.turns) {
        if (!turn.requestId) continue
        const waiting = earlyChunks.get(turn.requestId) ?? []
        earlyChunks.delete(turn.requestId)
        for (const chunk of waiting) session = applyChunk(session, chunk)
      }
      set({ session })
    },

    clearSession: () => {
      set({ session: emptySession, sessionId: null })
    },

    reset: () => {
      earlyChunks.clear()
      otherWorkSessions.clear()
      if (unsubscribeChunk) {
        unsubscribeChunk()
      }
      set({ workId: null, sessionId: null, session: emptySession, isListening: false })
    }
  }
})

registerStoreReset(() => {
  useAiChatStore.getState().reset()
})
