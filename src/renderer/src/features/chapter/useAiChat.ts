import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatContextBlock, ChatMode } from '../../../../shared/aiChat'
import type { ConnectionView } from '../../../../shared/aiConnections'
import type { SourceLanguage } from '../../../../shared/library'
import type { TargetRange, TargetScope } from '../editor/chatRange'
import { buildChatContext, type ContextScope } from './chatContext'
import {
  applyChunk,
  attachRequestId,
  beginTurn,
  emptySession,
  failTurn,
  historyFor,
  openRequestIds,
  proposalOf,
  type Session
} from './chatTurns'

/**
 * The panel's one connection to the rest of the app: a session of turns, a provider call per turn,
 * and the editor the answers can be written back into.
 *
 * Everything decided here is wiring; every rule worth testing lives in `chatTurns.ts` and
 * `chatContext.ts` as pure functions. What this hook owns is the part that cannot be pure — the
 * subscription, and making sure it is torn down. A listener left behind would make a second panel
 * session receive the first one's chunks.
 */

/** How many paragraphs either side of the range go along with a question. */
const CONTEXT_RADIUS = 2

/**
 * What the panel needs from the translation pane — the subset of `TextEditorHandle` it uses, so the
 * hook can be reasoned about (and stubbed) without dragging in saving, conflicts or the DOM.
 */
export interface ChatEditor {
  getText(): string
  targetRange(scope?: TargetScope): TargetRange | null
  applyProposal(range: TargetRange, replacement: string): 'applied' | 'stale'
  reviewProposal(range: TargetRange, replacement: string): 'reviewing' | 'stale'
  endReview(): void
}

export interface AiChatOptions {
  /** Which work and chapter the turn is about; the read-only tools stay inside this work. */
  workId: string
  chapterId: string
  sourceLang: SourceLanguage
  /** The source pane, read live so context matches what the translator is looking at. */
  source: { getText(): string }
  /** The translation pane: both the context and the destination of an applied proposal. */
  target: ChatEditor | null
  /** The stretch the next turn is about, following the caret. */
  range: TargetRange | null
  /** Whether the turn is about the chapter or about that stretch. */
  scope: ContextScope
  /**
   * Which mode to start in **until the translator picks one**.
   *
   * An untranslated chapter has nothing to ask *about* yet; the job is to produce a translation, so
   * Sửa is the useful default there. A chapter with text defaults to Hỏi, where nothing can be
   * written by accident. Once the translator chooses, their choice wins and stops following.
   */
  defaultMode: ChatMode
}

export type ApplyState =
  | { kind: 'idle' }
  /** Written straight in, because the pane was empty and nothing could be lost. */
  | { kind: 'applied' }
  /** Now sitting in the pane as marked chunks, waiting to be accepted or rejected there. */
  | { kind: 'reviewing' }
  | { kind: 'stale' }

export interface AiChatController {
  session: Session
  /** Connections that can actually be called: enabled, and with a model to call. */
  usable: ConnectionView[]
  connection: ConnectionView | null
  model: string | null
  models: string[]
  setConnection(id: string): void
  setModel(model: string): void
  mode: ChatMode
  setMode(mode: ChatMode): void
  /** True once a connection and model are chosen and the range is not empty for Sửa. */
  canSend(question: string): boolean
  send(question: string): Promise<void>
  cancel(requestId: string): void
  newConversation(): void
  /** Writes a proposal into the translation, or reports that the text moved on. */
  apply(range: TargetRange, replacement: string): void
  applyState: ApplyState
  dismissApplyState(): void
  /** Drops whatever is left of a review in the pane, keeping the chunks already accepted. */
  endReview(): void
  /** Set when connections could not be read at all. */
  loadError: string | null
}

const usableOf = (connections: ConnectionView[]): ConnectionView[] =>
  connections.filter((connection) => connection.enabled)

/** The models a connection offers: what `test` found, else just its default. */
function modelsOf(connection: ConnectionView | null): string[] {
  if (!connection) return []
  if (connection.models.length > 0) return connection.models
  return connection.defaultModel ? [connection.defaultModel] : []
}

export function useAiChat(options: AiChatOptions): AiChatController {
  const { workId, chapterId, sourceLang, source, target, range, scope, defaultMode } = options

  const [connections, setConnections] = useState<ConnectionView[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [model, setModelState] = useState<string | null>(null)
  // `null` means "still following the chapter"; any pick freezes it.
  const [pickedMode, setPickedMode] = useState<ChatMode | null>(null)
  const mode = pickedMode ?? defaultMode
  const [session, setSession] = useState<Session>(emptySession)
  const [applyState, setApplyState] = useState<ApplyState>({ kind: 'idle' })

  // The session is read inside callbacks that must not be rebuilt on every chunk, so it is mirrored
  // in a ref. Mirrored in an effect, not during render: writing a ref while rendering is a React
  // violation, and the committed value is what the unmount cleanup needs anyway.
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const latest = useRef({ source, target, range, scope, sourceLang })
  useEffect(() => {
    latest.current = { source, target, range, scope, sourceLang }
  })

  useEffect(() => {
    let cancelled = false
    void window.mira.ai.list().then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setLoadError(result.error.message)
        return
      }
      setConnections(result.value.connections)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const usable = useMemo(() => usableOf(connections), [connections])
  const connection = useMemo(
    () => usable.find((entry) => entry.id === connectionId) ?? usable[0] ?? null,
    [usable, connectionId]
  )
  const models = useMemo(() => modelsOf(connection), [connection])
  const chosenModel = model !== null && models.includes(model) ? model : (models[0] ?? null)

  // One subscription for the life of the panel, torn down with the function `onChunk` returns. Any
  // other shape here leaks a listener per open/close cycle.
  useEffect(() => {
    return window.mira.ai.chat.onChunk((chunk) => {
      setSession((current) => applyChunk(current, chunk))
    })
  }, [])

  const cancel = useCallback((requestId: string) => {
    void window.mira.ai.chat.cancel(requestId)
  }, [])

  // Closing the panel must stop what is running: nobody is left to read it, and it still costs money.
  useEffect(() => {
    return () => {
      for (const requestId of openRequestIds(sessionRef.current)) {
        void window.mira.ai.chat.cancel(requestId)
      }
    }
  }, [])

  /**
   * A finished Sửa turn goes straight in **when the pane is empty** (D13).
   *
   * The dividing line is whether anything can be lost, not a preference: with no text there, a diff
   * is a ceremony over a blank page, and the first translation of a chapter is the thing this feature
   * is for. With text there, nothing is written until the translator has seen the change and agreed.
   * `Ctrl+Z` undoes it either way, and `applied` keeps each turn from being written twice.
   */
  const applied = useRef(new Set<string>())
  useEffect(() => {
    const editor = latest.current.target
    if (!editor || editor.getText().trim() !== '') return

    for (const turn of session.turns) {
      if (turn.status !== 'done' || turn.range === null) continue
      if (applied.current.has(turn.localId)) continue
      const proposal = proposalOf(turn)
      if (proposal === null) continue

      applied.current.add(turn.localId)
      // No state set here, and not merely to satisfy the linter: into an empty pane the apply cannot
      // come back `stale` (an empty document always takes the insert), and the translation appearing
      // in the pane *is* the feedback. A notice would be a second announcement of something already
      // visible, bought at the price of a cascading render.
      editor.applyProposal(turn.range, proposal)
    }
  }, [session])

  const canSend = useCallback(
    (question: string): boolean => {
      if (question.trim() === '' || connection === null || chosenModel === null) return false
      const open = openRequestIds(sessionRef.current).length > 0
      if (open) return false
      // Sửa aimed at a paragraph needs a paragraph to replace, so the button stays off rather than
      // sending a question whose answer could not be applied. Chapter scope is exempt: translating an
      // empty chapter has nothing to replace and is still the main thing this is for — the apply path
      // inserts into an empty document rather than refusing.
      if (mode === 'sua' && scope === 'range' && (range === null || range.text.trim() === '')) {
        return false
      }
      return true
    },
    [connection, chosenModel, mode, range, scope]
  )

  const send = useCallback(
    async (question: string): Promise<void> => {
      if (connection === null || chosenModel === null) return
      const asked = question.trim()
      if (asked === '') return

      // A new question makes the previous notice stale, and clearing it here keeps the state change
      // inside an event callback rather than an effect watching the session.
      setApplyState({ kind: 'idle' })

      const current = latest.current
      const targetRange = current.range
      // Built even with no range and no caret: the chapter is what the question is about, and a turn
      // that reached the model with nothing attached is how "dịch chương này" got the answer "hãy
      // cung cấp nội dung chương". Only a missing translation pane leaves this empty.
      const context: ChatContextBlock[] =
        current.target === null
          ? []
          : buildChatContext({
              sourceText: current.source.getText(),
              targetText: current.target.getText(),
              range: targetRange,
              scope: current.scope,
              radius: CONTEXT_RADIUS
            })

      const localId = 'turn-' + String(sessionRef.current.turns.length) + '-' + asked.length
      const { history, dropped } = historyFor(sessionRef.current)
      setSession((previous) => ({
        ...beginTurn(previous, {
          localId,
          question: asked,
          mode,
          context,
          range: mode === 'sua' ? targetRange : null
        }),
        dropped
      }))

      const result = await window.mira.ai.chat.send({
        workId,
        chapterId,
        connectionId: connection.id,
        model: chosenModel,
        mode,
        sourceLang: current.sourceLang,
        question: asked,
        history,
        context
      })

      setSession((previous) =>
        result.ok
          ? attachRequestId(previous, localId, result.value.requestId)
          : failTurn(previous, localId, {
              kind: 'refused',
              message: result.error.message,
              retryable: false,
              recoverAt: null
            })
      )
    },
    [connection, chosenModel, mode, workId, chapterId]
  )

  /**
   * Into the pane — as a review when there is text to compare against, outright when there is not.
   *
   * The same dividing line as everywhere else in this feature: a diff over a blank page is ceremony,
   * a diff over someone's work is the whole point.
   */
  const apply = useCallback((range: TargetRange, replacement: string) => {
    const editor = latest.current.target
    if (!editor) {
      setApplyState({ kind: 'stale' })
      return
    }
    if (editor.getText().trim() === '') {
      setApplyState({
        kind: editor.applyProposal(range, replacement) === 'applied' ? 'applied' : 'stale'
      })
      return
    }
    setApplyState({
      kind: editor.reviewProposal(range, replacement) === 'reviewing' ? 'reviewing' : 'stale'
    })
  }, [])

  return {
    session,
    usable,
    connection,
    model: chosenModel,
    models,
    setConnection: setConnectionId,
    setModel: setModelState,
    mode,
    setMode: setPickedMode,
    canSend,
    send,
    cancel,
    newConversation: () => {
      for (const requestId of openRequestIds(sessionRef.current)) cancel(requestId)
      setSession(emptySession)
    },
    apply,
    applyState,
    dismissApplyState: () => setApplyState({ kind: 'idle' }),
    endReview: () => {
      latest.current.target?.endReview()
      setApplyState({ kind: 'idle' })
    },
    loadError
  }
}
