import type {
  ChatAction,
  ChatContextBlock,
  ChatFinishReason,
  ChatLocation,
  ChatRange,
  ChatToolStep,
  ChatUsage
} from '../../../shared/contracts/aiChat'
import { StorageError } from './errors'
import type { Db } from './sqlite'

export type StoredTurnStatus =
  | 'sending'
  | 'running'
  | 'done'
  | 'cancelled'
  | 'error'
  | 'interrupted'

export interface StoredSession {
  id: string
  title: string
  lastChapterId: string | null
  createdAt: number
  updatedAt: number
}

export interface StoredTurn {
  id: string
  sessionId: string
  chapterId: string | null
  action: ChatAction
  question: string
  answer: string
  reasoning: string
  status: StoredTurnStatus
  context: ChatContextBlock[]
  range: ChatRange | null
  location: ChatLocation | null
  tools: ChatToolStep[]
  droppedTurns: number
  provider: string | null
  model: string | null
  usage: ChatUsage | null
  costUsd: number | null
  finishReason: ChatFinishReason | null
  createdAt: number
  updatedAt: number
}

interface SessionRow {
  id: string
  title: string
  last_chapter_id: string | null
  created_at: number
  updated_at: number
}

interface TurnRow {
  id: string
  session_id: string
  chapter_id: string | null
  action: ChatAction
  question: string
  answer: string
  reasoning: string
  status: StoredTurnStatus
  context_json: string
  target_range_json: string | null
  location_json: string | null
  tools_json: string
  dropped_turns: number
  provider: string | null
  model: string | null
  usage_json: string | null
  cost_usd: number | null
  finish_reason: ChatFinishReason | null
  created_at: number
  updated_at: number
}

const sessionOf = (row: SessionRow): StoredSession => ({
  id: row.id,
  title: row.title,
  lastChapterId: row.last_chapter_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const turnOf = (row: TurnRow): StoredTurn => ({
  id: row.id,
  sessionId: row.session_id,
  chapterId: row.chapter_id,
  action: row.action,
  question: row.question,
  answer: row.answer,
  reasoning: row.reasoning,
  status: row.status,
  context: JSON.parse(row.context_json) as ChatContextBlock[],
  range: row.target_range_json === null ? null : (JSON.parse(row.target_range_json) as ChatRange),
  location: row.location_json === null ? null : (JSON.parse(row.location_json) as ChatLocation),
  tools: JSON.parse(row.tools_json) as StoredTurn['tools'],
  droppedTurns: row.dropped_turns,
  provider: row.provider,
  model: row.model,
  usage: row.usage_json === null ? null : (JSON.parse(row.usage_json) as ChatUsage),
  costUsd: row.cost_usd,
  finishReason: row.finish_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export function createAiSession(db: Db, id: string, title: string, now: number): StoredSession {
  db.prepare('INSERT INTO ai_session (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    id,
    title,
    now,
    now
  )
  return getAiSession(db, id)
}

export function getAiSession(db: Db, id: string): StoredSession {
  const row = db.prepare('SELECT * FROM ai_session WHERE id = ?').get<SessionRow>(id)
  if (!row) throw new StorageError('not_found', 'Không tìm thấy phiên AI.')
  return sessionOf(row)
}

/** A cursor is the last pair from the preceding page; identical timestamps sort by id. */
export function listAiSessions(
  db: Db,
  limit: number,
  before?: { updatedAt: number; id: string }
): StoredSession[] {
  return db
    .prepare(
      `SELECT * FROM ai_session
    WHERE (? IS NULL OR updated_at < ? OR (updated_at = ? AND id < ?))
    ORDER BY updated_at DESC, id DESC LIMIT ?`
    )
    .all<SessionRow>(
      before?.updatedAt ?? null,
      before?.updatedAt ?? null,
      before?.updatedAt ?? null,
      before?.id ?? null,
      limit
    )
    .map(sessionOf)
}

export interface StartTurnInput {
  id: string
  sessionId: string
  chapterId: string
  action: ChatAction
  question: string
  /** Only old turns sent context along; a `chat` turn sends none. */
  context?: ChatContextBlock[]
  range?: ChatRange | null
  location?: ChatLocation | null
  droppedTurns: number
  provider: string | null
  model: string | null
  now: number
}

export function startAiTurn(db: Db, input: StartTurnInput): StoredTurn {
  getAiSession(db, input.sessionId)
  const chapter = db.prepare('SELECT 1 AS found FROM chapter WHERE id = ?').get(input.chapterId)
  if (!chapter) throw new StorageError('not_found', 'Không tìm thấy chương.')
  db.transaction(() => {
    db.prepare(
      `INSERT INTO ai_turn
      (id, session_id, chapter_id, action, question, status, context_json, target_range_json, location_json,
       dropped_turns, provider, model, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'sending', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.id,
      input.sessionId,
      input.chapterId,
      input.action,
      input.question,
      JSON.stringify(input.context ?? []),
      input.range ? JSON.stringify(input.range) : null,
      input.location ? JSON.stringify(input.location) : null,
      input.droppedTurns,
      input.provider,
      input.model,
      input.now,
      input.now
    )
    db.prepare('UPDATE ai_session SET last_chapter_id = ?, updated_at = ? WHERE id = ?').run(
      input.chapterId,
      input.now,
      input.sessionId
    )
  })
  return getAiTurn(db, input.id)
}

export function getAiTurn(db: Db, id: string): StoredTurn {
  const row = db.prepare('SELECT * FROM ai_turn WHERE id = ?').get<TurnRow>(id)
  if (!row) throw new StorageError('not_found', 'Không tìm thấy lượt AI.')
  return turnOf(row)
}

export function listAiTurns(
  db: Db,
  sessionId: string,
  limit: number,
  before?: { createdAt: number; id: string }
): StoredTurn[] {
  getAiSession(db, sessionId)
  return db
    .prepare(
      `SELECT * FROM ai_turn WHERE session_id = ?
    AND (? IS NULL OR created_at < ? OR (created_at = ? AND id < ?))
    ORDER BY created_at DESC, id DESC LIMIT ?`
    )
    .all<TurnRow>(
      sessionId,
      before?.createdAt ?? null,
      before?.createdAt ?? null,
      before?.createdAt ?? null,
      before?.id ?? null,
      limit
    )
    .map(turnOf)
}

export function updateAiTurn(
  db: Db,
  id: string,
  patch: Partial<
    Pick<
      StoredTurn,
      | 'answer'
      | 'reasoning'
      | 'status'
      | 'tools'
      | 'usage'
      | 'costUsd'
      | 'finishReason'
      | 'provider'
      | 'model'
    >
  >,
  now: number
): StoredTurn {
  const previous = getAiTurn(db, id)
  const next = { ...previous, ...patch }
  db.prepare(
    `UPDATE ai_turn SET answer = ?, reasoning = ?, status = ?, tools_json = ?, usage_json = ?,
    cost_usd = ?, finish_reason = ?, provider = ?, model = ?, updated_at = ? WHERE id = ?`
  ).run(
    next.answer,
    next.reasoning,
    next.status,
    JSON.stringify(next.tools),
    next.usage === null ? null : JSON.stringify(next.usage),
    next.costUsd,
    next.finishReason,
    next.provider,
    next.model,
    now,
    id
  )
  db.prepare('UPDATE ai_session SET updated_at = ? WHERE id = ?').run(now, previous.sessionId)
  return getAiTurn(db, id)
}

/** Run once on startup, before requests are accepted. A partial answer remains readable. */
export function interruptAiTurns(db: Db, now: number): number {
  return db
    .prepare(
      `UPDATE ai_turn SET status = 'interrupted', updated_at = ?
    WHERE status IN ('sending', 'running')`
    )
    .run(now).changes
}
