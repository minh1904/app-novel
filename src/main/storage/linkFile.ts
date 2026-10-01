import { StorageError } from './errors'
import type { Db } from './sqlite'

/**
 * Links between segments (n:m) and where each translated segment came from. These are repository
 * functions with tests; no IPC channel exposes them yet (the editor and translation jobs will).
 */

export type LinkKind = 'ai' | 'user'
export type LinkStatus = 'ok' | 'needs_review' | 'broken'

export interface LinkInput {
  kind: LinkKind
  confidence?: number | null
  status?: LinkStatus
  /** Segment ids, at least one from each side. Their order is kept. */
  members: string[]
}

export interface LinkRecord {
  id: string
  chapterId: string
  kind: LinkKind
  confidence: number | null
  status: LinkStatus
  members: string[]
  createdAt: number
}

export type ProvenanceOrigin = 'human' | 'ai' | 'mock' | 'import'

export interface ProvenanceRecord {
  segmentId: string
  origin: ProvenanceOrigin
  provider: string | null
  model: string | null
  at: number
}

interface LinkRow {
  id: string
  chapter_id: string
  kind: LinkKind
  confidence: number | null
  status: LinkStatus
  created_at: number
}

export function createLink(
  db: Db,
  chapterId: string,
  input: LinkInput,
  now: number,
  id: string
): LinkRecord {
  if (new Set(input.members).size !== input.members.length) {
    throw new StorageError('validation', 'Liên kết có segment bị lặp.')
  }
  const sides = new Set<string>()
  for (const memberId of input.members) {
    const row = db
      .prepare('SELECT side FROM segment WHERE id = ? AND chapter_id = ?')
      .get<{ side: string }>(memberId, chapterId)
    if (!row)
      throw new StorageError('validation', 'Segment ' + memberId + ' không thuộc chương này.')
    sides.add(row.side)
  }
  if (!sides.has('source') || !sides.has('target')) {
    throw new StorageError(
      'validation',
      'Liên kết cần ít nhất một segment nguồn và một segment dịch.'
    )
  }
  if (input.confidence != null && (input.confidence < 0 || input.confidence > 1)) {
    throw new StorageError('validation', 'Mức tin cậy phải từ 0 tới 1.')
  }

  db.prepare(
    `INSERT INTO link (id, chapter_id, kind, confidence, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, chapterId, input.kind, input.confidence ?? null, input.status ?? 'ok', now)
  input.members.forEach((memberId, position) => {
    db.prepare('INSERT INTO link_member (link_id, segment_id, position) VALUES (?, ?, ?)').run(
      id,
      memberId,
      position
    )
  })
  return listLinks(db, chapterId).find((link) => link.id === id)!
}

export function listLinks(db: Db, chapterId: string): LinkRecord[] {
  const rows = db
    .prepare(
      `SELECT id, chapter_id, kind, confidence, status, created_at FROM link
       WHERE chapter_id = ? ORDER BY created_at, id`
    )
    .all<LinkRow>(chapterId)
  return rows.map((row) => ({
    id: row.id,
    chapterId: row.chapter_id,
    kind: row.kind,
    confidence: row.confidence,
    status: row.status,
    members: db
      .prepare('SELECT segment_id FROM link_member WHERE link_id = ? ORDER BY position')
      .all<{ segment_id: string }>(row.id)
      .map((member) => member.segment_id),
    createdAt: row.created_at
  }))
}

/** Records where a segment's text came from; a later call replaces the earlier record. */
export function setProvenance(db: Db, record: ProvenanceRecord): void {
  const exists = db
    .prepare('SELECT 1 AS found FROM segment WHERE id = ?')
    .get<{ found: number }>(record.segmentId)
  if (!exists) throw new StorageError('not_found', 'Không tìm thấy segment.')
  db.prepare(
    `INSERT INTO provenance (segment_id, origin, provider, model, at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (segment_id) DO UPDATE SET
       origin = excluded.origin, provider = excluded.provider, model = excluded.model, at = excluded.at`
  ).run(record.segmentId, record.origin, record.provider, record.model, record.at)
}

export function getProvenance(db: Db, segmentId: string): ProvenanceRecord | null {
  const row = db
    .prepare('SELECT segment_id, origin, provider, model, at FROM provenance WHERE segment_id = ?')
    .get<{
      segment_id: string
      origin: ProvenanceOrigin
      provider: string | null
      model: string | null
      at: number
    }>(segmentId)
  return row
    ? {
        segmentId: row.segment_id,
        origin: row.origin,
        provider: row.provider,
        model: row.model,
        at: row.at
      }
    : null
}
