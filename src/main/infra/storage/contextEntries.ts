import { randomUUID } from 'node:crypto'
import type {
  ContextEntryItem,
  ContextKind,
  ContextOrigin,
  ContextStatus
} from '../../../shared/contracts/glossary'
import { StorageError } from './errors'
import type { Db } from './sqlite'

interface ContextEntryRow {
  id: string
  kind: ContextKind
  source: string
  target: string
  status: ContextStatus
  origin: ContextOrigin
  forbidden: number
  from_chapter_id: string | null
  to_chapter_id: string | null
  notes: string | null
  created_at: number
  updated_at: number
}

interface AliasRow {
  entry_id: string
  form: string
}

function touchWork(db: Db, now: number): void {
  db.prepare('UPDATE work SET updated_at = ?').run(now)
}

function toItem(row: ContextEntryRow, aliases: string[] = []): ContextEntryItem {
  return {
    id: row.id,
    kind: row.kind,
    source: row.source,
    target: row.target,
    status: row.status,
    origin: row.origin,
    forbidden: row.forbidden === 1,
    fromChapterId: row.from_chapter_id,
    toChapterId: row.to_chapter_id,
    notes: row.notes,
    aliases,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function validateChapters(
  db: Db,
  fromChapterId: string | null | undefined,
  toChapterId: string | null | undefined
): void {
  let fromPos: number | null = null
  let toPos: number | null = null

  if (fromChapterId) {
    const fromChap = db
      .prepare('SELECT position FROM chapter WHERE id = ?')
      .get<{ position: number }>(fromChapterId)
    if (!fromChap) {
      throw new StorageError('not_found', 'Không tìm thấy chương bắt đầu.')
    }
    fromPos = fromChap.position
  }

  if (toChapterId) {
    const toChap = db
      .prepare('SELECT position FROM chapter WHERE id = ?')
      .get<{ position: number }>(toChapterId)
    if (!toChap) {
      throw new StorageError('not_found', 'Không tìm thấy chương kết thúc.')
    }
    toPos = toChap.position
  }

  if (fromPos !== null && toPos !== null && fromPos > toPos) {
    throw new StorageError('validation', 'Chương bắt đầu phải đứng trước hoặc bằng chương kết thúc.')
  }
}

function checkUniqueness(
  db: Db,
  source: string,
  aliases: string[],
  excludeEntryId?: string
): void {
  const trimmedSource = source.trim()
  const trimmedAliases = aliases.map((a) => a.trim())

  // Check intra-input uniqueness
  for (const alias of trimmedAliases) {
    if (alias.toLowerCase() === trimmedSource.toLowerCase()) {
      throw new StorageError(
        'conflict',
        `Dạng viết khác không được trùng với từ gốc: "${trimmedSource}"`
      )
    }
  }

  const aliasSet = new Set<string>()
  for (const alias of trimmedAliases) {
    const lower = alias.toLowerCase()
    if (aliasSet.has(lower)) {
      throw new StorageError(
        'conflict',
        `Dạng viết khác bị trùng lặp trong danh sách: "${alias}"`
      )
    }
    aliasSet.add(lower)
  }

  // Check cross-database collisions
  const candidates = [trimmedSource, ...trimmedAliases]
  for (const candidate of candidates) {
    // Check if exists as context_entry source
    const existingEntry = db
      .prepare(
        excludeEntryId
          ? 'SELECT source FROM context_entry WHERE lower(source) = lower(?) AND id != ? LIMIT 1'
          : 'SELECT source FROM context_entry WHERE lower(source) = lower(?) LIMIT 1'
      )
      .get<{ source: string }>(candidate, ...(excludeEntryId ? [excludeEntryId] : []))

    if (existingEntry) {
      throw new StorageError(
        'conflict',
        `Thuật ngữ "${candidate}" đã tồn tại trong từ điển.`
      )
    }

    // Check if exists as context_alias form
    const existingAlias = db
      .prepare(
        excludeEntryId
          ? 'SELECT form FROM context_alias WHERE lower(form) = lower(?) AND entry_id != ? LIMIT 1'
          : 'SELECT form FROM context_alias WHERE lower(form) = lower(?) LIMIT 1'
      )
      .get<{ form: string }>(candidate, ...(excludeEntryId ? [excludeEntryId] : []))

    if (existingAlias) {
      throw new StorageError(
        'conflict',
        `Dạng viết khác "${candidate}" đã được sử dụng trong từ điển.`
      )
    }
  }
}

export function getContextEntry(db: Db, id: string): ContextEntryItem | null {
  const row = db.prepare('SELECT * FROM context_entry WHERE id = ?').get<ContextEntryRow>(id)
  if (!row) return null

  const aliasRows = db
    .prepare('SELECT form FROM context_alias WHERE entry_id = ? ORDER BY form ASC')
    .all<{ form: string }>(id)

  return toItem(row, aliasRows.map((a) => a.form))
}

export interface ListContextOptions {
  kind?: ContextKind
  status?: ContextStatus
  query?: string
  chapterId?: string
}

export function listContextEntries(
  db: Db,
  options: ListContextOptions = {}
): ContextEntryItem[] {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options.kind) {
    conditions.push('e.kind = ?')
    params.push(options.kind)
  }

  if (options.status) {
    conditions.push('e.status = ?')
    params.push(options.status)
  }

  if (options.chapterId) {
    const targetChap = db
      .prepare('SELECT position FROM chapter WHERE id = ?')
      .get<{ position: number }>(options.chapterId)
    if (!targetChap) throw new StorageError('not_found', 'Không tìm thấy chương.')

    conditions.push(
      '(e.from_chapter_id IS NULL OR fc.position IS NULL OR fc.position <= ?)'
    )
    params.push(targetChap.position)

    conditions.push(
      '(e.to_chapter_id IS NULL OR tc.position IS NULL OR tc.position >= ?)'
    )
    params.push(targetChap.position)
  }

  if (options.query && options.query.trim().length > 0) {
    const q = `%${options.query.trim()}%`
    conditions.push(
      '(e.source LIKE ? OR e.target LIKE ? OR e.notes LIKE ? OR EXISTS (SELECT 1 FROM context_alias a WHERE a.entry_id = e.id AND a.form LIKE ?))'
    )
    params.push(q, q, q, q)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sql = `
    SELECT e.*
    FROM context_entry e
    LEFT JOIN chapter fc ON fc.id = e.from_chapter_id
    LEFT JOIN chapter tc ON tc.id = e.to_chapter_id
    ${whereClause}
    ORDER BY e.created_at DESC, e.source ASC
  `

  const rows = db.prepare(sql).all<ContextEntryRow>(...params)
  if (rows.length === 0) return []

  const aliases = db
    .prepare('SELECT entry_id, form FROM context_alias ORDER BY form ASC')
    .all<AliasRow>()
  const aliasMap = new Map<string, string[]>()
  for (const alias of aliases) {
    const list = aliasMap.get(alias.entry_id) ?? []
    list.push(alias.form)
    aliasMap.set(alias.entry_id, list)
  }

  return rows.map((r) => toItem(r, aliasMap.get(r.id) ?? []))
}

export function getEffectiveGlossary(
  db: Db,
  chapterId: string,
  options: { approvedOnly?: boolean } = {}
): ContextEntryItem[] {
  const targetChap = db
    .prepare('SELECT position FROM chapter WHERE id = ?')
    .get<{ position: number }>(chapterId)
  if (!targetChap) throw new StorageError('not_found', 'Không tìm thấy chương.')

  const approvedOnly = options.approvedOnly ?? true
  const params: (string | number)[] = [targetChap.position, targetChap.position]

  let sql = `
    SELECT e.*
    FROM context_entry e
    LEFT JOIN chapter fc ON fc.id = e.from_chapter_id
    LEFT JOIN chapter tc ON tc.id = e.to_chapter_id
    WHERE e.kind = 'term'
      AND (e.from_chapter_id IS NULL OR fc.position IS NULL OR fc.position <= ?)
      AND (e.to_chapter_id IS NULL OR tc.position IS NULL OR tc.position >= ?)
  `

  if (approvedOnly) {
    sql += " AND e.status = 'approved'"
  }

  sql += ' ORDER BY length(e.source) DESC, e.source ASC'

  const rows = db.prepare(sql).all<ContextEntryRow>(...params)
  if (rows.length === 0) return []

  const aliases = db
    .prepare('SELECT entry_id, form FROM context_alias ORDER BY form ASC')
    .all<AliasRow>()
  const aliasMap = new Map<string, string[]>()
  for (const alias of aliases) {
    const list = aliasMap.get(alias.entry_id) ?? []
    list.push(alias.form)
    aliasMap.set(alias.entry_id, list)
  }

  return rows.map((r) => toItem(r, aliasMap.get(r.id) ?? []))
}

export interface CreateContextEntryParams {
  id?: string
  kind?: ContextKind
  source: string
  target: string
  status?: ContextStatus
  origin?: ContextOrigin
  forbidden?: boolean
  fromChapterId?: string | null
  toChapterId?: string | null
  notes?: string | null
  aliases?: string[]
  now?: number
}

export function createContextEntry(
  db: Db,
  params: CreateContextEntryParams
): ContextEntryItem {
  return db.transaction(() => {
    const id = params.id ?? randomUUID()
    const kind = params.kind ?? 'term'
    const source = params.source.trim()
    const target = params.target.trim()
    const status = params.status ?? 'approved'
    const origin = params.origin ?? 'user'
    const forbidden = params.forbidden ? 1 : 0
    const fromChapterId = params.fromChapterId ?? null
    const toChapterId = params.toChapterId ?? null
    const notes = params.notes?.trim() || null
    const aliases = (params.aliases ?? [])
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
      .sort((a, b) => a.localeCompare(b))
    const now = params.now ?? Date.now()

    validateChapters(db, fromChapterId, toChapterId)
    checkUniqueness(db, source, aliases)

    db.prepare(`
      INSERT INTO context_entry (
        id, kind, source, target, status, origin, forbidden,
        from_chapter_id, to_chapter_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      kind,
      source,
      target,
      status,
      origin,
      forbidden,
      fromChapterId,
      toChapterId,
      notes,
      now,
      now
    )

    const insertAlias = db.prepare(`
      INSERT INTO context_alias (id, entry_id, form, created_at)
      VALUES (?, ?, ?, ?)
    `)
    for (const form of aliases) {
      insertAlias.run(randomUUID(), id, form, now)
    }

    touchWork(db, now)

    return {
      id,
      kind,
      source,
      target,
      status,
      origin,
      forbidden: forbidden === 1,
      fromChapterId,
      toChapterId,
      notes,
      aliases,
      createdAt: now,
      updatedAt: now
    }
  })
}

export interface UpdateContextEntryParams {
  source?: string
  target?: string
  status?: ContextStatus
  origin?: ContextOrigin
  forbidden?: boolean
  fromChapterId?: string | null
  toChapterId?: string | null
  notes?: string | null
  aliases?: string[]
  now?: number
}

export function updateContextEntry(
  db: Db,
  id: string,
  params: UpdateContextEntryParams
): ContextEntryItem {
  return db.transaction(() => {
    const current = getContextEntry(db, id)
    if (!current) {
      throw new StorageError('not_found', 'Không tìm thấy mục thuật ngữ.')
    }

    const now = params.now ?? Date.now()
    const nextSource = params.source !== undefined ? params.source.trim() : current.source
    const nextTarget = params.target !== undefined ? params.target.trim() : current.target
    const nextStatus = params.status ?? current.status
    const nextOrigin = params.origin ?? current.origin
    const nextForbidden = params.forbidden !== undefined ? params.forbidden : current.forbidden
    const nextFromChapterId =
      params.fromChapterId !== undefined ? params.fromChapterId : current.fromChapterId
    const nextToChapterId =
      params.toChapterId !== undefined ? params.toChapterId : current.toChapterId
    const nextNotes =
      params.notes !== undefined ? (params.notes?.trim() || null) : current.notes
    const nextAliases =
      params.aliases !== undefined
        ? params.aliases
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
            .sort((a, b) => a.localeCompare(b))
        : current.aliases

    validateChapters(db, nextFromChapterId, nextToChapterId)

    const sourceChanged = nextSource.toLowerCase() !== current.source.toLowerCase()
    const aliasesChanged =
      nextAliases.length !== current.aliases.length ||
      nextAliases.some((a, i) => a.toLowerCase() !== (current.aliases[i]?.toLowerCase() ?? ''))

    if (sourceChanged || aliasesChanged) {
      checkUniqueness(db, nextSource, nextAliases, id)
    }

    db.prepare(`
      UPDATE context_entry
      SET source = ?, target = ?, status = ?, origin = ?, forbidden = ?,
          from_chapter_id = ?, to_chapter_id = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      nextSource,
      nextTarget,
      nextStatus,
      nextOrigin,
      nextForbidden ? 1 : 0,
      nextFromChapterId,
      nextToChapterId,
      nextNotes,
      now,
      id
    )

    if (params.aliases !== undefined) {
      db.prepare('DELETE FROM context_alias WHERE entry_id = ?').run(id)
      const insertAlias = db.prepare(`
        INSERT INTO context_alias (id, entry_id, form, created_at)
        VALUES (?, ?, ?, ?)
      `)
      for (const form of nextAliases) {
        insertAlias.run(randomUUID(), id, form, now)
      }
    }

    touchWork(db, now)

    return {
      id,
      kind: current.kind,
      source: nextSource,
      target: nextTarget,
      status: nextStatus,
      origin: nextOrigin,
      forbidden: nextForbidden,
      fromChapterId: nextFromChapterId,
      toChapterId: nextToChapterId,
      notes: nextNotes,
      aliases: nextAliases,
      createdAt: current.createdAt,
      updatedAt: now
    }
  })
}

export function deleteContextEntry(db: Db, id: string, now?: number): void {
  db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM context_entry WHERE id = ?')
      .get<{ id: string }>(id)
    if (!existing) {
      throw new StorageError('not_found', 'Không tìm thấy mục thuật ngữ.')
    }

    db.prepare('DELETE FROM context_entry WHERE id = ?').run(id)
    touchWork(db, now ?? Date.now())
  })
}
