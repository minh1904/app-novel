import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { ChapterChange, ChapterItem, ChaptersChange } from '../../../shared/chapters'
import type {
  CreateWorkInput,
  WorkList,
  WorkPatch,
  WorkProblem,
  WorkSummary
} from '../../../shared/library'
import { IMAGE_MAX_PER_WORK } from '../../../shared/images'
import {
  deleteChapter,
  insertChapter,
  listChapters,
  moveChapter,
  openChapter,
  renameChapter
} from '../../infra/storage/chapterFile'
import type { SegmentInput, TextRecord, TextSide } from '../../../shared/text'
import type { RowSaved } from '../../../shared/rows'
import { createLink, getProvenance, listLinks, setProvenance } from '../../infra/storage/linkFile'
import type { LinkInput, LinkRecord, ProvenanceRecord } from '../../infra/storage/linkFile'
import {
  autoPair,
  reviewRow,
  saveRow,
  type RowAuthor,
  type RowRef
} from '../../infra/storage/sentenceRows'
import { readText, saveText } from '../../infra/storage/textFile'
import { exportToFile, verifyWorkFile } from '../../infra/storage/backupFile'
import { decodeCover, encodeCover } from '../../infra/storage/cover'
import { decodeImage, encodeImage } from '../../infra/storage/image'
import { StorageError, toStorageError } from '../../infra/storage/errors'
import { librarySchema } from '../../infra/storage/librarySchema'
import { migrate } from '../../infra/storage/migrate'
import { openDatabase, type Db } from '../../infra/storage/sqlite'
import {
  assertWorkId,
  countImages,
  deleteImage,
  insertImage,
  insertWork,
  openWorkFile,
  patchWork,
  readCover,
  readImage,
  readWork,
  rowToSummary,
  writeCover,
  type WorkRow
} from '../../infra/storage/workFile'

export interface LibraryOptions {
  /** Directory that holds `library.db` and `works/`. */
  dataDir: string
  now?: () => number
  newId?: () => string
  newChapterId?: () => string
  /** Ids for segments and links. */
  newContentId?: () => string
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
  private readonly newChapterId: () => string
  private readonly newContentId: () => string
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
    this.newChapterId = options.newChapterId ?? randomUUID
    this.newContentId = options.newContentId ?? randomUUID
    mkdirSync(this.tmpDir, { recursive: true })
    this.index = this.openIndex()
  }

  static open(options: LibraryOptions): LibraryStore {
    const store = new LibraryStore(options.dataDir, options)
    store.reconcile()
    return store
  }

  /**
   * Cơ sở dữ liệu phạm vi ứng dụng (`library.db`), cho những thứ không thuộc một tác phẩm nào —
   * hiện là cài đặt kết nối AI. **Chỉ dùng trong main process**, và chỉ cho dữ liệu cấp ứng dụng:
   * mọi thứ thuộc về một tác phẩm vẫn đi qua các phương thức của lớp này.
   */
  get appDb(): Db {
    return this.index
  }

  /** Dùng chung với kho tác phẩm để id của kết nối và khóa cùng một kiểu. */
  newAppId(): string {
    return this.newId()
  }

  appNow(): number {
    return this.now()
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

    // Decode first so a bad cover fails before any file is created.
    const cover = input.cover === undefined ? null : decodeCover(input.cover)
    const id = this.newId()
    assertWorkId(id)
    const finalPath = this.workPath(id)
    const partPath = join(this.tmpDir, id + WORK_EXTENSION + PART_EXTENSION)
    const now = this.now()

    let summary: WorkSummary
    try {
      const db = openWorkFile(partPath)
      try {
        db.transaction(() => {
          insertWork(db, id, { ...input, title }, now)
          if (cover) writeCover(db, cover, now)
        })
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

  /** Details and cover are saved in one transaction: either both change or neither does. */
  update(id: string, patch: WorkPatch): WorkSummary {
    // Decode first so a bad cover fails before the file is touched.
    const cover =
      patch.cover === undefined ? undefined : patch.cover === null ? null : decodeCover(patch.cover)
    const summary = this.withWork(id, (db) => {
      db.transaction(() => {
        const now = this.now()
        patchWork(db, patch, now)
        if (cover !== undefined) writeCover(db, cover, now)
      })
      return readWork(db)
    })
    this.syncIndex(summary)
    return summary
  }

  listChapters(workId: string): ChapterItem[] {
    return this.withWork(workId, (db) => listChapters(db))
  }

  createChapter(workId: string, title = ''): ChapterChange {
    const chapterId = this.newChapterId()
    return this.changeChapters(workId, (db, now) => {
      const chapter = insertChapter(db, chapterId, title.trim(), now)
      return { chapter }
    })
  }

  renameChapter(workId: string, chapterId: string, title: string): ChapterChange {
    return this.changeChapters(workId, (db, now) => ({
      chapter: renameChapter(db, chapterId, title.trim(), now)
    }))
  }

  /** `to` is the 1-based position the chapter should end up at. */
  moveChapter(workId: string, chapterId: string, to: number): ChaptersChange {
    return this.changeChapters(workId, (db, now) => {
      moveChapter(db, chapterId, to, now)
      return { chapters: listChapters(db) }
    })
  }

  deleteChapter(workId: string, chapterId: string): ChaptersChange {
    return this.changeChapters(workId, (db, now) => {
      deleteChapter(db, chapterId, now)
      return { chapters: listChapters(db) }
    })
  }

  /** One side of a chapter's text. A side that was never saved reads as empty at revision 0. */
  readText(workId: string, chapterId: string, side: TextSide): TextRecord {
    return this.withWork(workId, (db) => readText(db, chapterId, side))
  }

  /** Text and segments are replaced together; `expectedRev` guards against a stale writer. */
  saveText(
    workId: string,
    chapterId: string,
    side: TextSide,
    content: string,
    expectedRev: number,
    segments: SegmentInput[]
  ): TextRecord {
    const saved = this.changeChapters(workId, (db, now) => ({
      text: saveText(
        db,
        { chapterId, side, content, expectedRev, segments },
        now,
        this.newContentId
      )
    }))
    return saved.text
  }

  createLink(workId: string, chapterId: string, input: LinkInput): LinkRecord {
    return this.changeChapters(workId, (db, now) => ({
      link: createLink(db, chapterId, input, now, this.newContentId())
    })).link
  }

  listLinks(workId: string, chapterId: string): LinkRecord[] {
    return this.withWork(workId, (db) => listLinks(db, chapterId))
  }

  /**
   * The translation of one row, written into the chapter's translation with its segments and its
   * link, in one transaction. `expectedRev` is the translation revision the caller last read.
   */
  saveRow(
    workId: string,
    args: RowRef & { text: string; expectedRev: number; by?: RowAuthor }
  ): RowSaved {
    return this.changeChapters(workId, (db, now) => ({
      saved: saveRow(db, args, now, this.newContentId)
    })).saved
  }

  reviewRow(workId: string, args: RowRef): LinkRecord[] {
    return this.changeChapters(workId, (db, now) => ({ links: reviewRow(db, args, now) })).links
  }

  autoPairRows(workId: string, chapterId: string): { links: LinkRecord[]; paired: number } {
    return this.changeChapters(workId, (db, now) => ({
      result: autoPair(db, chapterId, now, this.newContentId)
    })).result
  }

  setProvenance(workId: string, record: ProvenanceRecord): void {
    this.changeChapters(workId, (db) => {
      setProvenance(db, record)
      return {}
    })
  }

  getProvenance(workId: string, segmentId: string): ProvenanceRecord | null {
    return this.withWork(workId, (db) => getProvenance(db, segmentId))
  }

  /** Marks a chapter as the one being worked on and returns the updated work. */
  openChapter(workId: string, chapterId: string): WorkSummary {
    return this.changeChapters(workId, (db, now) => {
      openChapter(db, chapterId, now)
      return {}
    }).work
  }

  /** Runs a chapter change in one transaction, then refreshes the library index from the result. */
  private changeChapters<T extends object>(
    workId: string,
    change: (db: Db, now: number) => T
  ): T & { work: WorkSummary } {
    const result = this.withWork(workId, (db) => {
      const changed = db.transaction(() => change(db, this.now()))
      return { ...changed, work: readWork(db) }
    })
    this.syncIndex(result.work)
    return result
  }

  /** The cover as a data URL, or null when the work has none. */
  getCover(id: string): string | null {
    return this.withWork(id, (db) => {
      const cover = readCover(db)
      return cover ? encodeCover(cover) : null
    })
  }

  /** Pass null to remove the cover. */
  setCover(id: string, dataUrl: string | null): WorkSummary {
    const cover = dataUrl === null ? null : decodeCover(dataUrl)
    const summary = this.withWork(id, (db) => {
      db.transaction(() => writeCover(db, cover, this.now()))
      return readWork(db)
    })
    this.syncIndex(summary)
    return summary
  }

  /**
   * Stores a pasted or dropped image as a blob in the work's own file and returns its generated ID;
   * the embed syntax in the translation (`![[id]]`) refers to this ID, never a file name.
   */
  putImage(workId: string, dataUrl: string): { id: string } {
    const image = decodeImage(dataUrl)
    return this.withWork(workId, (db) =>
      db.transaction(() => {
        if (countImages(db) >= IMAGE_MAX_PER_WORK) {
          throw new StorageError(
            'validation',
            'Tác phẩm đã có ' + IMAGE_MAX_PER_WORK + ' ảnh, đây là giới hạn tối đa.'
          )
        }
        const id = this.newContentId()
        insertImage(db, id, image, this.now())
        return { id }
      })
    )
  }

  /** The image as a data URL, or null when it no longer exists (e.g. an embed left dangling). */
  getImage(workId: string, imageId: string): string | null {
    return this.withWork(workId, (db) => {
      const image = readImage(db, imageId)
      return image ? encodeImage(image) : null
    })
  }

  /** Deleting an image that is already gone is not an error: the embed may have been removed first. */
  deleteImage(workId: string, imageId: string): void {
    this.withWork(workId, (db) => deleteImage(db, imageId))
  }

  /**
   * Writes a consistent backup of one work to `destination`, which the user chose. The work stays
   * open and unchanged. The destination must be outside the data directory, so a backup can never
   * overwrite a live work file.
   */
  exportWork(workId: string, destination: string): void {
    if (!isAbsolute(destination)) {
      throw new StorageError('validation', 'Đường dẫn lưu phải là đường dẫn đầy đủ.')
    }
    const inside = relative(resolve(this.dataDir), resolve(destination))
    if (inside === '' || (!inside.startsWith('..') && !isAbsolute(inside))) {
      throw new StorageError('validation', 'Hãy chọn nơi lưu bên ngoài thư mục dữ liệu của Mira.')
    }
    this.withWork(workId, (db) => exportToFile(db, destination))
  }

  /**
   * Adds a backup to the library as a new work. The file is copied, checked and upgraded as a copy
   * in `.tmp`; the rename into `works/` is the commit point, so a work is either complete or absent.
   * The user's file is never opened in place. Status, last chapter and dates come from the backup.
   */
  restoreWork(sourcePath: string): WorkSummary {
    if (!isAbsolute(sourcePath)) {
      throw new StorageError('validation', 'Đường dẫn tệp phải là đường dẫn đầy đủ.')
    }
    const id = this.newId()
    assertWorkId(id)
    const partPath = join(this.tmpDir, id + WORK_EXTENSION + PART_EXTENSION)
    const finalPath = this.workPath(id)

    let summary: WorkSummary
    try {
      copyFileSync(sourcePath, partPath)
      verifyWorkFile(partPath)
      const db = openWorkFile(partPath)
      try {
        db.transaction(() => db.prepare('UPDATE work SET id = ?').run(id))
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
        summary = readWork(db)
      } finally {
        db.close()
      }
      renameSync(partPath, finalPath)
    } catch (error) {
      this.removeWorkFiles(partPath)
      throw toStorageError(error)
    }

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
    // Everything in .tmp is an unfinished create or restore, including SQLite's own side files
    // (-journal, -wal, -shm), so nothing there is worth keeping after a restart.
    for (const name of readdirSync(this.tmpDir)) {
      rmSync(join(this.tmpDir, name), { recursive: true, force: true })
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
           cover_version, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           file_name = excluded.file_name, title = excluded.title,
           original_title = excluded.original_title, description = excluded.description,
           author = excluded.author, genre = excluded.genre,
           source_lang = excluded.source_lang, status = excluded.status,
           archived = excluded.archived, chapter_count = excluded.chapter_count,
           last_chapter_id = excluded.last_chapter_id,
           last_chapter_number = excluded.last_chapter_number,
           last_chapter_title = excluded.last_chapter_title,
           cover_version = excluded.cover_version,
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
        summary.coverVersion,
        summary.createdAt,
        summary.updatedAt
      )
  }

  private removeWorkFiles(path: string): void {
    for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(path + suffix, { force: true })
  }
}
