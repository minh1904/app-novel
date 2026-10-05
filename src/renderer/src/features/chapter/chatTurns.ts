import {
  CHAT_HISTORY_CHARS_BUDGET,
  extractFence,
  type ChatChunk,
  type ChatContextBlock,
  type ChatError,
  type ChatFinishReason,
  type ChatMode,
  type ChatTurn,
  type ChatUsage
} from '../../../../shared/contracts/aiChat'
import type { TargetRange } from '../editor/chatRange'
import type { AiTurnView } from '../../../../shared/contracts/aiHistory'

/**
 * The state of a conversation in the panel, as pure functions.
 *
 * Separated from the component on purpose: the rules worth getting right are not about pixels. Two
 * turns must never mix their text, a closed turn must never gain more, and a half-received answer
 * must never offer an Apply button. Those are the three ways this feature could quietly write the
 * wrong thing into someone's translation, and here they are ordinary functions with ordinary tests.
 *
 * Lives for one session only (Q4): closing the panel drops it, and the panel says so rather than
 * letting the translator assume it was kept.
 */

export type TurnStatus = 'sending' | 'running' | 'done' | 'cancelled' | 'error' | 'interrupted'

/** One lookup the model made. `detail` describes the scope; it is never the text that was read. */
export interface ToolStep {
  name: string
  detail: string
}

export interface TurnView {
  /** Stable React key, assigned before the request exists. */
  localId: string
  /** Set once main answers the send call; chunks are matched on it. */
  requestId: string | null
  question: string
  /** Captured when sent, so a late answer cannot write into a chapter opened afterward. */
  chapterId?: string
  sourceText?: string
  targetText?: string
  sourceRev?: number
  targetBaseRev?: number
  proposalId?: string
  partId?: string
  proposalStatus?: 'pending' | 'applied' | 'rejected' | 'conflict' | 'stale' | 'needs-placement'
  mode: ChatMode
  answer: string
  status: TurnStatus
  error: ChatError | null
  usage: ChatUsage | null
  usd: number | null
  keyTail: string | null
  finishReason: ChatFinishReason | null
  /** Outcome of an explicitly requested direct apply. */
  autoApply: 'applied' | 'needs-review' | null
  /** Exactly what was sent along with the question, for the "đã gửi kèm" list. */
  context: ChatContextBlock[]
  /** What the model went and read for itself, in order. Scope lines only, never content. */
  tools: ToolStep[]
  /** The stretch this turn is about; the anchor an Apply uses. Null in Hỏi mode. */
  range: TargetRange | null
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
      status: turn.status,
      error: null,
      usage: turn.usage,
      usd: turn.costUsd,
      keyTail: null,
      finishReason: turn.finishReason,
      autoApply: turn.action === 'ap_dung' && turn.proposalStatus !== null
        ? turn.proposalStatus === 'applied' ? 'applied' : 'needs-review'
        : null,
      context: turn.context,
      tools: turn.tools,
      range: turn.range,
      proposalId: turn.proposalId ?? undefined,
      partId: turn.partId ?? undefined,
      proposalStatus: turn.proposalStatus ?? undefined
    }))
  }
}

/** A turn still waiting for its ending. Only these accept chunks. */
const isOpen = (turn: TurnView): boolean => turn.status === 'sending' || turn.status === 'running'

export function beginTurn(
  session: Session,
  turn: {
    localId: string
    question: string
    chapterId?: string
    sourceText?: string
    targetText?: string
    sourceRev?: number
    targetBaseRev?: number
    mode: ChatMode
    context: ChatContextBlock[]
    range: TargetRange | null
  }
): Session {
  return {
    ...session,
    turns: [
      ...session.turns,
      {
        ...turn,
        requestId: null,
        answer: '',
        tools: [],
        status: 'sending',
        error: null,
        usage: null,
        usd: null,
        keyTail: null,
        finishReason: null,
        autoApply: null
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
export function failTurn(session: Session, localId: string, error: ChatError): Session {
  return mapTurn(
    session,
    (turn) => turn.localId === localId && isOpen(turn),
    (turn) => ({ ...turn, status: error.kind === 'cancelled' ? 'cancelled' : 'error', error })
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
export function applyChunk(session: Session, chunk: ChatChunk): Session {
  const matches = (turn: TurnView): boolean => turn.requestId === chunk.requestId && isOpen(turn)

  if (chunk.kind === 'delta') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      answer: turn.answer + chunk.text
    }))
  }
  if (chunk.kind === 'tool') {
    // Reading is progress, not an ending: the turn stays open and the step is appended in order.
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      tools: [...turn.tools, { name: chunk.name, detail: chunk.detail }]
    }))
  }
  if (chunk.kind === 'done') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'done',
      usage: chunk.usage,
      usd: chunk.usd,
      keyTail: chunk.keyTail,
      finishReason: chunk.finishReason ?? null,
      ...(chunk.proposal ? {
        proposalId: chunk.proposal.proposalId,
        partId: chunk.proposal.partId,
        proposalStatus: chunk.proposal.status,
        autoApply: turn.mode === 'ap_dung'
          ? chunk.proposal.status === 'applied' ? 'applied' : 'needs-review'
          : null
      } : {})
    }))
  }
  return mapTurn(session, matches, (turn) => ({
    ...turn,
    // Cancelling is a decision, not a failure: it reads differently and offers "ask again", not a
    // retry of something that broke.
    status: chunk.error.kind === 'cancelled' ? 'cancelled' : 'error',
    error: chunk.error
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
 * The replacement a turn offers, or null when it offers none.
 *
 * Null for every status but `done`, and that is the rule that matters: a cancelled or failed answer is
 * a **truncated** one, and applying a truncated rewrite silently shortens the user's paragraph. Also
 * null when the model ignored the fence — see `extractFence`; the panel then falls back to reading the
 * answer as a plain reply instead of guessing which part was the proposal.
 */
export function proposalOf(turn: TurnView): string | null {
  if (turn.mode === 'hoi' || turn.status !== 'done' || turn.range === null) return null
  if (turn.finishReason !== 'stop') return null
  return extractFence(turn.answer)
}

export function markAutoApply(
  session: Session,
  localId: string,
  outcome: 'applied' | 'needs-review'
): Session {
  return mapTurn(session, (turn) => turn.localId === localId, (turn) => ({ ...turn, autoApply: outcome }))
}

export function markTurnProposal(
  session: Session,
  localId: string,
  proposal: { proposalId: string; partId: string; status: TurnView['proposalStatus'] }
): Session {
  return mapTurn(session, (turn) => turn.localId === localId, (turn) => ({
    ...turn, proposalId: proposal.proposalId, partId: proposal.partId,
    proposalStatus: proposal.status,
    autoApply: turn.mode === 'ap_dung'
      ? proposal.status === 'applied' ? 'applied' : 'needs-review'
      : null
  }))
}

/**
 * Which finished writing turns should open their proposal in the translation pane right now.
 *
 * The answer to a writing turn belongs in the editor, but only for a turn the translator just watched
 * run: `watched` holds the turns seen open in this panel, so a session restored from history — every
 * turn already `done` — never opens an old proposal over the text being read. A turn stays watched
 * until its proposal shows up in the queue (`partStatus` is undefined until then), and is dropped as
 * soon as it can no longer be shown: it failed, it made no proposal, it belongs to another chapter, or
 * the proposal is no longer pending.
 */
export function revealStep(
  turns: TurnView[],
  watched: ReadonlySet<string>,
  chapterId: string,
  partStatus: (partId: string) => TurnView['proposalStatus']
): { watched: Set<string>; reveal: string[] } {
  const next = new Set(watched)
  const reveal: string[] = []
  for (const turn of turns) {
    if (turn.mode !== 'sua') continue
    if (isOpen(turn)) {
      next.add(turn.localId)
      continue
    }
    if (!next.has(turn.localId)) continue
    if (turn.status !== 'done' || turn.partId === undefined || turn.chapterId !== chapterId) {
      next.delete(turn.localId)
      continue
    }
    const status = partStatus(turn.partId)
    if (status === undefined) continue
    next.delete(turn.localId)
    if (status === 'pending') reveal.push(turn.partId)
  }
  return { watched: next, reveal }
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
