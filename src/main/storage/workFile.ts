import type { CreateWorkInput, WorkPatch, WorkSummary } from '../../shared/library'
import { StorageError } from './errors'
import { migrate } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { workSchema } from './workSchema'

/** Operations on a single work file (`works/<id>.mira`). The file is the source of truth. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Work ids become file names, so anything that is not a UUID is rejected before touching disk. */
export function assertWorkId(id: string): void {
  if (!UUID.test(id)) throw new StorageError('validation', 'ID tác phẩm không hợp lệ.')
}

export interface WorkRow {
  id: string
  title: string
  original_title: string | null
  description: string | null
  author: string | null
  genre: string | null
  source_lang: WorkSummary['sourceLang']
  status: WorkSummary['status']
  archived: number
  chapter_count: number
  last_chapter_id: string | null
  last_chapter_number: number | null
  last_chapter_title: string | null
  created_at: number
  updated_at: number
}

export function rowToSummary(row: WorkRow): WorkSummary {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    description: row.description,
    author: row.author,
    genre: row.genre,
    sourceLang: row.source_lang,
    status: row.status,
    archived: row.archived === 1,
    chapterCount: row.chapter_count,
    lastChapter:
      row.last_chapter_id !== null && row.last_chapter_number !== null
        ? {
            id: row.last_chapter_id,
            number: row.last_chapter_number,
            title: row.last_chapter_title ?? ''
          }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT_WORK = `
  SELECT w.id, w.title, w.original_title, w.description, w.author, w.genre, w.source_lang, w.status, w.archived,
         (SELECT count(*) FROM chapter) AS chapter_count,
         lc.id AS last_chapter_id,
         (SELECT count(*) FROM chapter c WHERE c.position < lc.position) + 1 AS last_chapter_number,
         lc.title AS last_chapter_title,
         w.created_at, w.updated_at
  FROM work w LEFT JOIN chapter lc ON lc.id = w.last_chapter_id`

/** Opens a work file, upgrading its schema if needed. The caller closes it. */
export function openWorkFile(path: string): Db {
  const db = openDatabase(path)
  try {
    migrate(db, workSchema)
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export function readWork(db: Db): WorkSummary {
  const row = db.prepare(SELECT_WORK).get<WorkRow>()
  if (!row) throw new StorageError('corrupt', 'Tệp tác phẩm không có thông tin tác phẩm.')
  return rowToSummary(row)
}

export function insertWork(db: Db, id: string, input: CreateWorkInput, now: number): void {
  db.prepare(
    `INSERT INTO work (
       id, title, original_title, description, author, genre, source_lang, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    emptyToNull(input.originalTitle),
    emptyToNull(input.description),
    emptyToNull(input.author),
    emptyToNull(input.genre),
    input.sourceLang,
    now,
    now
  )
}

/** Applies a patch and returns whether anything changed. Absent keys are left untouched. */
export function patchWork(db: Db, patch: WorkPatch, now: number): boolean {
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const set = (column: string, value: string | number | null): void => {
    sets.push(column + ' = ?')
    params.push(value)
  }

  if (patch.title !== undefined) set('title', patch.title.trim())
  if (patch.originalTitle !== undefined) set('original_title', emptyToNull(patch.originalTitle))
  if (patch.description !== undefined) set('description', emptyToNull(patch.description))
  if (patch.author !== undefined) set('author', emptyToNull(patch.author))
  if (patch.genre !== undefined) set('genre', emptyToNull(patch.genre))
  if (patch.status !== undefined) set('status', patch.status)
  if (patch.archived !== undefined) set('archived', patch.archived ? 1 : 0)

  if (sets.length === 0) return false
  set('updated_at', now)
  db.prepare('UPDATE work SET ' + sets.join(', ')).run(...params)
  return true
}

/** Storage does not rely on callers having trimmed: blank optional text is stored as null. */
function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}
