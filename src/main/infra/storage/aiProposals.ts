import { StorageError } from './errors'
import type { Db } from './sqlite'

export type ProposalPolicy = 'review' | 'auto'
export type ProposalPartStatus = 'pending' | 'applied' | 'rejected' | 'conflict' | 'stale' | 'needs-placement'

export interface StoredProposalPart {
  id: string
  proposalId: string
  ordinal: number
  baseFrom: number | null
  baseTo: number | null
  beforeText: string
  afterText: string
  sourceOrder: number | null
  sourceText: string | null
  status: ProposalPartStatus
  decisionActor: 'user' | 'auto' | null
  decisionAt: number | null
  reason: string | null
  batchKey: string | null
}

export interface StoredProposal {
  id: string
  chapterId: string
  sessionId: string | null
  turnId: string | null
  origin: 'chat' | 'translate'
  policy: ProposalPolicy
  sourceRev: number
  sourceHash: string
  targetBaseRev: number
  targetBaseContent: string
  context: unknown[]
  contextHash: string | null
  provider: string | null
  model: string | null
  usage: unknown | null
  runKey: string | null
  createdAt: number
  updatedAt: number
  parts: StoredProposalPart[]
}

interface ProposalRow {
  id: string
  chapter_id: string
  session_id: string | null
  turn_id: string | null
  origin: StoredProposal['origin']
  policy: ProposalPolicy
  source_rev: number
  source_hash: string
  target_base_rev: number
  target_base_content: string
  context_json: string
  context_hash: string | null
  provider: string | null
  model: string | null
  usage_json: string | null
  run_key: string | null
  created_at: number
  updated_at: number
}

interface PartRow {
  id: string
  proposal_id: string
  ordinal: number
  base_from: number | null
  base_to: number | null
  before_text: string
  after_text: string
  source_order: number | null
  source_text: string | null
  status: ProposalPartStatus
  decision_actor: 'user' | 'auto' | null
  decision_at: number | null
  reason: string | null
  batch_key: string | null
}

const partOf = (row: PartRow): StoredProposalPart => ({
  id: row.id,
  proposalId: row.proposal_id,
  ordinal: row.ordinal,
  baseFrom: row.base_from,
  baseTo: row.base_to,
  beforeText: row.before_text,
  afterText: row.after_text,
  sourceOrder: row.source_order,
  sourceText: row.source_text,
  status: row.status,
  decisionActor: row.decision_actor,
  decisionAt: row.decision_at,
  reason: row.reason,
  batchKey: row.batch_key
})

function proposalOf(db: Db, row: ProposalRow): StoredProposal {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    origin: row.origin,
    policy: row.policy,
    sourceRev: row.source_rev,
    sourceHash: row.source_hash,
    targetBaseRev: row.target_base_rev,
    targetBaseContent: row.target_base_content,
    context: JSON.parse(row.context_json) as unknown[],
    contextHash: row.context_hash,
    provider: row.provider,
    model: row.model,
    usage: row.usage_json === null ? null : (JSON.parse(row.usage_json) as unknown),
    runKey: row.run_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parts: db.prepare('SELECT * FROM proposal_part WHERE proposal_id = ? ORDER BY ordinal')
      .all<PartRow>(row.id).map(partOf)
  }
}

export function getProposal(db: Db, id: string): StoredProposal {
  const row = db.prepare('SELECT * FROM proposal WHERE id = ?').get<ProposalRow>(id)
  if (!row) throw new StorageError('not_found', 'Không tìm thấy đề xuất.')
  return proposalOf(db, row)
}

export interface CreateProposalInput {
  id: string
  chapterId: string
  sessionId?: string | null
  turnId?: string | null
  origin: StoredProposal['origin']
  policy: ProposalPolicy
  sourceRev: number
  sourceHash: string
  targetBaseRev: number
  targetBaseContent: string
  context?: unknown[]
  contextHash?: string | null
  provider?: string | null
  model?: string | null
  usage?: unknown | null
  runKey?: string | null
  now: number
  parts: Array<{
    id: string
    baseFrom: number | null
    baseTo: number | null
    beforeText: string
    afterText: string
    sourceOrder?: number | null
    sourceText?: string | null
    batchKey?: string | null
    status?: ProposalPartStatus
  }>
}

export function createProposal(db: Db, input: CreateProposalInput): StoredProposal {
  if (input.runKey) {
    const existing = db.prepare('SELECT id FROM proposal WHERE run_key = ?')
      .get<{ id: string }>(input.runKey)
    if (existing) return getProposal(db, existing.id)
  }
  if (input.parts.length === 0) throw new StorageError('validation', 'Đề xuất phải có ít nhất một phần.')
  const chapter = db.prepare('SELECT 1 AS found FROM chapter WHERE id = ?').get(input.chapterId)
  if (!chapter) throw new StorageError('not_found', 'Không tìm thấy chương.')
  if (input.turnId) {
    const turn = db.prepare('SELECT session_id, chapter_id FROM ai_turn WHERE id = ?')
      .get<{ session_id: string; chapter_id: string | null }>(input.turnId)
    if (!turn || turn.chapter_id !== input.chapterId || turn.session_id !== input.sessionId) {
      throw new StorageError('validation', 'Lượt AI không thuộc phiên và chương của đề xuất.')
    }
  }
  db.transaction(() => {
    db.prepare(`INSERT INTO proposal (id, chapter_id, session_id, turn_id, origin, policy,
      source_rev, source_hash, target_base_rev, target_base_content, context_json, context_hash,
      provider, model, usage_json, run_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        input.id, input.chapterId, input.sessionId ?? null, input.turnId ?? null,
        input.origin, input.policy, input.sourceRev, input.sourceHash, input.targetBaseRev,
        input.targetBaseContent, JSON.stringify(input.context ?? []), input.contextHash ?? null,
        input.provider ?? null, input.model ?? null,
        input.usage == null ? null : JSON.stringify(input.usage), input.runKey ?? null,
        input.now, input.now
      )
    const insertPart = db.prepare(`INSERT INTO proposal_part
      (id, proposal_id, ordinal, base_from, base_to, before_text, after_text,
       source_order, source_text, status, batch_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    input.parts.forEach((part, ordinal) => {
      if ((part.baseFrom === null) !== (part.baseTo === null)) {
        throw new StorageError('validation', 'Vùng neo đề xuất không hợp lệ.')
      }
      insertPart.run(
        part.id, input.id, ordinal, part.baseFrom, part.baseTo, part.beforeText,
        part.afterText, part.sourceOrder ?? null, part.sourceText ?? null,
        part.status ?? 'pending', part.batchKey ?? null
      )
    })
  })
  return getProposal(db, input.id)
}

/** Append a completed translation batch. A repeated batch key returns its original part. */
export function appendProposalParts(
  db: Db,
  proposalId: string,
  parts: CreateProposalInput['parts'],
  now: number
): StoredProposal {
  return db.transaction(() => {
    const proposal = getProposal(db, proposalId)
    const insert = db.prepare(`INSERT INTO proposal_part
      (id, proposal_id, ordinal, base_from, base_to, before_text, after_text,
       source_order, source_text, status, batch_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    let ordinal = proposal.parts.length
    for (const part of parts) {
      if (part.batchKey && db.prepare('SELECT 1 FROM proposal_part WHERE batch_key = ?').get(part.batchKey)) continue
      if ((part.baseFrom === null) !== (part.baseTo === null)) {
        throw new StorageError('validation', 'Vùng neo đề xuất không hợp lệ.')
      }
      insert.run(part.id, proposalId, ordinal++, part.baseFrom, part.baseTo,
        part.beforeText, part.afterText, part.sourceOrder ?? null,
        part.sourceText ?? null, part.status ?? 'pending', part.batchKey ?? null)
    }
    db.prepare('UPDATE proposal SET updated_at = ? WHERE id = ?').run(now, proposalId)
    return getProposal(db, proposalId)
  })
}

export function listChapterProposals(db: Db, chapterId: string, limit: number): StoredProposal[] {
  return db.prepare('SELECT * FROM proposal WHERE chapter_id = ? ORDER BY created_at DESC, id DESC LIMIT ?')
    .all<ProposalRow>(chapterId, limit).map((row) => proposalOf(db, row))
}

export function pendingCountByChapter(db: Db): Array<{ chapterId: string; count: number }> {
  return db.prepare(`SELECT p.chapter_id AS chapterId, count(*) AS count
    FROM proposal_part pp JOIN proposal p ON p.id = pp.proposal_id
    WHERE pp.status IN ('pending', 'conflict', 'stale', 'needs-placement')
    GROUP BY p.chapter_id`).all<{ chapterId: string; count: number }>()
}

export function setProposalPartDecision(
  db: Db,
  partId: string,
  status: ProposalPartStatus,
  actor: 'user' | 'auto' | null,
  reason: string | null,
  now: number
): StoredProposalPart {
  const part = db.prepare('SELECT * FROM proposal_part WHERE id = ?').get<PartRow>(partId)
  if (!part) throw new StorageError('not_found', 'Không tìm thấy phần đề xuất.')
  db.prepare(`UPDATE proposal_part SET status = ?, decision_actor = ?, decision_at = ?, reason = ?
    WHERE id = ?`).run(status, actor, actor === null ? null : now, reason, partId)
  db.prepare('UPDATE proposal SET updated_at = ? WHERE id = ?').run(now, part.proposal_id)
  return partOf(db.prepare('SELECT * FROM proposal_part WHERE id = ?').get<PartRow>(partId)!)
}

export interface StoredTextSnapshot {
  id: string
  commandId: string
  chapterId: string
  beforeRev: number
  afterRev: number
  beforeContent: string
  decisions: unknown
  actor: 'user' | 'auto'
  createdAt: number
  undoneAt: number | null
}

interface SnapshotRow {
  id: string
  command_id: string
  chapter_id: string
  before_rev: number
  after_rev: number
  before_content: string
  decisions_json: string
  actor: 'user' | 'auto'
  created_at: number
  undone_at: number | null
}

const snapshotOf = (row: SnapshotRow): StoredTextSnapshot => ({
  id: row.id,
  commandId: row.command_id,
  chapterId: row.chapter_id,
  beforeRev: row.before_rev,
  afterRev: row.after_rev,
  beforeContent: row.before_content,
  decisions: JSON.parse(row.decisions_json) as unknown,
  actor: row.actor,
  createdAt: row.created_at,
  undoneAt: row.undone_at
})

export function getTextSnapshotByCommand(db: Db, commandId: string): StoredTextSnapshot | null {
  const row = db.prepare('SELECT * FROM text_snapshot WHERE command_id = ?')
    .get<SnapshotRow>(commandId)
  return row ? snapshotOf(row) : null
}

export function latestTextSnapshot(db: Db, chapterId: string): StoredTextSnapshot | null {
  const row = db.prepare('SELECT * FROM text_snapshot WHERE chapter_id = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .get<SnapshotRow>(chapterId)
  return row ? snapshotOf(row) : null
}

export function insertTextSnapshot(db: Db, snapshot: Omit<StoredTextSnapshot, 'undoneAt'>): void {
  db.prepare(`INSERT INTO text_snapshot (id, command_id, chapter_id, before_rev, after_rev,
    before_content, decisions_json, actor, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      snapshot.id, snapshot.commandId, snapshot.chapterId, snapshot.beforeRev,
      snapshot.afterRev, snapshot.beforeContent, JSON.stringify(snapshot.decisions),
      snapshot.actor, snapshot.createdAt
    )
}
