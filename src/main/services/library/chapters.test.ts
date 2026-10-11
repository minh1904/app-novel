import { afterEach, describe, expect, it } from 'vitest'
import type { ChapterItem } from '../../../shared/contracts/chapters'
import { StorageError } from '../../infra/storage/errors'
import { LibraryStore } from './library'
import { openDatabase } from '../../infra/storage/sqlite'
import { fakeJpegDataUrl } from '../../testing/testCover'
import { createTempDirs } from '../../testing/testing'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function open(dataDir: string): LibraryStore {
  let clock = 1_000
  const store = LibraryStore.open({ dataDir, now: () => clock++ })
  stores.push(store)
  return store
}

function setup(): { store: LibraryStore; dataDir: string; workId: string } {
  const dataDir = tempDir()
  const store = open(dataDir)
  const work = store.create({ title: 'Hiệu thuốc trên núi', sourceLang: 'zh-Hans' })
  return { store, dataDir, workId: work.id }
}

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

const titles = (chapters: ChapterItem[]): string[] => chapters.map((c) => c.title)

/** The stored positions must be exactly 0..n-1, read straight from the file. */
function expectContiguous(dataDir: string, workId: string): void {
  const db = openDatabase(dataDir + '/works/' + workId + '.mira', { readOnly: true })
  try {
    const positions = db
      .prepare('SELECT position FROM chapter ORDER BY position')
      .all<{ position: number }>()
      .map((row) => row.position)
    expect(positions).toEqual(positions.map((_, index) => index))
  } finally {
    db.close()
  }
}

/** The index row must agree with what the work file says. */
function expectIndexMatches(store: LibraryStore, workId: string): void {
  const fromFile = store.get(workId)
  const fromIndex = store.list().works.find((w) => w.id === workId)
  expect(fromIndex).toEqual(fromFile)
}

describe('chapters', () => {
  it('appends chapters in order and numbers them from position', () => {
    const { store, workId } = setup()
    store.createChapter(workId, 'Mở đầu')
    store.createChapter(workId)
    const { chapter, work } = store.createChapter(workId, '  Cuộc gặp gỡ  ')

    expect(chapter).toMatchObject({ number: 3, title: 'Cuộc gặp gỡ' })
    expect(work.chapterCount).toBe(3)
    const listed = store.listChapters(workId)
    expect(listed.map((c) => c.number)).toEqual([1, 2, 3])
    expect(titles(listed)).toEqual(['Mở đầu', '', 'Cuộc gặp gỡ'])
  })

  it('inserts chapters at specified positions and shifts existing ones', () => {
    const { store, dataDir, workId } = setup()
    store.createChapter(workId, 'Chương 10')
    store.createChapterAt(workId, 0, 'Chương 1')
    store.createChapterAt(workId, 1, 'Chương 5')

    const listed = store.listChapters(workId)
    expect(titles(listed)).toEqual(['Chương 1', 'Chương 5', 'Chương 10'])
    expect(listed.map((c) => c.number)).toEqual([1, 2, 3])
    expectContiguous(dataDir, workId)
  })

  it('renames in place, clears to an empty title, and keeps the position', () => {
    const { store, workId } = setup()
    store.createChapter(workId, 'A')
    const { chapter } = store.createChapter(workId, 'B')

    expect(store.renameChapter(workId, chapter.id, ' Mở đầu ').chapter).toMatchObject({
      title: 'Mở đầu',
      number: 2
    })
    expect(store.renameChapter(workId, chapter.id, '   ').chapter).toMatchObject({
      title: '',
      number: 2
    })
  })

  it('moves a chapter and shifts the ones in between', () => {
    const { store, dataDir, workId } = setup()
    for (const t of ['1', '2', '3', '4', '5']) store.createChapter(workId, t)
    const five = store.listChapters(workId)[4]

    const { chapters } = store.moveChapter(workId, five.id, 2)
    expect(titles(chapters)).toEqual(['1', '5', '2', '3', '4'])
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3, 4, 5])

    const two = store.listChapters(workId)[1]
    expect(titles(store.moveChapter(workId, two.id, 5).chapters)).toEqual(['1', '2', '3', '4', '5'])
    expectContiguous(dataDir, workId)
  })

  it('rejects positions outside 1..n and leaves the order alone', () => {
    const { store, workId } = setup()
    store.createChapter(workId, 'A')
    const { chapter } = store.createChapter(workId, 'B')
    const before = store.listChapters(workId)

    expect(codeOf(() => store.moveChapter(workId, chapter.id, 0))).toBe('validation')
    expect(codeOf(() => store.moveChapter(workId, chapter.id, 3))).toBe('validation')
    expect(codeOf(() => store.moveChapter(workId, chapter.id, 1.5))).toBe('validation')
    expect(store.listChapters(workId)).toEqual(before)
  })

  it('does not touch anything when a chapter is moved onto its own position', () => {
    const { store, workId } = setup()
    store.createChapter(workId, 'A')
    const { chapter } = store.createChapter(workId, 'B')
    const before = store.get(workId)
    store.moveChapter(workId, chapter.id, 2)
    expect(store.get(workId).updatedAt).toBe(before.updatedAt)
  })

  it('deletes a chapter and closes the gap', () => {
    const { store, dataDir, workId } = setup()
    for (const t of ['1', '2', '3', '4']) store.createChapter(workId, t)
    const second = store.listChapters(workId)[1]

    const { chapters, work } = store.deleteChapter(workId, second.id)
    expect(titles(chapters)).toEqual(['1', '3', '4'])
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3])
    expect(work.chapterCount).toBe(3)
    expectContiguous(dataDir, workId)
  })

  it('removes everything that belonged to a deleted chapter', () => {
    const { store, dataDir, workId } = setup()
    const { chapter } = store.createChapter(workId, 'A')
    store.createChapter(workId, 'B')

    // Chapter text does not exist yet in the app, so plant child rows directly.
    const path = dataDir + '/works/' + workId + '.mira'
    const db = openDatabase(path)
    db.prepare(
      `INSERT INTO chapter_text (chapter_id, side, content, rev, updated_at)
       VALUES (?, 'source', 'raw', 0, 1)`
    ).run(chapter.id)
    db.close()

    store.deleteChapter(workId, chapter.id)

    const check = openDatabase(path, { readOnly: true })
    try {
      expect(check.prepare('SELECT count(*) AS n FROM chapter_text').get<{ n: number }>()?.n).toBe(
        0
      )
    } finally {
      check.close()
    }
  })

  describe('last chapter', () => {
    it('opening a chapter records it and starts a not-started work', () => {
      const { store, workId } = setup()
      store.createChapter(workId, 'A')
      const { chapter } = store.createChapter(workId, 'B')

      const work = store.openChapter(workId, chapter.id)
      expect(work.status).toBe('in-progress')
      expect(work.lastChapter).toEqual({ id: chapter.id, number: 2, title: 'B' })
      expectIndexMatches(store, workId)
    })

    it('keeps a paused work paused', () => {
      const { store, workId } = setup()
      const { chapter } = store.createChapter(workId, 'A')
      store.update(workId, { status: 'paused' })

      const work = store.openChapter(workId, chapter.id)
      expect(work.status).toBe('paused')
      expect(work.lastChapter?.id).toBe(chapter.id)
    })

    it('follows the chapter when it moves and is forgotten when it is deleted', () => {
      const { store, workId } = setup()
      store.createChapter(workId, 'A')
      const { chapter } = store.createChapter(workId, 'B')
      store.openChapter(workId, chapter.id)

      store.moveChapter(workId, chapter.id, 1)
      expect(store.get(workId).lastChapter).toMatchObject({ id: chapter.id, number: 1 })

      const { work } = store.deleteChapter(workId, chapter.id)
      expect(work.lastChapter).toBeNull()
      expectIndexMatches(store, workId)
    })
  })

  describe('isolation', () => {
    it('rejects a chapter id that belongs to another work and changes nothing', () => {
      const { store, workId } = setup()
      const other = store.create({ title: 'Truyện khác', sourceLang: 'ja' })
      const { chapter } = store.createChapter(other.id, 'Của truyện khác')
      store.createChapter(workId, 'Của tôi')
      const before = store.listChapters(workId)

      expect(codeOf(() => store.renameChapter(workId, chapter.id, 'X'))).toBe('not_found')
      expect(codeOf(() => store.moveChapter(workId, chapter.id, 1))).toBe('not_found')
      expect(codeOf(() => store.deleteChapter(workId, chapter.id))).toBe('not_found')
      expect(codeOf(() => store.openChapter(workId, chapter.id))).toBe('not_found')
      expect(store.listChapters(workId)).toEqual(before)
      expect(titles(store.listChapters(other.id))).toEqual(['Của truyện khác'])
    })

    it('does not change work details or the cover', () => {
      const dataDir = tempDir()
      const store = open(dataDir)
      const work = store.create({
        title: 'T',
        sourceLang: 'en',
        author: 'Lý Minh',
        cover: fakeJpegDataUrl(2_000, 7)
      })
      const cover = store.getCover(work.id)

      const { chapter } = store.createChapter(work.id, 'A')
      store.renameChapter(work.id, chapter.id, 'B')
      store.moveChapter(work.id, chapter.id, 1)

      expect(store.get(work.id)).toMatchObject({ title: 'T', author: 'Lý Minh' })
      expect(store.getCover(work.id)).toBe(cover)
    })
  })

  it('keeps the library row in step after every change and after reopening', () => {
    const { store, dataDir, workId } = setup()
    const { chapter } = store.createChapter(workId, 'A')
    expectIndexMatches(store, workId)
    store.createChapter(workId, 'B')
    store.renameChapter(workId, chapter.id, 'A2')
    expectIndexMatches(store, workId)
    store.openChapter(workId, chapter.id)
    store.deleteChapter(workId, chapter.id)
    expectIndexMatches(store, workId)

    store.close()
    stores.splice(stores.indexOf(store), 1)
    const reopened = open(dataDir)
    expect(reopened.list().works[0]).toMatchObject({ chapterCount: 1, lastChapter: null })
  })

  it('rolls everything back when a change fails halfway', () => {
    const { store, dataDir, workId } = setup()
    store.createChapter(workId, 'A')
    store.createChapter(workId, 'B')

    // A trigger that fails on the final repositioning statement forces a mid-transaction error.
    const path = dataDir + '/works/' + workId + '.mira'
    const db = openDatabase(path)
    db.exec(
      `CREATE TRIGGER boom BEFORE UPDATE OF updated_at ON work
       BEGIN SELECT RAISE(ABORT, 'boom'); END;`
    )
    db.close()

    const before = store.listChapters(workId)
    const one = before[0]
    expect(codeOf(() => store.moveChapter(workId, one.id, 2))).toBeDefined()
    expect(store.listChapters(workId)).toEqual(before)
    expectContiguous(dataDir, workId)
  })

  describe('against a plain-array model', () => {
    /** Small deterministic PRNG so a failing run can be replayed from its seed. */
    function rng(seed: number): () => number {
      let state = seed >>> 0
      return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }

    for (const seed of [1, 2, 3, 20260929]) {
      it('matches after random add/rename/move/delete/open (seed ' + seed + ')', () => {
        const { store, dataDir, workId } = setup()
        const random = rng(seed)
        const pick = (n: number): number => Math.floor(random() * n)
        const model: { id: string; title: string }[] = []
        let last: string | null = null
        let counter = 0

        for (let step = 0; step < 150; step++) {
          const op = pick(5)
          const label = 'seed ' + seed + ' step ' + step + ' op ' + op
          if (op === 0 || model.length === 0) {
            const title = 'c' + counter++
            const { chapter } = store.createChapter(workId, title)
            model.push({ id: chapter.id, title })
          } else if (op === 1) {
            const target = model[pick(model.length)]
            const title = random() < 0.2 ? '' : 'r' + counter++
            store.renameChapter(workId, target.id, title)
            target.title = title
          } else if (op === 2) {
            const from = pick(model.length)
            const to = pick(model.length)
            store.moveChapter(workId, model[from].id, to + 1)
            const [moved] = model.splice(from, 1)
            model.splice(to, 0, moved)
          } else if (op === 3) {
            const at = pick(model.length)
            store.deleteChapter(workId, model[at].id)
            if (last === model[at].id) last = null
            model.splice(at, 1)
          } else {
            const target = model[pick(model.length)]
            store.openChapter(workId, target.id)
            last = target.id
          }

          const actual = store.listChapters(workId)
          expect(
            actual.map((c) => ({ id: c.id, title: c.title })),
            label
          ).toEqual(model)
          expect(
            actual.map((c) => c.number),
            label
          ).toEqual(model.map((_, i) => i + 1))
          const work = store.get(workId)
          expect(work.chapterCount, label).toBe(model.length)
          expect(work.lastChapter?.id ?? null, label).toBe(last)
        }

        expectContiguous(dataDir, workId)
        expectIndexMatches(store, workId)
      })
    }
  })
})

describe('updating details and cover together', () => {
  it('saves details and a new cover in one call', () => {
    const { store, workId } = setup()
    const work = store.update(workId, {
      author: 'Lý Minh',
      cover: fakeJpegDataUrl(3_000, 1)
    })
    expect(work.author).toBe('Lý Minh')
    expect(work.coverVersion).not.toBeNull()
    expect(store.getCover(workId)).not.toBeNull()
  })

  it('removes the cover with null and keeps it when the key is absent', () => {
    const { store, workId } = setup()
    store.update(workId, { cover: fakeJpegDataUrl(3_000, 1) })
    store.update(workId, { author: 'A' })
    expect(store.getCover(workId)).not.toBeNull()

    const work = store.update(workId, { cover: null })
    expect(work.coverVersion).toBeNull()
    expect(store.getCover(workId)).toBeNull()
  })

  it('changes nothing when the new cover is invalid', () => {
    const { store, workId } = setup()
    const before = store.get(workId)
    expect(
      codeOf(() => store.update(workId, { author: 'X', cover: 'data:image/jpeg;base64,@@@' }))
    ).toBe('validation')
    expect(store.get(workId)).toEqual(before)
  })
})
