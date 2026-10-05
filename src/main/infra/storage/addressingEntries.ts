import { randomUUID } from 'node:crypto'
import type {
  AddressingDyadItem,
  AddressingDyadResolved,
  CharacterGender,
  CharacterItem
} from '../../../shared/contracts/addressing'
import type { ContextStatus } from '../../../shared/contracts/glossary'
import { StorageError } from './errors'
import type { Db, SqlValue } from './sqlite'

interface ContextEntryRow {
  id: string
  kind: string
  source: string
  target: string
  status: ContextStatus
  origin: string
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

interface CharacterMetadata {
  gender?: CharacterGender
  role?: string | null
  thirdPerson?: string | null
  userNotes?: string | null
}

interface DyadMetadata {
  speakerPronoun: string
  recipientPronoun: string
  secondPerson?: string | null
  formality?: string | null
  userNotes?: string | null
}

function touchWork(db: Db, now: number): void {
  db.prepare('UPDATE work SET updated_at = ?').run(now)
}

function parseCharacterNotes(notes: string | null): {
  gender: CharacterGender
  role: string | null
  thirdPerson: string | null
  userNotes: string | null
} {
  if (!notes) {
    return { gender: 'unknown', role: null, thirdPerson: null, userNotes: null }
  }
  try {
    const parsed = JSON.parse(notes) as CharacterMetadata
    return {
      gender: parsed.gender ?? 'unknown',
      role: parsed.role ?? null,
      thirdPerson: parsed.thirdPerson ?? null,
      userNotes: parsed.userNotes ?? null
    }
  } catch {
    return { gender: 'unknown', role: null, thirdPerson: null, userNotes: notes }
  }
}

function parseDyadNotes(notes: string | null): DyadMetadata {
  if (!notes) {
    return { speakerPronoun: '', recipientPronoun: '', formality: null, userNotes: null }
  }
  try {
    const parsed = JSON.parse(notes) as DyadMetadata
    return {
      speakerPronoun: parsed.speakerPronoun ?? '',
      recipientPronoun: parsed.recipientPronoun ?? '',
      secondPerson: parsed.secondPerson ?? null,
      formality: parsed.formality ?? null,
      userNotes: parsed.userNotes ?? null
    }
  } catch {
    return { speakerPronoun: '', recipientPronoun: '', formality: null, userNotes: notes }
  }
}

function toCharacterItem(row: ContextEntryRow, aliases: string[] = []): CharacterItem {
  const meta = parseCharacterNotes(row.notes)
  return {
    id: row.id,
    source: row.source,
    target: row.target,
    gender: meta.gender,
    role: meta.role,
    thirdPerson: meta.thirdPerson,
    status: row.status,
    notes: meta.userNotes,
    aliases,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toDyadItem(row: ContextEntryRow): AddressingDyadItem {
  const meta = parseDyadNotes(row.notes)
  return {
    id: row.id,
    sourceCharacterId: row.source,
    targetCharacterId: row.target,
    speakerPronoun: meta.speakerPronoun,
    recipientPronoun: meta.recipientPronoun,
    secondPerson: meta.secondPerson ?? null,
    formality: meta.formality ?? null,
    status: row.status,
    fromChapterId: row.from_chapter_id,
    toChapterId: row.to_chapter_id,
    notes: meta.userNotes ?? null,
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

// -------------------------------------------------------------
// Character Operations
// -------------------------------------------------------------

export function listCharacters(
  db: Db,
  options: {
    status?: ContextStatus
    query?: string
  } = {}
): CharacterItem[] {
  let sql = 'SELECT * FROM context_entry WHERE kind = \'character\''
  const params: SqlValue[] = []

  if (options.status) {
    sql += ' AND status = ?'
    params.push(options.status)
  }

  if (options.query) {
    const q = `%${options.query.toLowerCase()}%`
    sql += ` AND (
      lower(source) LIKE ? OR
      lower(target) LIKE ? OR
      id IN (SELECT entry_id FROM context_alias WHERE lower(form) LIKE ?)
    )`
    params.push(q, q, q)
  }

  sql += ' ORDER BY created_at ASC'
  const rows = db.prepare(sql).all<ContextEntryRow>(...params)
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const aliasRows = db
    .prepare(`SELECT entry_id, form FROM context_alias WHERE entry_id IN (${placeholders}) ORDER BY form ASC`)
    .all<AliasRow>(...ids)

  const aliasMap = new Map<string, string[]>()
  for (const a of aliasRows) {
    const list = aliasMap.get(a.entry_id) ?? []
    list.push(a.form)
    aliasMap.set(a.entry_id, list)
  }

  return rows.map((r) => toCharacterItem(r, aliasMap.get(r.id) ?? []))
}

export function getCharacter(db: Db, characterId: string): CharacterItem | null {
  const row = db
    .prepare('SELECT * FROM context_entry WHERE id = ? AND kind = \'character\'')
    .get<ContextEntryRow>(characterId)
  if (!row) return null

  const aliasRows = db
    .prepare('SELECT form FROM context_alias WHERE entry_id = ? ORDER BY form ASC')
    .all<{ form: string }>(characterId)
  const aliases = aliasRows.map((a) => a.form)

  return toCharacterItem(row, aliases)
}

export interface CreateCharacterParams {
  source: string
  target: string
  gender?: CharacterGender
  role?: string | null
  thirdPerson?: string | null
  status?: ContextStatus
  notes?: string | null
  aliases?: string[]
}

export function createCharacter(
  db: Db,
  params: CreateCharacterParams,
  now: number = Date.now()
): CharacterItem {
  const trimmedSource = params.source.trim()
  const trimmedTarget = params.target.trim()

  if (!trimmedSource || !trimmedTarget) {
    throw new StorageError('validation', 'Tên nhân vật không được để trống.')
  }

  const existing = db
    .prepare('SELECT id FROM context_entry WHERE kind = \'character\' AND lower(source) = lower(?)')
    .get<{ id: string }>(trimmedSource)
  if (existing) {
    throw new StorageError('conflict', `Nhân vật với tên gốc "${trimmedSource}" đã tồn tại.`)
  }

  const id = randomUUID()
  const meta: CharacterMetadata = {
    gender: params.gender ?? 'unknown',
    role: params.role?.trim() || null,
    thirdPerson: params.thirdPerson?.trim() || null,
    userNotes: params.notes?.trim() || null
  }
  const notesJson = JSON.stringify(meta)

  const aliases = (params.aliases ?? []).map((a) => a.trim()).filter(Boolean)

  db.transaction(() => {
    db.prepare(`
      INSERT INTO context_entry (
        id, kind, source, target, status, origin, forbidden,
        from_chapter_id, to_chapter_id, notes, created_at, updated_at
      ) VALUES (?, 'character', ?, ?, ?, 'user', 0, NULL, NULL, ?, ?, ?)
    `).run(
      id,
      trimmedSource,
      trimmedTarget,
      params.status ?? 'approved',
      notesJson,
      now,
      now
    )

    for (const alias of aliases) {
      db.prepare('INSERT INTO context_alias (entry_id, form, created_at) VALUES (?, ?, ?)').run(id, alias, now)
    }

    touchWork(db, now)
  })

  return getCharacter(db, id)!
}

export interface UpdateCharacterParams {
  source?: string
  target?: string
  gender?: CharacterGender
  role?: string | null
  thirdPerson?: string | null
  status?: ContextStatus
  notes?: string | null
  aliases?: string[]
}

export function updateCharacter(
  db: Db,
  characterId: string,
  params: UpdateCharacterParams,
  now: number = Date.now()
): CharacterItem {
  const current = getCharacter(db, characterId)
  if (!current) {
    throw new StorageError('not_found', 'Không tìm thấy nhân vật.')
  }

  const nextSource = params.source !== undefined ? params.source.trim() : current.source
  const nextTarget = params.target !== undefined ? params.target.trim() : current.target

  if (!nextSource || !nextTarget) {
    throw new StorageError('validation', 'Tên nhân vật không được để trống.')
  }

  if (nextSource.toLowerCase() !== current.source.toLowerCase()) {
    const existing = db
      .prepare('SELECT id FROM context_entry WHERE kind = \'character\' AND lower(source) = lower(?) AND id != ?')
      .get<{ id: string }>(nextSource, characterId)
    if (existing) {
      throw new StorageError('conflict', `Nhân vật với tên gốc "${nextSource}" đã tồn tại.`)
    }
  }

  const meta: CharacterMetadata = {
    gender: params.gender !== undefined ? params.gender : current.gender,
    role: params.role !== undefined ? params.role?.trim() || null : current.role,
    thirdPerson:
      params.thirdPerson !== undefined
        ? params.thirdPerson?.trim() || null
        : (current.thirdPerson ?? null),
    userNotes: params.notes !== undefined ? params.notes?.trim() || null : current.notes
  }
  const notesJson = JSON.stringify(meta)

  db.transaction(() => {
    db.prepare(`
      UPDATE context_entry
      SET source = ?, target = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ? AND kind = 'character'
    `).run(
      nextSource,
      nextTarget,
      params.status ?? current.status,
      notesJson,
      now,
      characterId
    )

    if (params.aliases !== undefined) {
      db.prepare('DELETE FROM context_alias WHERE entry_id = ?').run(characterId)
      const cleanAliases = params.aliases.map((a) => a.trim()).filter(Boolean)
      for (const a of cleanAliases) {
        db.prepare('INSERT INTO context_alias (entry_id, form, created_at) VALUES (?, ?, ?)').run(characterId, a, now)
      }
    }

    touchWork(db, now)
  })

  return getCharacter(db, characterId)!
}

export function deleteCharacter(db: Db, characterId: string, now: number = Date.now()): void {
  const current = getCharacter(db, characterId)
  if (!current) {
    throw new StorageError('not_found', 'Không tìm thấy nhân vật.')
  }

  db.transaction(() => {
    // Delete aliases
    db.prepare('DELETE FROM context_alias WHERE entry_id = ?').run(characterId)
    // Delete dyads referencing this character
    db.prepare('DELETE FROM context_entry WHERE kind = \'dyad\' AND (source = ? OR target = ?)').run(characterId, characterId)
    // Delete character entry
    db.prepare('DELETE FROM context_entry WHERE id = ? AND kind = \'character\'').run(characterId)

    touchWork(db, now)
  })
}

// -------------------------------------------------------------
// Dyad Operations
// -------------------------------------------------------------

export function listDyads(
  db: Db,
  options: {
    chapterId?: string
    status?: ContextStatus
  } = {}
): AddressingDyadItem[] {
  let targetChapterPos: number | null = null
  if (options.chapterId) {
    const chap = db
      .prepare('SELECT position FROM chapter WHERE id = ?')
      .get<{ position: number }>(options.chapterId)
    if (!chap) {
      throw new StorageError('not_found', 'Không tìm thấy chương chỉ định.')
    }
    targetChapterPos = chap.position
  }

  let sql = 'SELECT * FROM context_entry WHERE kind = \'dyad\''
  const params: SqlValue[] = []

  if (options.status) {
    sql += ' AND status = ?'
    params.push(options.status)
  }

  sql += ' ORDER BY created_at ASC'
  const rows = db.prepare(sql).all<ContextEntryRow>(...params)
  const items = rows.map(toDyadItem)

  if (targetChapterPos === null) {
    return items
  }

  // Filter by chapter position
  return items.filter((dyad) => {
    let fromPos = -Infinity
    let toPos = Infinity

    if (dyad.fromChapterId) {
      const f = db.prepare('SELECT position FROM chapter WHERE id = ?').get<{ position: number }>(dyad.fromChapterId)
      if (f) fromPos = f.position
    }
    if (dyad.toChapterId) {
      const t = db.prepare('SELECT position FROM chapter WHERE id = ?').get<{ position: number }>(dyad.toChapterId)
      if (t) toPos = t.position
    }

    return targetChapterPos! >= fromPos && targetChapterPos! <= toPos
  })
}

export function getDyad(db: Db, dyadId: string): AddressingDyadItem | null {
  const row = db
    .prepare('SELECT * FROM context_entry WHERE id = ? AND kind = \'dyad\'')
    .get<ContextEntryRow>(dyadId)
  if (!row) return null
  return toDyadItem(row)
}

export interface SetDyadParams {
  dyadId?: string
  sourceCharacterId: string
  targetCharacterId: string
  speakerPronoun: string
  recipientPronoun: string
  secondPerson?: string | null
  formality?: string | null
  fromChapterId?: string | null
  toChapterId?: string | null
  status?: ContextStatus
  notes?: string | null
}

export function setDyad(
  db: Db,
  params: SetDyadParams,
  now: number = Date.now()
): AddressingDyadItem {
  const { sourceCharacterId, targetCharacterId } = params
  if (sourceCharacterId === targetCharacterId) {
    throw new StorageError('validation', 'Nhân vật người nói và người nghe không được trùng nhau.')
  }

  const charA = getCharacter(db, sourceCharacterId)
  const charB = getCharacter(db, targetCharacterId)
  if (!charA || !charB) {
    throw new StorageError('not_found', 'Một trong hai nhân vật không tồn tại.')
  }

  const speakerPronoun = params.speakerPronoun.trim()
  const recipientPronoun = params.recipientPronoun.trim()
  if (!speakerPronoun || !recipientPronoun) {
    throw new StorageError('validation', 'Từ tự xưng và từ gọi đối phương không được để trống.')
  }

  validateChapters(db, params.fromChapterId, params.toChapterId)

  const meta: DyadMetadata = {
    speakerPronoun,
    recipientPronoun,
    secondPerson: params.secondPerson?.trim() || null,
    formality: params.formality?.trim() || null,
    userNotes: params.notes?.trim() || null
  }
  const notesJson = JSON.stringify(meta)

  let id = params.dyadId

  if (id) {
    const existing = getDyad(db, id)
    if (!existing) {
      throw new StorageError('not_found', 'Không tìm thấy quan hệ xưng hô.')
    }

    db.prepare(`
      UPDATE context_entry
      SET source = ?, target = ?, status = ?, from_chapter_id = ?, to_chapter_id = ?, notes = ?, updated_at = ?
      WHERE id = ? AND kind = 'dyad'
    `).run(
      sourceCharacterId,
      targetCharacterId,
      params.status ?? existing.status,
      params.fromChapterId ?? null,
      params.toChapterId ?? null,
      notesJson,
      now,
      id
    )
  } else {
    // Check if a dyad already exists with same direction and exact same chapter scope
    const existingRow = db.prepare(`
      SELECT id FROM context_entry
      WHERE kind = 'dyad' AND source = ? AND target = ? AND
            COALESCE(from_chapter_id, '') = COALESCE(?, '') AND
            COALESCE(to_chapter_id, '') = COALESCE(?, '')
    `).get<{ id: string }>(
      sourceCharacterId,
      targetCharacterId,
      params.fromChapterId ?? '',
      params.toChapterId ?? ''
    )

    if (existingRow) {
      id = existingRow.id
      db.prepare(`
        UPDATE context_entry
        SET status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(params.status ?? 'approved', notesJson, now, id)
    } else {
      id = randomUUID()
      db.prepare(`
        INSERT INTO context_entry (
          id, kind, source, target, status, origin, forbidden,
          from_chapter_id, to_chapter_id, notes, created_at, updated_at
        ) VALUES (?, 'dyad', ?, ?, ?, 'user', 0, ?, ?, ?, ?, ?)
      `).run(
        id,
        sourceCharacterId,
        targetCharacterId,
        params.status ?? 'approved',
        params.fromChapterId ?? null,
        params.toChapterId ?? null,
        notesJson,
        now,
        now
      )
    }
  }

  touchWork(db, now)
  return getDyad(db, id)!
}

export function deleteDyad(db: Db, dyadId: string, now: number = Date.now()): void {
  const existing = getDyad(db, dyadId)
  if (!existing) {
    throw new StorageError('not_found', 'Không tìm thấy quan hệ xưng hô.')
  }

  db.prepare('DELETE FROM context_entry WHERE id = ? AND kind = \'dyad\'').run(dyadId)
  touchWork(db, now)
}

export function getEffectiveDyadsForChapter(
  db: Db,
  chapterId: string
): AddressingDyadResolved[] {
  const dyads = listDyads(db, { chapterId, status: 'approved' })
  if (dyads.length === 0) return []

  const characters = listCharacters(db, { status: 'approved' })
  const charMap = new Map<string, CharacterItem>(characters.map((c) => [c.id, c]))

  const resolved: AddressingDyadResolved[] = []
  for (const dyad of dyads) {
    const srcChar = charMap.get(dyad.sourceCharacterId)
    const tgtChar = charMap.get(dyad.targetCharacterId)
    if (srcChar && tgtChar) {
      resolved.push({
        ...dyad,
        sourceCharacter: srcChar,
        targetCharacter: tgtChar
      })
    }
  }

  return resolved
}
