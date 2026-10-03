import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { StorageError } from '../../infra/storage/errors'
import { LibraryStore } from './library'
import { latestVersion, migrate, readPragmas } from '../../infra/storage/migrate'
import { openDatabase } from '../../infra/storage/sqlite'
import { fakeJpegDataUrl } from '../../testing/testCover'
import { createTempDirs } from '../../testing/testing'
import { workSchema } from '../../infra/storage/workSchema'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function open(dataDir: string, now = 1_000): LibraryStore {
  let clock = now
  const store = LibraryStore.open({ dataDir, now: () => clock++ })
  stores.push(store)
  return store
}

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

/** A work with a cover, three chapters, text, segments, a link and provenance. */
function seededWork(store: LibraryStore): { workId: string; chapterIds: string[] } {
  const work = store.create({
    title: 'Hiệu thuốc trên núi',
    sourceLang: 'zh-Hans',
    author: 'Lý Minh',
    cover: fakeJpegDataUrl(5_000, 9)
  })
  const chapterIds = ['Mở đầu', '', 'Kết'].map(
    (title) => store.createChapter(work.id, title).chapter.id
  )
  const source = store.saveText(work.id, chapterIds[0], 'source', '山中药铺。😀\r\n第二句。', 0, [
    { start: 0, end: 6 },
    { start: 8, end: 12 }
  ])
  const target = store.saveText(work.id, chapterIds[0], 'target', 'Hiệu thuốc. Câu hai.', 0, [
    { start: 0, end: 12 },
    { start: 13, end: 20 }
  ])
  store.createLink(work.id, chapterIds[0], {
    kind: 'ai',
    confidence: 0.8,
    members: [source.segments[0].id, target.segments[0].id]
  })
  store.setProvenance(work.id, {
    segmentId: target.segments[0].id,
    origin: 'mock',
    provider: 'mock',
    model: null,
    at: 77
  })
  store.openChapter(work.id, chapterIds[2])
  store.update(work.id, { status: 'paused' })
  return { workId: work.id, chapterIds }
}

function snapshot(store: LibraryStore, workId: string): unknown {
  const chapters = store.listChapters(workId)
  return {
    work: store.get(workId),
    cover: store.getCover(workId),
    chapters: chapters.map((c) => ({
      title: c.title,
      number: c.number,
      source: store.readText(workId, c.id, 'source').content,
      target: store.readText(workId, c.id, 'target').content,
      segments: store
        .readText(workId, c.id, 'source')
        .segments.concat(store.readText(workId, c.id, 'target').segments)
        .map((s) => [s.start, s.end])
    })),
    links: chapters.map((c) =>
      store.listLinks(workId, c.id).map((l) => [l.kind, l.confidence, l.members.length])
    )
  }
}

describe('backup and restore', () => {
  it('restores onto a clean profile with everything the work had, cover included', () => {
    const source = open(tempDir())
    const { workId } = seededWork(source)
    const outDir = tempDir()
    const backup = join(outDir, 'sao-luu.mira')
    source.exportWork(workId, backup)
    expect(existsSync(backup + '.part')).toBe(false)

    const clean = open(tempDir())
    const restored = clean.restoreWork(backup)
    expect(restored.id).not.toBe(workId)

    const before = snapshot(source, workId) as { work: Record<string, unknown> }
    const after = snapshot(clean, restored.id) as { work: Record<string, unknown> }
    // Everything but the id and the cover version (which is the cover's own timestamp) matches.
    const strip = (x: { work: Record<string, unknown> }): unknown => ({
      ...x,
      work: { ...x.work, id: 0 }
    })
    expect(strip(after)).toEqual(strip(before))
    expect(clean.getCover(restored.id)).toBe(source.getCover(workId))
  })

  it('keeps status, the last chapter and the dates of the backup', () => {
    const source = open(tempDir())
    const { workId, chapterIds } = seededWork(source)
    const backup = join(tempDir(), 'b.mira')
    source.exportWork(workId, backup)
    const original = source.get(workId)

    const restored = open(tempDir(), 900_000).restoreWork(backup)
    expect(restored.status).toBe('paused')
    expect(restored.lastChapter).toMatchObject({ number: 3, title: 'Kết' })
    expect(restored.createdAt).toBe(original.createdAt)
    expect(restored.updatedAt).toBe(original.updatedAt)
    expect(chapterIds).toHaveLength(3)
  })

  it('includes a change saved just before the backup', () => {
    const store = open(tempDir())
    const { workId, chapterIds } = seededWork(store)
    store.saveText(workId, chapterIds[1], 'source', 'Vừa lưu xong', 0, [])
    const backup = join(tempDir(), 'b.mira')
    store.exportWork(workId, backup)
    const restored = open(tempDir()).restoreWork(backup)
    const second = open(tempDir())
    const again = second.restoreWork(backup)
    for (const [library, id] of [
      [stores[stores.length - 2], restored.id],
      [second, again.id]
    ] as const) {
      const chapter = library.listChapters(id)[1]
      expect(library.readText(id, chapter.id, 'source').content).toBe('Vừa lưu xong')
    }
  })

  it('adds an independent work when the original is still in the library', () => {
    const store = open(tempDir())
    const { workId } = seededWork(store)
    const backup = join(tempDir(), 'b.mira')
    store.exportWork(workId, backup)

    const before = snapshot(store, workId)
    const copy = store.restoreWork(backup)
    expect(copy.id).not.toBe(workId)
    expect(store.list().works).toHaveLength(2)
    expect(snapshot(store, workId)).toEqual(before)

    // Changing the copy must not touch the original.
    store.update(copy.id, { title: 'Bản sao' })
    store.createChapter(copy.id, 'Thêm')
    expect(store.get(workId).title).toBe('Hiệu thuốc trên núi')
    expect(store.listChapters(workId)).toHaveLength(3)
  })

  it('leaves the backup file unchanged and not locked', () => {
    const store = open(tempDir())
    const { workId } = seededWork(store)
    const backup = join(tempDir(), 'b.mira')
    store.exportWork(workId, backup)
    const bytes = readFileSync(backup)

    open(tempDir()).restoreWork(backup)
    expect(readFileSync(backup).equals(bytes)).toBe(true)
    expect(readdirSync(join(backup, '..'))).toEqual(['b.mira'])
    rmSync(backup)
    expect(existsSync(backup)).toBe(false)
  })

  it('writes the backup next to nothing else and replaces an existing file the user chose', () => {
    const store = open(tempDir())
    const { workId } = seededWork(store)
    const dir = tempDir()
    const backup = join(dir, 'b.mira')
    writeFileSync(backup, 'cũ')
    store.exportWork(workId, backup)
    expect(readdirSync(dir)).toEqual(['b.mira'])
    expect(statSync(backup).size).toBeGreaterThan(1000)
  })

  it('does not change the work when it is backed up', () => {
    const store = open(tempDir())
    const { workId } = seededWork(store)
    const before = snapshot(store, workId)
    store.exportWork(workId, join(tempDir(), 'b.mira'))
    expect(snapshot(store, workId)).toEqual(before)
  })

  it('refuses to back up into its own data directory or to a relative path', () => {
    const dataDir = tempDir()
    const store = open(dataDir)
    const { workId } = seededWork(store)
    expect(codeOf(() => store.exportWork(workId, join(dataDir, 'works', workId + '.mira')))).toBe(
      'validation'
    )
    expect(codeOf(() => store.exportWork(workId, join(dataDir, 'x.mira')))).toBe('validation')
    expect(codeOf(() => store.exportWork(workId, 'relative.mira'))).toBe('validation')
    expect(store.listChapters(workId)).toHaveLength(3)
  })

  it('fails cleanly, leaving no partial file, when the place cannot be written', () => {
    const store = open(tempDir())
    const { workId } = seededWork(store)
    const missing = join(tempDir(), 'khong-co', 'b.mira')
    expect(codeOf(() => store.exportWork(workId, missing))).toBeDefined()
    expect(existsSync(missing)).toBe(false)
    expect(existsSync(missing + '.part')).toBe(false)
  })

  it('handles a destination path with an apostrophe', () => {
    const store = open(tempDir())
    const { workId } = seededWork(store)
    const dir = join(tempDir(), "it's here")
    mkdirSync(dir)
    const backup = join(dir, "Tác phẩm của tôi's.mira")
    store.exportWork(workId, backup)
    expect(open(tempDir()).restoreWork(backup).title).toBe('Hiệu thuốc trên núi')
  })

  describe('refuses what is not a good backup, and changes nothing', () => {
    function expectRefused(path: string, code: string): void {
      const dataDir = tempDir()
      const library = open(dataDir)
      seededWork(library)
      const listBefore = library.list()
      const filesBefore = readdirSync(join(dataDir, 'works')).sort()

      expect(codeOf(() => library.restoreWork(path))).toBe(code)

      expect(library.list()).toEqual(listBefore)
      expect(readdirSync(join(dataDir, 'works')).sort()).toEqual(filesBefore)
      expect(readdirSync(join(dataDir, 'works', '.tmp'))).toEqual([])
    }

    function goodBackup(): string {
      const store = open(tempDir())
      const { workId } = seededWork(store)
      const path = join(tempDir(), 'good.mira')
      store.exportWork(workId, path)
      return path
    }

    it('a text file', () => {
      const path = join(tempDir(), 'ghi-chu.mira')
      writeFileSync(path, 'đây không phải cơ sở dữ liệu')
      expectRefused(path, 'corrupt')
    })

    it('an empty file and a missing file', () => {
      const empty = join(tempDir(), 'rong.mira')
      writeFileSync(empty, '')
      expectRefused(empty, 'corrupt')
      expectRefused(join(tempDir(), 'khong-co.mira'), 'io')
    })

    it('a SQLite database that is not a Mira file', () => {
      const path = join(tempDir(), 'khac.mira')
      const db = openDatabase(path)
      db.exec(
        "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT); INSERT INTO notes (body) VALUES ('x')"
      )
      db.close()
      expectRefused(path, 'corrupt')
    })

    it('a Mira file cut short', () => {
      const good = goodBackup()
      const bytes = readFileSync(good)
      const path = join(tempDir(), 'cut.mira')
      writeFileSync(path, bytes.subarray(0, Math.floor(bytes.length / 3)))
      expectRefused(path, 'corrupt')
    })

    it('a Mira file with damaged pages', () => {
      const good = goodBackup()
      const bytes = Buffer.from(readFileSync(good))
      // Overwrite the middle of the file, past the header, with noise.
      for (let i = 4096; i < bytes.length - 4096; i += 7) bytes[i] = 0xa5
      const path = join(tempDir(), 'damaged.mira')
      writeFileSync(path, bytes)
      expectRefused(path, 'corrupt')
    })

    it('a Mira file from a newer schema', () => {
      const good = goodBackup()
      const path = join(tempDir(), 'newer.mira')
      copyFileSync(good, path)
      const db = openDatabase(path)
      db.exec('PRAGMA user_version = 99')
      db.close()
      expectRefused(path, 'unsupported_version')
    })

    it('a Mira file that is missing a required table', () => {
      const good = goodBackup()
      const path = join(tempDir(), 'partial.mira')
      copyFileSync(good, path)
      const db = openDatabase(path)
      db.exec('PRAGMA foreign_keys = OFF; DROP TABLE provenance')
      db.close()
      expectRefused(path, 'corrupt')
    })

    it('a Mira file with two works', () => {
      const good = goodBackup()
      const path = join(tempDir(), 'two.mira')
      copyFileSync(good, path)
      const db = openDatabase(path)
      db.exec('DROP INDEX work_singleton')
      db.exec(
        "INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('x', 'Hai', 'en', 1, 1)"
      )
      db.close()
      expectRefused(path, 'corrupt')
    })
  })

  it('upgrades an older backup on the way in and fills in what the new version needs', () => {
    // A genuine version 3 file: built with the migrations that existed then.
    const path = join(tempDir(), 'v3.mira')
    const old = openDatabase(path)
    migrate(old, { ...workSchema, migrations: workSchema.migrations.filter((m) => m.version <= 3) })
    old.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at)
        VALUES ('11111111-1111-4111-8111-111111111111', 'Bản cũ', 'ja', 10, 20);
      INSERT INTO chapter (id, position, title, created_at, updated_at)
        VALUES ('c1', 0, 'Một', 1, 1), ('c2', 1, 'Hai', 1, 1);
      INSERT INTO chapter_text (chapter_id, side, content, rev, updated_at)
        VALUES ('c1', 'source', 'có chữ', 1, 1), ('c1', 'target', '', 1, 1);
    `)
    expect(readPragmas(old).userVersion).toBe(3)
    old.close()

    const library = open(tempDir())
    const restored = library.restoreWork(path)
    expect(restored).toMatchObject({ title: 'Bản cũ', chapterCount: 2, coverVersion: null })

    const chapters = library.listChapters(restored.id)
    expect(chapters.map((c) => [c.hasSource, c.hasTarget])).toEqual([
      [true, false],
      [false, false]
    ])
    const db = openDatabase(join(library['worksDir'], restored.id + '.mira'), { readOnly: true })
    try {
      expect(readPragmas(db).userVersion).toBe(latestVersion(workSchema))
    } finally {
      db.close()
    }
  })

  it('cleans a half-finished restore left in .tmp at the next start', () => {
    const dataDir = tempDir()
    const library = open(dataDir)
    seededWork(library)
    library.close()
    stores.splice(stores.indexOf(library), 1)

    writeFileSync(join(dataDir, 'works', '.tmp', 'abc.mira.part'), 'dở dang')
    writeFileSync(join(dataDir, 'works', '.tmp', 'abc.mira.part-wal'), 'dở dang')
    const reopened = open(dataDir)
    expect(reopened.list().works).toHaveLength(1)
    expect(reopened.list().problems).toEqual([])
    expect(readdirSync(join(dataDir, 'works', '.tmp'))).toEqual([])
  })

  it('works with no network: nothing here touches one', () => {
    // Backup and restore only use the file system and SQLite; this guards against a future import.
    const text =
      readFileSync(join(__dirname, '../../infra/storage/backupFile.ts'), 'utf-8') +
      readFileSync(join(__dirname, 'library.ts'), 'utf-8')
    expect(text).not.toMatch(/from 'node:(http|https|net|dns|tls)'|fetch\(/)
  })
})
