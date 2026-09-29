import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type {
  CreateWorkInput,
  WorkList,
  WorkPatch,
  WorkProblem,
  WorkSummary
} from '../../shared/library'
import { StorageError, toStorageError } from './errors'
import { librarySchema } from './librarySchema'
import { migrate } from './migrate'
import { openDatabase, type Db } from './sqlite'
import {
  assertWorkId,
  insertWork,
  openWorkFile,
  patchWork,
  readWork,
  rowToSummary,
  type WorkRow
} from './workFile'

export interface LibraryOptions {
  /** Directory that holds `library.db` and `works/`. */
  dataDir: string
  now?: () => number
  newId?: () => string
}

const WORK_EXTENSION = '.mira'
const PART_EXTENSION = '.part'

interface IndexRow extends WorkRow {
  file_name: string
}

/**
 * The work library: one SQLite file per work (source of truth) plus a small index for listing.
 * The index is a cache and is rebuilt from the work files on startup, so losing it loses nothing.
 */
export class LibraryStore {
  private readonly worksDir: string
  private readonly tmpDir: string
  private readonly now: () => number
  private readonly newId: () => string
  private index: Db
  private problems: WorkProblem[] = []

  private constructor(
    private readonly dataDir: string,
    options: LibraryOptions
  ) {
    this.worksDir = join(dataDir, 'works')
    this.tmpDir = join(this.worksDir, '.tmp')
    this.now = options.now ?? Date.now
    this.newId = options.newId ?? randomUUID
    mkdirSync(this.tmpDir, { recursive: true })
    this.index = this.openIndex()
  }

  static open(options: LibraryOptions): LibraryStore {
    const store = new LibraryStore(options.dataDir, options)
    store.reconcile()
    return store
  }

  list(): WorkList {
    const rows = this.index
      .prepare('SELECT * FROM work_index ORDER BY updated_at DESC, title')
      .all<IndexRow>()
    return { works: rows.map(rowToSummary), problems: [...this.problems] }
  }

  get(id: string): WorkSummary {
    return this.withWork(id, (db) => readWork(db))
  }

  create(input: CreateWorkInput): WorkSummary {
    const title = input.title.trim()
    if (title.length === 0) throw new StorageError('validation', 'Nhập tên tác phẩm.')

    const id = this.newId()
    assertWorkId(id)
    const finalPath = this.workPath(id)
    const partPath = join(this.tmpDir, id + WORK_EXTENSION + PART_EXTENSION)
    const now = this.now()

    let summary: WorkSummary
    try {
      const db = openWorkFile(partPath)
      try {
        db.transaction(() => insertWork(db, id, { ...input, title }, now))
        summary = readWork(db)
      } finally {
        db.close()
      }
      // The rename is the commit point: a work file is either complete or absent.
      renameSync(partPath, finalPath)
    } catch (error) {
      this.removeWorkFiles(partPath)
      throw toStorageError(error)
    }

    this.syncIndex(summary)
    return summary
  }

  update(id: string, patch: WorkPatch): WorkSummary {
    const summary = this.withWork(id, (db) => {
      db.transaction(() => patchWork(db, patch, this.now()))
      return readWork(db)
    })
    this.syncIndex(summary)
    return summary
  }

  close(): void {
    this.index.close()
  }

  private workPath(id: string): string {
    return join(this.worksDir, id + WORK_EXTENSION)
  }

  private withWork<T>(id: string, fn: (db: Db) => T): T {
    assertWorkId(id)
    const path = this.workPath(id)
    if (!existsSync(path)) throw new StorageError('not_found', 'Không tìm thấy tác phẩm.')
    try {
      const db = openWorkFile(path)
      try {
        return fn(db)
      } finally {
        db.close()
      }
    } catch (error) {
      throw toStorageError(error)
    }
  }

  /**
   * Opens `library.db`. A corrupt index is set aside and recreated (reconcile refills it);
   * an index written by a newer app is left alone and reported.
   */
  private openIndex(): Db {
    const path = join(this.dataDir, 'library.db')
    try {
      return this.openAndMigrateIndex(path)
    } catch (error) {
      const storageError = toStorageError(error)
      if (storageError.code !== 'corrupt') throw storageError
      renameSync(path, path + '.corrupt-' + this.now())
      rmSync(path + '-wal', { force: true })
      rmSync(path + '-shm', { force: true })
      return this.openAndMigrateIndex(path)
    }
  }

  private openAndMigrateIndex(path: string): Db {
    const db = openDatabase(path)
    try {
      migrate(db, librarySchema)
      return db
    } catch (error) {
      db.close()
      throw toStorageError(error)
    }
  }

  /** Makes the index agree with the work files on disk and records files that cannot be opened. */
  private reconcile(): void {
    for (const name of readdirSync(this.tmpDir)) {
      if (name.endsWith(PART_EXTENSION)) this.removeWorkFiles(join(this.tmpDir, name))
    }

    const problems: WorkProblem[] = []
    const seen = new Set<string>()

    for (const fileName of readdirSync(this.worksDir)) {
      if (!fileName.endsWith(WORK_EXTENSION)) continue
      try {
        const summary = this.readSummaryFromFile(fileName)
        seen.add(summary.id)
        this.upsertIndex(summary, fileName)
      } catch (error) {
        const storageError = toStorageError(error)
        problems.push({ fileName, code: storageError.code, message: storageError.message })
      }
    }

    this.index.transaction(() => {
      const known = this.index.prepare('SELECT id FROM work_index').all<{ id: string }>()
      for (const { id } of known) {
        if (!seen.has(id)) this.index.prepare('DELETE FROM work_index WHERE id = ?').run(id)
      }
    })
    this.problems = problems
  }

  private readSummaryFromFile(fileName: string): WorkSummary {
    const db = openWorkFile(join(this.worksDir, fileName))
    try {
      const summary = readWork(db)
      if (summary.id + WORK_EXTENSION !== fileName) {
        throw new StorageError('corrupt', 'Tên tệp không khớp với ID tác phẩm bên trong.')
      }
      return summary
    } finally {
      db.close()
    }
  }

  /** Best effort: the work file is already committed, and reconcile repairs a stale index. */
  private syncIndex(summary: WorkSummary): void {
    try {
      this.upsertIndex(summary, summary.id + WORK_EXTENSION)
    } catch (error) {
      console.error('Không cập nhật được chỉ mục thư viện:', error)
    }
  }

  private upsertIndex(summary: WorkSummary, fileName: string): void {
    this.index
      .prepare(
        `INSERT INTO work_index (
           id, file_name, title, original_title, description, author, genre, source_lang, status,
           archived, chapter_count, last_chapter_id, last_chapter_number, last_chapter_title,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           file_name = excluded.file_name, title = excluded.title,
           original_title = excluded.original_title, description = excluded.description,
           author = excluded.author, genre = excluded.genre,
           source_lang = excluded.source_lang, status = excluded.status,
           archived = excluded.archived, chapter_count = excluded.chapter_count,
           last_chapter_id = excluded.last_chapter_id,
           last_chapter_number = excluded.last_chapter_number,
           last_chapter_title = excluded.last_chapter_title,
           created_at = excluded.created_at, updated_at = excluded.updated_at`
      )
      .run(
        summary.id,
        fileName,
        summary.title,
        summary.originalTitle,
        summary.description,
        summary.author,
        summary.genre,
        summary.sourceLang,
        summary.status,
        summary.archived ? 1 : 0,
        summary.chapterCount,
        summary.lastChapter?.id ?? null,
        summary.lastChapter?.number ?? null,
        summary.lastChapter?.title ?? null,
        summary.createdAt,
        summary.updatedAt
      )
  }

  private removeWorkFiles(path: string): void {
    for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true })
  }
}
