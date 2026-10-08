import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatLocation } from '../../../../../shared/contracts/aiChat'
import type { AiSessionView } from '../../../../../shared/contracts/aiHistory'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type { ModelEntryView } from '../../../../../shared/contracts/modelSettings'
import type { ModelSelection } from '../../models/ModelSelectionMenu'
import { thinkingPatch, type ThinkingChoice } from '../../models/modelSettingsForm'
import { resolveModelChoice } from '../../models/modelChoice'
import { useAiChatStore } from '../../../stores/aiChatStore'
import { useConnectionStore } from '../../../stores/connectionStore'
import type { SourceLanguage } from '../../../../../shared/contracts/library'
import type { TargetRange } from '../../editor/chatRange'
import { startFailure } from './chatStartFailure'
import { beginTurn, emptySession, historyFor, openRequestIds, type Session } from './chatTurns'

/**
 * The panel's one connection to the rest of the app: a session of turns and a provider call per turn.
 *
 * A turn carries the question, the history, the model and where the user is (change `agentic-chat`);
 * no chapter text goes with it. What the model proposes comes back as proposals in the queue, which the
 * panel accepts or denies like any other.
 *
 * The app owns the stream listener; this hook binds the current work and chapter to it.
 */

/**
 * What the panel needs from the translation pane — the subset of `TextEditorHandle` it uses, so the
 * hook can be reasoned about (and stubbed) without dragging in saving, conflicts or the DOM.
 */
export interface ChatEditor {
  getText(): string
  isDirty(): boolean
  reload(): Promise<void>
  reviewProposal(
    range: TargetRange,
    replacement: string,
    onAccept: () => void,
    onDeny: () => void,
    label?: string
  ): 'reviewing' | 'stale'
  endReview(): void
}

export interface AiChatOptions {
  /** Which work and chapter the turn is about; the read-only tools stay inside this work. */
  workId: string
  chapterId: string
  sourceLang: SourceLanguage
  /** Where the user is right now; read when a turn is sent, so it is the position at that moment. */
  location(): ChatLocation
}

export interface AiChatController {
  session: Session
  sessions: AiSessionView[]
  sessionId: string | null
  selectSession(id: string): void
  /** Connections that can actually be called: enabled, and with a model to call. */
  usable: ConnectionView[]
  connection: ConnectionView | null
  /** Id of the chosen model entry. */
  model: string | null
  models: ModelEntryView[]
  /** The connection and entry in use, in the shape the model menu takes. */
  selection: ModelSelection | null
  selectModel(selection: ModelSelection): void
  /** This chat's own pick differs from the main model of Settings (the pill's accent dot). */
  overridesMain: boolean
  /** "Dùng mặc định trong Cài đặt": drop this chat's own pick. */
  useDefaultModel(): void
  /** "Thêm model tùy chỉnh…": a new entry on a connection; `null` when it could not be added. */
  addCustomModel(connectionId: string, modelId: string): Promise<ModelSelection | null>
  /** Picks the entry and writes the level into its settings, like any other setting. */
  setThinking(selection: ModelSelection, choice: ThinkingChoice): Promise<void>
  /** Reloads the connections; the panel lives as long as the chapter, so its copy goes stale. */
  refreshConnections(): void
  /** Why the last attempt to change a model's level failed, if it did. */
  modelNotice: string | null
  dismissModelNotice(): void
  /** True once a connection and model are chosen, there is a question, and no turn is running. */
  canSend(question: string): boolean
  send(question: string): Promise<void>
  cancel(requestId: string): void
  newConversation(): void
  /** Set when connections could not be read at all. */
  loadError: string | null
}

const usableOf = (connections: ConnectionView[]): ConnectionView[] =>
  connections.filter((connection) => connection.enabled)

export function useAiChat(options: AiChatOptions): AiChatController {
  const { workId, chapterId, sourceLang, location } = options

  const connections = useConnectionStore((state) => state.connections)
  const connectionLoad = useConnectionStore((state) => state.load)
  const connectionLoadError = useConnectionStore((state) => state.loadError)
  const [modelNotice, setModelNotice] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [model, setModelState] = useState<string | null>(null)
  const storedWorkId = useAiChatStore((state) => state.workId)
  const session = useAiChatStore((state) =>
    state.workId === workId ? state.session : emptySession
  )
  const sessionId = useAiChatStore((state) => (state.workId === workId ? state.sessionId : null))
  const [sessions, setSessions] = useState<AiSessionView[]>([])
  const loadSequence = useRef(0)

  // The session is read inside callbacks that must not be rebuilt on every chunk, so it is mirrored
  // in a ref. Mirrored in an effect, not during render: writing a ref while rendering is a React
  // violation, and the committed value is what the unmount cleanup needs anyway.
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (storedWorkId !== workId) {
      useAiChatStore.getState().selectWork(workId)
    }
  }, [storedWorkId, workId])

  const selectSession = useCallback(
    (id: string) => {
      if (useAiChatStore.getState().sessionId === id) return
      for (const requestId of openRequestIds(sessionRef.current)) {
        void window.mira.ai.chat.cancel(requestId)
      }
      const sequence = ++loadSequence.current
      void window.mira.ai.sessions.turns(workId, id).then((result) => {
        if (
          loadSequence.current !== sequence ||
          !result.ok ||
          useAiChatStore.getState().workId !== workId
        )
          return
        useAiChatStore.getState().setSessionId(id)
        useAiChatStore.getState().restoreSession(result.value.turns)
      })
    },
    [workId]
  )

  useEffect(() => {
    const sequence = ++loadSequence.current
    void window.mira.ai.sessions.list(workId).then((result) => {
      if (
        loadSequence.current !== sequence ||
        !result.ok ||
        useAiChatStore.getState().workId !== workId
      )
        return
      setSessions(result.value.sessions)
      const savedId = useAiChatStore.getState().sessionId
      const first =
        result.value.sessions.find((item) => item.id === savedId) ?? result.value.sessions[0]
      if (first) selectSession(first.id)
    })
    return () => {
      loadSequence.current++
    }
  }, [workId, selectSession])

  const latest = useRef({ location, sourceLang })
  useEffect(() => {
    latest.current = { location, sourceLang }
  })

  useEffect(() => {
    if (connectionLoad === 'loading') {
      void useConnectionStore.getState().reload()
    }
  }, [connectionLoad])

  const refreshConnections = useCallback(() => {
    void useConnectionStore.getState().reload()
  }, [])

  const selectModel = useCallback((selection: ModelSelection) => {
    setConnectionId(selection.connectionId)
    setModelState(selection.entryId)
  }, [])

  const useDefaultModel = useCallback(() => {
    setConnectionId(null)
    setModelState(null)
  }, [])

  const addCustomModel = useCallback(
    async (connectionId: string, modelId: string): Promise<ModelSelection | null> => {
      const store = useConnectionStore.getState()
      const outcome = await store.entries.add(connectionId, [{ model: modelId }])
      if (!outcome.ok) {
        setModelNotice(outcome.message)
        return null
      }
      const added = useConnectionStore
        .getState()
        .connections.find((item) => item.id === connectionId)
        ?.models.filter((entry) => entry.model === modelId)
        .at(-1)
      return added ? { connectionId, entryId: added.id } : null
    },
    []
  )

  const setThinking = useCallback(
    async (selection: ModelSelection, choice: ThinkingChoice): Promise<void> => {
      selectModel(selection)
      const outcome = await useConnectionStore.getState().entries.update(selection.entryId, {
        settings: thinkingPatch(choice)
      })
      if (outcome.ok) {
        setModelNotice(null)
      } else {
        setModelNotice(outcome.message)
      }
    },
    [selectModel]
  )

  const main = useConnectionStore((state) => state.preferences?.main ?? null)
  // What was picked for this chat, else the main model of Settings, else the first default (model-defaults).
  const choice = useMemo(
    () => resolveModelChoice(connections, { connectionId, entryId: model }, main),
    [connections, connectionId, model, main]
  )
  const usable = useMemo(() => usableOf(connections), [connections])
  const connection = useMemo(
    () => usable.find((entry) => entry.id === choice?.connectionId) ?? null,
    [usable, choice]
  )
  const chosenModel = choice && connection ? choice.entryId : null

  const cancel = useCallback((requestId: string) => {
    void window.mira.ai.chat.cancel(requestId)
  }, [])

  const canSend = useCallback(
    (question: string): boolean => {
      if (question.trim() === '' || connection === null || chosenModel === null) return false
      return openRequestIds(sessionRef.current).length === 0
    },
    [connection, chosenModel]
  )

  const send = useCallback(
    async (question: string): Promise<void> => {
      if (connection === null || chosenModel === null) return
      const asked = question.trim()
      if (asked === '') return

      const current = latest.current
      const where = current.location()
      const localId = crypto.randomUUID()
      const { history, dropped } = historyFor(sessionRef.current)
      useAiChatStore.getState().setSessionForWork(workId, (previous) => ({
        ...beginTurn(previous, { localId, question: asked, chapterId, location: where }),
        dropped
      }))

      const result = await window.mira.ai.chat.send({
        ...(sessionId === null ? {} : { sessionId }),
        droppedTurns: dropped,
        workId,
        chapterId,
        connectionId: connection.id,
        entryId: chosenModel,
        sourceLang: current.sourceLang,
        question: asked,
        history,
        location: where
      })

      if (result.ok) {
        useAiChatStore.getState().attachRequestIdForWork(workId, localId, result.value.requestId)
      } else {
        useAiChatStore
          .getState()
          .failTurnForWork(workId, localId, startFailure(result.error.code, result.error.message))
      }
      if (result.ok && result.value.sessionId)
        useAiChatStore.getState().setSessionIdForWork(workId, result.value.sessionId)
      if (result.ok) {
        void window.mira.ai.sessions.list(workId).then((listed) => {
          if (listed.ok) setSessions(listed.value.sessions)
        })
      }
    },
    [connection, chosenModel, workId, chapterId, sessionId]
  )

  return {
    session,
    sessions,
    sessionId,
    selectSession,
    usable,
    connection,
    model: chosenModel,
    models: connection?.models ?? [],
    selection:
      connection !== null && chosenModel !== null
        ? { connectionId: connection.id, entryId: chosenModel }
        : null,
    selectModel,
    overridesMain: choice?.source === 'picked' && main !== null && main.entryId !== choice.entryId,
    useDefaultModel,
    addCustomModel,
    setThinking,
    refreshConnections,
    modelNotice,
    dismissModelNotice: () => setModelNotice(null),
    canSend,
    send,
    cancel,
    newConversation: () => {
      loadSequence.current++
      for (const requestId of openRequestIds(sessionRef.current)) cancel(requestId)
      useAiChatStore.getState().clearSession()
    },
    loadError: connectionLoadError
  }
}
