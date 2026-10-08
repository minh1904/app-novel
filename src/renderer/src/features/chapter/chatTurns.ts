import {
  CHAT_HISTORY_CHARS_BUDGET,
  type ChatAction,
  type ChatChunk,
  type ChatContextBlock,
  type ChatError,
  type ChatFinishReason,
  type ChatLocation,
  type ChatRange,
  type ChatToolProposal,
  type ChatToolStep,
  type ChatTurn,
  type ChatUsage
} from '../../../../shared/contracts/aiChat'
import type { AiTurnView } from '../../../../shared/contracts/aiHistory'

/**
 * The state of a conversation in the panel, as pure functions.
 *
 * Separated from the component on purpose: the rules worth getting right are not about pixels. Two
 * turns must never mix their text, and a closed turn must never gain more. Those are the ways this
 * feature could quietly show one answer inside another, and here they are ordinary functions with
 * ordinary tests.
 *
 * A turn no longer has a mode or a range (change `agentic-chat`): what it proposes comes from the
 * writing tools, as `proposals`, and their status is read from the proposal queue, not kept here.
 */

export type TurnStatus = 'sending' | 'running' | 'done' | 'cancelled' | 'error' | 'interrupted'

/** One tool call. `detail` describes the scope; it is never the text that was read. */
export type ToolStep = ChatToolStep

export interface TurnView {
  /** Stable React key, assigned before the request exists. */
  localId: string
  /** Set once main answers the send call; chunks are matched on it. */
  requestId: string | null
  question: string
  /** The chapter that was open when it was sent. */
  chapterId?: string
  /** `chat` for a turn without a mode; an old turn keeps the mode it was sent with. */
  mode: ChatAction
  answer: string
  /** What the model thought before answering, shown as "Thought"; empty when it said nothing of it. */
  reasoning: string
  /** When the question was sent (ms epoch). */
  createdAt: number
  /** When the turn ended; `null` while it runs. */
  finishedAt: number | null
  status: TurnStatus
  error: ChatError | null
  usage: ChatUsage | null
  usd: number | null
  keyTail: string | null
  finishReason: ChatFinishReason | null
  /** What the model did with tools, in order. Scope lines only, never content. */
  tools: ToolStep[]
  /** What the writing tools proposed (or an old turn's fenced proposal), in order. */
  proposals: ChatToolProposal[]
  /** Where the user was when it was sent; absent on an old turn. */
  location?: ChatLocation | null
  /** What an old turn sent along with the question; empty for a `chat` turn. */
  context: ChatContextBlock[]
  /** The stretch an old Sửa turn was about. */
  range: ChatRange | null
}

export interface Session {
  turns: TurnView[]
  /** Older turns left out of the last send because of the budget; 0 when none were. */
  dropped: number
}

export const emptySession: Session = { turns: [], dropped: 0 }

export function restoredSession(turns: AiTurnView[]): Session {
  return {
    dropped: turns[turns.length - 1]?.droppedTurns ?? 0,
    turns: [...turns].reverse().map((turn) => ({
      localId: turn.id,
      requestId: turn.id,
      question: turn.question,
      chapterId: turn.chapterId ?? undefined,
      mode: turn.action,
      answer: turn.answer,
      reasoning: turn.reasoning,
      createdAt: turn.createdAt,
      finishedAt: turn.status === 'sending' || turn.status === 'running' ? null : turn.updatedAt,
      status: turn.status,
      error: null,
      usage: turn.usage,
      usd: turn.costUsd,
      keyTail: null,
      finishReason: turn.finishReason,
      tools: turn.tools,
      proposals: turn.proposals,
      location: turn.location,
      context: turn.context,
      range: turn.range
    }))
  }
}

/** A turn still waiting for its ending. Only these accept chunks. */
const isOpen = (turn: TurnView): boolean => turn.status === 'sending' || turn.status === 'running'

export function beginTurn(
  session: Session,
  turn: { localId: string; question: string; chapterId?: string; location?: ChatLocation },
  now: number = Date.now()
): Session {
  return {
    ...session,
    turns: [
      ...session.turns,
      {
        ...turn,
        mode: 'chat',
        requestId: null,
        answer: '',
        reasoning: '',
        createdAt: now,
        finishedAt: null,
        tools: [],
        proposals: [],
        context: [],
        range: null,
        status: 'sending',
        error: null,
        usage: null,
        usd: null,
        keyTail: null,
        finishReason: null
      }
    ]
  }
}

/** Main answered the send call. Until this lands the turn cannot be matched to any chunk. */
export function attachRequestId(session: Session, localId: string, requestId: string): Session {
  return mapTurn(
    session,
    (turn) => turn.localId === localId,
    (turn) => ({ ...turn, requestId })
  )
}

/** The send call itself failed, so no chunk will ever arrive for this turn. */
export function failTurn(
  session: Session,
  localId: string,
  error: ChatError,
  now: number = Date.now()
): Session {
  return mapTurn(
    session,
    (turn) => turn.localId === localId && isOpen(turn),
    (turn) => ({
      ...turn,
      status: error.kind === 'cancelled' ? 'cancelled' : 'error',
      error,
      finishedAt: now
    })
  )
}

/**
 * One chunk into the session.
 *
 * Matched by `requestId`, never by "the last turn": with two turns in flight, position is wrong half
 * the time, and the symptom is one answer's words appearing inside the other. A chunk for a turn that
 * already ended is dropped rather than applied — main guarantees it will not send one, and this side
 * does not rely on that guarantee holding.
 */
export function applyChunk(session: Session, chunk: ChatChunk, now: number = Date.now()): Session {
  const matches = (turn: TurnView): boolean => turn.requestId === chunk.requestId && isOpen(turn)

  if (chunk.kind === 'reasoning') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      reasoning: turn.reasoning + chunk.text
    }))
  }
  if (chunk.kind === 'delta') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      answer: turn.answer + chunk.text
    }))
  }
  if (chunk.kind === 'tool') {
    // A tool call is progress, not an ending: the turn stays open and the step is appended in order.
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      tools: [
        ...turn.tools,
        {
          name: chunk.name,
          detail: chunk.detail,
          ...(chunk.status === undefined ? {} : { status: chunk.status })
        }
      ]
    }))
  }
  if (chunk.kind === 'proposal') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      proposals: [...turn.proposals, chunk.proposal]
    }))
  }
  if (chunk.kind === 'done') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'done',
      finishedAt: now,
      usage: chunk.usage,
      usd: chunk.usd,
      keyTail: chunk.keyTail,
      finishReason: chunk.finishReason ?? null
    }))
  }
  return mapTurn(session, matches, (turn) => ({
    ...turn,
    // Cancelling is a decision, not a failure: it reads differently and offers "ask again", not a
    // retry of something that broke.
    status: chunk.error.kind === 'cancelled' ? 'cancelled' : 'error',
    error: chunk.error,
    finishedAt: now
  }))
}

function mapTurn(
  session: Session,
  matches: (turn: TurnView) => boolean,
  update: (turn: TurnView) => TurnView
): Session {
  let changed = false
  const turns = session.turns.map((turn) => {
    if (!matches(turn)) return turn
    changed = true
    return update(turn)
  })
  return changed ? { ...session, turns } : session
}

/** Turns still waiting for an ending; the panel cancels these when it closes. */
export function openRequestIds(session: Session): string[] {
  return session.turns
    .filter((turn) => isOpen(turn) && turn.requestId !== null)
    .map((turn) => turn.requestId as string)
}

/**
 * The turns to send as history, newest-last, within the budget.
 *
 * Only completed turns go: a truncated answer fed back as the assistant's words would have the model
 * continue from something it never finished saying. Trimming reports how many were left out, because
 * a conversation that silently forgets is worse than one that says it forgot (D10).
 */
export function historyFor(
  session: Session,
  budget = CHAT_HISTORY_CHARS_BUDGET
): { history: ChatTurn[]; dropped: number } {
  const complete = session.turns.filter((turn) => turn.status === 'done' && turn.answer !== '')

  const kept: TurnView[] = []
  let spent = 0
  // Newest first so the turns closest to the question are the ones that survive.
  for (let i = complete.length - 1; i >= 0; i--) {
    const turn = complete[i]
    const cost = turn.question.length + turn.answer.length
    if (kept.length > 0 && spent + cost > budget) break
    spent += cost
    kept.unshift(turn)
  }

  const history: ChatTurn[] = []
  for (const turn of kept) {
    history.push({ role: 'user', text: turn.question })
    history.push({ role: 'assistant', text: turn.answer })
  }
  return { history, dropped: complete.length - kept.length }
}
