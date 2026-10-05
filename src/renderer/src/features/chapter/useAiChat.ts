import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatContextBlock, ChatMode } from '../../../../shared/contracts/aiChat'
import type { AiSessionView } from '../../../../shared/contracts/aiHistory'
import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import type { ModelEntryView } from '../../../../shared/contracts/modelSettings'
import type { ModelSelection } from '../models/ModelSelectionMenu'
import { thinkingPatch, type ThinkingChoice } from '../models/modelSettingsForm'
import { useAiChatStore } from '../../stores/aiChatStore'
import { useConnectionStore } from '../../stores/connectionStore'
import type { SourceLanguage } from '../../../../shared/contracts/library'
import type { TargetRange, TargetScope } from '../editor/chatRange'
import { buildChatContext, type ContextScope } from './chatContext'
import {
  beginTurn,
  emptySession,
  historyFor,
  markTurnProposal,
  openRequestIds,
  type Session,
  type TurnView
} from './chatTurns'

/**
 * The panel's one connection to the rest of the app: a session of turns, a provider call per turn,
 * and the editor the answers can be written back into.
 *
 * The app owns the stream listener; this hook binds the current work and chapter to it.
 */

/** How many paragraphs either side of the range go along with a question. */
const CONTEXT_RADIUS = 2

/**
 * What the panel needs from the translation pane — the subset of `TextEditorHandle` it uses, so the
 * hook can be reasoned about (and stubbed) without dragging in saving, conflicts or the DOM.
 */
export interface ChatEditor {
  getText(): string
  isDirty(): boolean
  reload(): Promise<void>
  targetRange(scope?: TargetScope): TargetRange | null
  reviewProposal(
    range: TargetRange,
    replacement: string,
    onAccept: () => void,
    onDeny: () => void,
    label?: string
  ): 'reviewing' | 'stale'
  endReview(): void
}

export interface ChatSendSnapshot {
  sourceText: string
  targetText: string
  range: TargetRange | null
  context: ChatContextBlock[]
}

export interface AiChatOptions {
  /** Which work and chapter the turn is about; the read-only tools stay inside this work. */
  workId: string
  chapterId: string
  sourceLang: SourceLanguage
  /** The source pane, read live so context matches what the translator is looking at. */
  source: { getText(): string; isDirty(): boolean }
  /** The translation pane: both the context and the destination of an applied proposal. */
  target: ChatEditor | null
  /** The stretch the next turn is about, following the caret. */
  range: TargetRange | null
  /** Whether the turn is about the chapter or about that stretch. */
  scope: ContextScope
}

export type ApplyState =
  | { kind: 'idle' }
  /** Written straight in, because the pane was empty and nothing could be lost. */
  | { kind: 'applied' }
  /** Now sitting in the pane as marked chunks, waiting to be accepted or rejected there. */
  | { kind: 'stale' }
  | { kind: 'error'; message: string }

export interface AiChatController {
  session: Session
  sessions: AiSessionView[]
  sessionId: string | null
  selectSession(id: string): void
  proposalVersion: number
  /** Connections that can actually be called: enabled, and with a model to call. */
  usable: ConnectionView[]
  connection: ConnectionView | null
  /** Id of the chosen model entry. */
  model: string | null
  models: ModelEntryView[]
  /** The connection and entry in use, in the shape the model menu takes. */
  selection: ModelSelection | null
  selectModel(selection: ModelSelection): void
  /** Picks the entry and writes the level into its settings, like any other setting. */
  setThinking(selection: ModelSelection, choice: ThinkingChoice): Promise<void>
  /** Reloads the connections; the panel lives as long as the chapter, so its copy goes stale. */
  refreshConnections(): void
  /** Why the last attempt to change a model's level failed, if it did. */
  modelNotice: string | null
  dismissModelNotice(): void
  /** True once a connection and model are chosen and the range is not empty for Sửa. */
  canSend(question: string, action?: ChatMode): boolean
  send(question: string, action?: ChatMode, snapshot?: ChatSendSnapshot): Promise<void>
  cancel(requestId: string): void
  newConversation(): void
  /** Accepts a persisted proposal through the same main-process transaction as direct apply. */
  apply(turn: TurnView): Promise<void>
  applyState: ApplyState
  dismissApplyState(): void
  /** Set when connections could not be read at all. */
  loadError: string | null
}

const usableOf = (connections: ConnectionView[]): ConnectionView[] =>
  connections.filter((connection) => connection.enabled)

/** The model entries a connection offers, in the order the person arranged them. */
function modelsOf(connection: ConnectionView | null): ModelEntryView[] {
  return connection ? connection.models : []
}

export function useAiChat(options: AiChatOptions): AiChatController {
  const { workId, chapterId, sourceLang, source, target, range, scope } = options

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
  const [proposalVersion, setProposalVersion] = useState(0)
  const loadSequence = useRef(0)
  const [applyState, setApplyState] = useState<ApplyState>({ kind: 'idle' })

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

  const latest = useRef({ source, target, range, scope, sourceLang })
  useEffect(() => {
    latest.current = { source, target, range, scope, sourceLang }
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

  const usable = useMemo(() => usableOf(connections), [connections])
  const connection = useMemo(
    () => usable.find((entry) => entry.id === connectionId) ?? usable[0] ?? null,
    [usable, connectionId]
  )
  const models = useMemo(() => modelsOf(connection), [connection])
  // The connection's default entry when nothing was picked, else the first one.
  const chosenModel =
    model !== null && models.some((entry) => entry.id === model)
      ? model
      : (models.find((entry) => entry.id === connection?.defaultEntryId)?.id ??
        models[0]?.id ??
        null)

  const cancel = useCallback((requestId: string) => {
    void window.mira.ai.chat.cancel(requestId)
  }, [])

  /** Main commits the turn and proposal together; the visible editor follows an automatic write. */
  const reloaded = useRef(new Set<string>())
  useEffect(() => {
    for (const turn of session.turns) {
      if (turn.proposalStatus !== 'applied' || !turn.partId || reloaded.current.has(turn.partId))
        continue
      reloaded.current.add(turn.partId)
      const editor = latest.current.target
      if (turn.chapterId === chapterId && editor && !editor.isDirty()) void editor.reload()
    }
  }, [session, chapterId])

  const canSend = useCallback(
    (question: string, action: ChatMode = 'hoi'): boolean => {
      if (question.trim() === '' || connection === null || chosenModel === null) return false
      const open = openRequestIds(sessionRef.current).length > 0
      if (open) return false
      // Sửa aimed at a paragraph needs a paragraph to replace, so the button stays off rather than
      // sending a question whose answer could not be applied. Chapter scope is exempt: translating an
      // empty chapter has nothing to replace and is still the main thing this is for — the apply path
      // inserts into an empty document rather than refusing.
      if (action !== 'hoi' && scope === 'range' && (range === null || range.text.trim() === '')) {
        return false
      }
      return true
    },
    [connection, chosenModel, range, scope]
  )

  const send = useCallback(
    async (
      question: string,
      action: ChatMode = 'hoi',
      snapshot?: ChatSendSnapshot
    ): Promise<void> => {
      if (connection === null || chosenModel === null) return
      const asked = question.trim()
      if (asked === '') return

      // A new question makes the previous notice stale, and clearing it here keeps the state change
      // inside an event callback rather than an effect watching the session.
      setApplyState({ kind: 'idle' })

      const current = latest.current
      const targetRange = snapshot ? snapshot.range : current.range
      const sourceText = snapshot?.sourceText ?? current.source.getText()
      const targetText = snapshot?.targetText ?? current.target?.getText() ?? ''
      const base =
        action === 'hoi'
          ? null
          : await Promise.all([
              window.mira.text.get(workId, chapterId, 'source'),
              window.mira.text.get(workId, chapterId, 'target')
            ])
      if (base && (!base[0].ok || !base[1].ok)) {
        setApplyState({
          kind: 'error',
          message: 'Không đọc được revision của chương để tạo đề xuất.'
        })
        return
      }
      const proposalBase =
        base && base[0].ok && base[1].ok
          ? {
              sourceRev: base[0].value.rev,
              sourceContent: sourceText,
              targetRev: base[1].value.rev,
              targetContent: targetText,
              blockAutoApply:
                current.source.isDirty() ||
                current.target?.isDirty() === true ||
                sourceText !== base[0].value.content ||
                targetText !== base[1].value.content
            }
          : undefined
      // Built even with no range and no caret: the chapter is what the question is about, and a turn
      // that reached the model with nothing attached is how "dịch chương này" got the answer "hãy
      // cung cấp nội dung chương". Only a missing translation pane leaves this empty.
      const context: ChatContextBlock[] =
        snapshot?.context ??
        (current.target === null
          ? []
          : buildChatContext({
              sourceText,
              targetText,
              range: targetRange,
              scope: current.scope,
              radius: CONTEXT_RADIUS
            }))

      const localId = crypto.randomUUID()
      const { history, dropped } = historyFor(sessionRef.current)
      useAiChatStore.getState().setSessionForWork(workId, (previous) => ({
        ...beginTurn(previous, {
          localId,
          question: asked,
          chapterId,
          sourceText,
          targetText,
          sourceRev: base && base[0].ok ? base[0].value.rev : undefined,
          targetBaseRev: base && base[1].ok ? base[1].value.rev : undefined,
          mode: action,
          context,
          range: action === 'hoi' ? null : targetRange
        }),
        dropped
      }))

      const result = await window.mira.ai.chat.send({
        ...(sessionId === null ? {} : { sessionId }),
        droppedTurns: dropped,
        range: action === 'hoi' ? null : targetRange,
        workId,
        chapterId,
        connectionId: connection.id,
        entryId: chosenModel,
        mode: action,
        ...(proposalBase ? { proposalBase } : {}),
        sourceLang: current.sourceLang,
        question: asked,
        history,
        context
      })

      if (result.ok) {
        useAiChatStore.getState().attachRequestIdForWork(workId, localId, result.value.requestId)
      } else {
        useAiChatStore.getState().failTurnForWork(workId, localId, {
          kind: 'refused',
          message: result.error.message,
          retryable: false,
          recoverAt: null
        })
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

  const apply = useCallback(
    async (turn: TurnView): Promise<void> => {
      const editor = latest.current.target
      if (!editor || turn.partId === undefined || turn.chapterId !== chapterId) {
        setApplyState({ kind: 'stale' })
        return
      }
      if (editor.isDirty() || latest.current.source.isDirty()) {
        setApplyState({ kind: 'error', message: 'Hãy đợi chữ đang sửa được lưu trước khi duyệt.' })
        return
      }
      const result = await window.mira.ai.proposals.accept({
        workId,
        chapterId,
        partId: turn.partId,
        commandId: crypto.randomUUID()
      })
      if (!result.ok) {
        setApplyState({ kind: 'error', message: result.error.message })
        return
      }
      if (useAiChatStore.getState().workId !== workId) return
      if (result.value.accepted.includes(turn.partId)) {
        setApplyState({ kind: 'applied' })
        setProposalVersion((version) => version + 1)
        if (turn.proposalId)
          useAiChatStore.getState().setSession((current) =>
            markTurnProposal(current, turn.localId, {
              proposalId: turn.proposalId as string,
              partId: turn.partId as string,
              status: 'applied'
            })
          )
        if (!editor.isDirty()) await editor.reload()
      } else {
        setApplyState({ kind: 'stale' })
      }
    },
    [workId, chapterId]
  )

  return {
    session,
    sessions,
    sessionId,
    selectSession,
    proposalVersion,
    usable,
    connection,
    model: chosenModel,
    models,
    selection:
      connection !== null && chosenModel !== null
        ? { connectionId: connection.id, entryId: chosenModel }
        : null,
    selectModel,
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
    apply,
    applyState,
    dismissApplyState: () => setApplyState({ kind: 'idle' }),
    loadError: connectionLoadError
  }
}
