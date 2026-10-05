import { create } from 'zustand'
import type { ChatChunk, ChatContextBlock, ChatError, ChatMode } from '../../../shared/contracts/aiChat'
import type { AiTurnView } from '../../../shared/contracts/aiHistory'
import type { TargetRange } from '../features/editor/chatRange'
import {
  applyChunk,
  attachRequestId,
  beginTurn,
  emptySession,
  failTurn,
  markTurnProposal,
  restoredSession,
  type Session,
  type TurnView
} from '../features/chapter/chatTurns'
import { registerStoreReset } from './resetStores'

export interface BeginTurnInput {
  localId?: string
  question: string
  mode: ChatMode
  context: ChatContextBlock[]
  range: TargetRange | null
  chapterId?: string
  sourceText?: string
  targetText?: string
  sourceRev?: number
  targetBaseRev?: number
}

export type ProposalPatch = Parameters<typeof markTurnProposal>[2]

export interface AiChatState {
  workId: string | null
  sessionId: string | null
  session: Session
  isListening: boolean

  // Actions
  startListening(): () => void
  selectWork(workId: string): void
  setSessionId(sessionId: string | null): void
  receiveChunk(chunk: ChatChunk): void
  beginTurn(input: BeginTurnInput): TurnView
  attachRequestId(localId: string, requestId: string): void
  failTurn(localId: string, error: ChatError): void
  markTurnProposal(localId: string, patch: ProposalPatch): void
  setSession(session: Session | ((previous: Session) => Session)): void
  restoreSession(views: AiTurnView[]): void
  clearSession(): void
  reset(): void
}

let unsubscribeChunk: (() => void) | null = null
const earlyChunks = new Map<string, ChatChunk[]>()

export const useAiChatStore = create<AiChatState>((set, get) => ({
  workId: null,
  sessionId: null,
  session: emptySession,
  isListening: false,

  selectWork: (workId) => {
    if (get().workId !== workId) earlyChunks.clear()
    set((state) => state.workId === workId ? state :
      { workId, sessionId: null, session: emptySession })
  },
  setSessionId: (sessionId) => set({ sessionId }),

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
    if (!get().session.turns.some((turn) => turn.requestId === chunk.requestId)) {
      if (earlyChunks.size >= 100) earlyChunks.clear()
      earlyChunks.set(chunk.requestId, [...(earlyChunks.get(chunk.requestId) ?? []), chunk])
      return
    }
    set((state) => ({
      session: applyChunk(state.session, chunk)
    }))
    if (chunk.kind === 'done' && chunk.proposal && typeof window !== 'undefined') {
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
    set((state) => ({
      session: attachRequestId(state.session, localId, requestId)
    }))
    const waiting = earlyChunks.get(requestId) ?? []
    earlyChunks.delete(requestId)
    for (const chunk of waiting) get().receiveChunk(chunk)
  },

  failTurn: (localId: string, error: ChatError) => {
    set((state) => ({
      session: failTurn(state.session, localId, error)
    }))
  },

  markTurnProposal: (localId: string, patch: ProposalPatch) => {
    set((state) => ({
      session: markTurnProposal(state.session, localId, patch)
    }))
  },

  setSession: (sessionOrUpdater) => {
    set((state) => ({
      session:
        typeof sessionOrUpdater === 'function' ? sessionOrUpdater(state.session) : sessionOrUpdater
    }))
  },

  restoreSession: (views: AiTurnView[]) => {
    set({ session: restoredSession(views) })
  },

  clearSession: () => {
    earlyChunks.clear()
    set({ session: emptySession, sessionId: null })
  },

  reset: () => {
    earlyChunks.clear()
    if (unsubscribeChunk) {
      unsubscribeChunk()
    }
    set({ workId: null, sessionId: null, session: emptySession, isListening: false })
  }
}))

registerStoreReset(() => {
  useAiChatStore.getState().reset()
})
