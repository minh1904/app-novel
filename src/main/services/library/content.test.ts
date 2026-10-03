import { afterEach, describe, expect, it } from 'vitest'
import type { SegmentInput, TextSide } from '../../../shared/text'
import { StorageError } from '../../infra/storage/errors'
import { CHAPTER_SELECT } from '../../infra/storage/chapterFile'
import { LibraryStore } from './library'
import { openDatabase } from '../../infra/storage/sqlite'
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

function setup(): { store: LibraryStore; dataDir: string; workId: string; chapterId: string } {
  const dataDir = tempDir()
  const store = open(dataDir)
  const work = store.create({ title: 'Hiệu thuốc trên núi', sourceLang: 'zh-Hans' })
  const { chapter } = store.createChapter(work.id, 'Mở đầu')
  return { store, dataDir, workId: work.id, chapterId: chapter.id }
}

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

const workPath = (dataDir: string, workId: string): string => dataDir + '/works/' + workId + '.mira'

describe('chapter text', () => {
  it('reads a side that was never saved as empty at revision 0, without creating a row', () => {
    const { store, dataDir, workId, chapterId } = setup()
    expect(store.readText(workId, chapterId, 'source')).toEqual({
      content: '',
      rev: 0,
      segments: []
    })
    const db = openDatabase(workPath(dataDir, workId), { readOnly: true })
    try {
      expect(db.prepare('SELECT count(*) AS n FROM chapter_text').get<{ n: number }>()?.n).toBe(0)
    } finally {
      db.close()
    }
  })

  it('creates the row on the first save and raises the revision on each later one', () => {
    const { store, workId, chapterId } = setup()
    const first = store.saveText(workId, chapterId, 'source', 'Một.', 0, [{ start: 0, end: 4 }])
    expect(first).toMatchObject({ content: 'Một.', rev: 1 })
    const second = store.saveText(workId, chapterId, 'source', 'Một. Hai.', 1, [])
    expect(second.rev).toBe(2)
    expect(store.readText(workId, chapterId, 'source').content).toBe('Một. Hai.')
  })

  it('keeps the two sides apart', () => {
    const { store, workId, chapterId } = setup()
    store.saveText(workId, chapterId, 'source', '山中药铺', 0, [])
    expect(store.readText(workId, chapterId, 'target')).toMatchObject({ content: '', rev: 0 })
    store.saveText(workId, chapterId, 'target', 'Hiệu thuốc trên núi', 0, [])
    expect(store.readText(workId, chapterId, 'source').content).toBe('山中药铺')
  })

  it('refuses a stale revision and leaves the text alone', () => {
    const { store, workId, chapterId } = setup()
    store.saveText(workId, chapterId, 'source', 'A', 0, [])
    expect(codeOf(() => store.saveText(workId, chapterId, 'source', 'B', 0, []))).toBe('conflict')
    expect(codeOf(() => store.saveText(workId, chapterId, 'source', 'B', 5, []))).toBe('conflict')
    expect(store.readText(workId, chapterId, 'source')).toMatchObject({ content: 'A', rev: 1 })
  })

  it('returns not_found for a chapter that does not belong to the work', () => {
    const { store, workId } = setup()
    const other = store.create({ title: 'Truyện khác', sourceLang: 'en' })
    const foreign = store.createChapter(other.id, 'X').chapter
    expect(codeOf(() => store.readText(workId, foreign.id, 'source'))).toBe('not_found')
    expect(codeOf(() => store.saveText(workId, foreign.id, 'source', 'x', 0, []))).toBe('not_found')
    expect(store.readText(other.id, foreign.id, 'source').rev).toBe(0)
  })

  it('restores every character exactly after closing and reopening', () => {
    const { store, dataDir, workId, chapterId } = setup()
    const samples: Array<[TextSide, string]> = [
      ['source', '山中药铺\r\n𠮷野家 😀 こんにちは\r\n\r\n末尾'],
      ['target', 'Hiệu thuốc trên núi.\nCuộc gặp gỡ — “tạm biệt”…\tHết.\n']
    ]
    for (const [side, text] of samples) {
      store.saveText(workId, chapterId, side, text, 0, [{ start: 0, end: text.length }])
    }
    store.close()
    stores.splice(stores.indexOf(store), 1)

    const reopened = open(dataDir)
    for (const [side, text] of samples) {
      const read = reopened.readText(workId, chapterId, side)
      expect(read.content).toBe(text)
      expect(read.segments).toHaveLength(1)
      expect(text.slice(read.segments[0].start, read.segments[0].end)).toBe(text)
    }
  })

  it('does not alter text on the way in: no newline or whitespace normalising', () => {
    const { store, workId, chapterId } = setup()
    const text = '  dòng một \r\ndòng hai\r\n\r\n cuối  '
    store.saveText(workId, chapterId, 'source', text, 0, [])
    expect(store.readText(workId, chapterId, 'source').content).toBe(text)
  })

  it('refuses text over the size limit and keeps the old text', () => {
    const { store, workId, chapterId } = setup()
    store.saveText(workId, chapterId, 'source', 'ổn', 0, [])
    expect(
      codeOf(() => store.saveText(workId, chapterId, 'source', 'x'.repeat(2_000_001), 1, []))
    ).toBe('validation')
    expect(store.readText(workId, chapterId, 'source')).toMatchObject({ content: 'ổn', rev: 1 })
  })

  it('counts a save as work on the work and on the chapter', () => {
    const { store, workId, chapterId } = setup()
    const before = store.get(workId).updatedAt
    store.saveText(workId, chapterId, 'source', 'x', 0, [])
    expect(store.get(workId).updatedAt).toBeGreaterThan(before)
    expect(store.list().works[0].updatedAt).toBe(store.get(workId).updatedAt)
  })
})

describe('segments', () => {
  const text = 'Câu một. Câu hai. Câu ba.'
  const three: SegmentInput[] = [
    { start: 0, end: 8 },
    { start: 9, end: 17 },
    { start: 18, end: 25 }
  ]

  it('gives each segment an id and anchors it to the new revision', () => {
    const { store, workId, chapterId } = setup()
    const saved = store.saveText(workId, chapterId, 'source', text, 0, three)
    expect(saved.segments).toHaveLength(3)
    expect(new Set(saved.segments.map((s) => s.id)).size).toBe(3)
    expect(saved.segments.map((s) => text.slice(s.start, s.end))).toEqual([
      'Câu một.',
      'Câu hai.',
      'Câu ba.'
    ])
    expect(saved.segments.every((s) => s.textRev === 1 && s.status === 'ok')).toBe(true)
  })

  it('keeps the ids it is given and re-anchors them to the new revision', () => {
    const { store, workId, chapterId } = setup()
    const first = store.saveText(workId, chapterId, 'source', text, 0, three)
    const edited = 'Câu một!! Câu hai. Câu ba.'
    const second = store.saveText(workId, chapterId, 'source', edited, 1, [
      { id: first.segments[0].id, start: 0, end: 10 },
      { id: first.segments[1].id, start: 11, end: 19 },
      { id: first.segments[2].id, start: 20, end: 27 - 1 }
    ])
    expect(second.segments.map((s) => s.id)).toEqual(first.segments.map((s) => s.id))
    expect(second.segments.every((s) => s.textRev === 2)).toBe(true)
  })

  it('refuses an id that belongs to another chapter or side, changing nothing', () => {
    const { store, workId, chapterId } = setup()
    const other = store.createChapter(workId, 'Hai').chapter
    const mine = store.saveText(workId, chapterId, 'source', text, 0, three)
    const theirs = store.saveText(workId, other.id, 'source', text, 0, three)

    expect(
      codeOf(() =>
        store.saveText(workId, chapterId, 'source', 'đổi', 1, [
          { id: theirs.segments[0].id, start: 0, end: 3 }
        ])
      )
    ).toBe('validation')
    expect(
      codeOf(() =>
        store.saveText(workId, chapterId, 'target', 'đổi', 0, [
          { id: mine.segments[0].id, start: 0, end: 3 }
        ])
      )
    ).toBe('validation')
    expect(store.readText(workId, chapterId, 'source')).toEqual(mine)
    expect(store.readText(workId, chapterId, 'target').rev).toBe(0)
  })

  it('rejects a bad region as a whole: neither text nor segments change', () => {
    const { store, workId, chapterId } = setup()
    const saved = store.saveText(workId, chapterId, 'source', text, 0, three)
    expect(
      codeOf(() =>
        store.saveText(workId, chapterId, 'source', 'ngắn', 1, [
          { id: saved.segments[0].id, start: 0, end: 4 },
          { start: 2, end: 50 }
        ])
      )
    ).toBe('validation')
    expect(store.readText(workId, chapterId, 'source')).toEqual(saved)
  })

  it('cuts emoji and Chinese outside the basic plane correctly using UTF-16 offsets', () => {
    const { store, workId, chapterId } = setup()
    const mixed = '😀 𠮷野家。'
    const parts = ['😀', ' ', '𠮷野家。']
    let at = 0
    const segments = parts.map((part) => {
      const segment = { start: at, end: at + part.length }
      at += part.length
      return segment
    })
    const saved = store.saveText(workId, chapterId, 'source', mixed, 0, segments)
    expect(saved.segments.map((s) => mixed.slice(s.start, s.end))).toEqual(parts)
  })

  it('removes the segments of a deleted chapter together with its text', () => {
    const { store, dataDir, workId, chapterId } = setup()
    store.saveText(workId, chapterId, 'source', text, 0, three)
    store.saveText(workId, chapterId, 'target', 'Dịch', 0, [{ start: 0, end: 4 }])
    store.deleteChapter(workId, chapterId)

    const db = openDatabase(workPath(dataDir, workId), { readOnly: true })
    try {
      for (const table of ['chapter_text', 'segment', 'link', 'link_member', 'provenance']) {
        const row = db.prepare('SELECT count(*) AS n FROM ' + table).get<{ n: number }>()
        expect(row?.n, table).toBe(0)
      }
    } finally {
      db.close()
    }
  })

  it('rolls the text back when the write fails halfway', () => {
    const { store, dataDir, workId, chapterId } = setup()
    const saved = store.saveText(workId, chapterId, 'source', text, 0, three)

    const db = openDatabase(workPath(dataDir, workId))
    db.exec(
      `CREATE TRIGGER boom BEFORE UPDATE OF updated_at ON work
       BEGIN SELECT RAISE(ABORT, 'boom'); END;`
    )
    db.close()

    expect(codeOf(() => store.saveText(workId, chapterId, 'source', 'mới', 1, []))).toBeDefined()
    expect(store.readText(workId, chapterId, 'source')).toEqual(saved)
  })
})

describe('links and provenance', () => {
  function withSegments(): {
    store: LibraryStore
    workId: string
    chapterId: string
    source: string[]
    target: string[]
  } {
    const { store, workId, chapterId } = setup()
    const source = store
      .saveText(workId, chapterId, 'source', 'A. B.', 0, [
        { start: 0, end: 2 },
        { start: 3, end: 5 }
      ])
      .segments.map((s) => s.id)
    const target = store
      .saveText(workId, chapterId, 'target', 'Một. Hai. Ba.', 0, [
        { start: 0, end: 4 },
        { start: 5, end: 9 },
        { start: 10, end: 13 }
      ])
      .segments.map((s) => s.id)
    return { store, workId, chapterId, source, target }
  }

  it('stores 1:1, 1:n and n:m links and reads them back with member order', () => {
    const { store, workId, chapterId, source, target } = withSegments()
    const oneToOne = store.createLink(workId, chapterId, {
      kind: 'ai',
      confidence: 0.9,
      members: [source[0], target[0]]
    })
    const oneToMany = store.createLink(workId, chapterId, {
      kind: 'user',
      members: [source[1], target[2], target[1]]
    })
    const links = store.listLinks(workId, chapterId)
    expect(links.map((l) => l.id).sort()).toEqual([oneToOne.id, oneToMany.id].sort())
    expect(links.find((l) => l.id === oneToMany.id)?.members).toEqual([
      source[1],
      target[2],
      target[1]
    ])
    expect(oneToOne).toMatchObject({ kind: 'ai', confidence: 0.9, status: 'ok' })
  })

  it('leaves segments without a link valid', () => {
    const { store, workId, chapterId } = withSegments()
    expect(store.listLinks(workId, chapterId)).toEqual([])
    expect(store.readText(workId, chapterId, 'source').segments).toHaveLength(2)
  })

  it('refuses links without both sides, with repeats, or with foreign segments', () => {
    const { store, workId, chapterId, source, target } = withSegments()
    const other = store.createChapter(workId, 'Hai').chapter
    const foreign = store.saveText(workId, other.id, 'source', 'X', 0, [{ start: 0, end: 1 }])
    expect(codeOf(() => store.createLink(workId, chapterId, { kind: 'ai', members: source }))).toBe(
      'validation'
    )
    expect(
      codeOf(() =>
        store.createLink(workId, chapterId, {
          kind: 'ai',
          members: [source[0], source[0], target[0]]
        })
      )
    ).toBe('validation')
    expect(
      codeOf(() =>
        store.createLink(workId, chapterId, {
          kind: 'ai',
          members: [foreign.segments[0].id, target[0]]
        })
      )
    ).toBe('validation')
    expect(
      codeOf(() =>
        store.createLink(workId, chapterId, {
          kind: 'ai',
          confidence: 1.5,
          members: [source[0], target[0]]
        })
      )
    ).toBe('validation')
    expect(store.listLinks(workId, chapterId)).toEqual([])
  })

  it('flags a link for review when one of its segments is removed', () => {
    const { store, workId, chapterId, source, target } = withSegments()
    const link = store.createLink(workId, chapterId, {
      kind: 'ai',
      members: [source[0], target[0]]
    })
    // Save the source again without its first segment.
    store.saveText(workId, chapterId, 'source', 'A. B.', 1, [{ id: source[1], start: 3, end: 5 }])
    const after = store.listLinks(workId, chapterId).find((l) => l.id === link.id)
    expect(after?.status).toBe('needs_review')
    expect(after?.members).toEqual([target[0]])
  })

  it('records and replaces where a segment came from, and keeps it after reopening', () => {
    const { store, workId, target } = withSegments()
    const mock = {
      segmentId: target[0],
      origin: 'mock' as const,
      provider: 'mock',
      model: null,
      at: 5
    }
    store.setProvenance(workId, mock)
    expect(store.getProvenance(workId, target[0])).toEqual(mock)
    const ai = {
      segmentId: target[0],
      origin: 'ai' as const,
      provider: 'openrouter',
      model: 'm',
      at: 9
    }
    store.setProvenance(workId, ai)
    expect(store.getProvenance(workId, target[0])).toEqual(ai)
    expect(store.getProvenance(workId, target[1])).toBeNull()
    expect(codeOf(() => store.setProvenance(workId, { ...mock, segmentId: 'nope' }))).toBe(
      'not_found'
    )
  })
})

describe('content flags on the chapter list', () => {
  it('answers from the covering index, never from the (possibly huge) text', () => {
    const { store, dataDir, workId } = setup()
    store.close()
    stores.splice(stores.indexOf(store), 1)
    const db = openDatabase(workPath(dataDir, workId), { readOnly: true })
    try {
      const plan = db
        .prepare('EXPLAIN QUERY PLAN ' + CHAPTER_SELECT + ' ORDER BY c.position')
        .all<{ detail: string }>()
        .map((row) => row.detail)
      expect(plan.some((line) => line.includes('COVERING INDEX chapter_text_presence'))).toBe(true)
      expect(plan.some((line) => line.includes('sqlite_autoindex_chapter_text'))).toBe(false)
    } finally {
      db.close()
    }
  })

  it('keeps size equal to the text length through saves, empty saves and reopening', () => {
    const { store, dataDir, workId, chapterId } = setup()
    const sizeOf = (side: string): number | undefined => {
      const db = openDatabase(workPath(dataDir, workId), { readOnly: true })
      try {
        return db
          .prepare('SELECT size FROM chapter_text WHERE chapter_id = ? AND side = ?')
          .get<{ size: number }>(chapterId, side)?.size
      } finally {
        db.close()
      }
    }
    expect(sizeOf('source')).toBeUndefined()
    store.saveText(workId, chapterId, 'source', 'a😀山', 0, [])
    expect(sizeOf('source')).toBe('a😀山'.length)
    store.saveText(workId, chapterId, 'source', '', 1, [])
    expect(sizeOf('source')).toBe(0)
    store.saveText(workId, chapterId, 'source', 'x'.repeat(1234), 2, [])
    expect(sizeOf('source')).toBe(1234)
    expect(store.listChapters(workId)[0].hasSource).toBe(true)
  })

  it('reports which sides have text and follows saves, empty saves and deletes', () => {
    const { store, workId, chapterId } = setup()
    const flags = (): [boolean, boolean] => {
      const chapter = store.listChapters(workId).find((c) => c.id === chapterId)!
      return [chapter.hasSource, chapter.hasTarget]
    }
    expect(flags()).toEqual([false, false])
    store.saveText(workId, chapterId, 'source', 'raw', 0, [])
    expect(flags()).toEqual([true, false])
    store.saveText(workId, chapterId, 'target', 'dịch', 0, [])
    expect(flags()).toEqual([true, true])
    store.saveText(workId, chapterId, 'source', '', 1, [])
    expect(flags()).toEqual([false, true])
  })

  it('returns the flags from every chapter change, so the list never goes stale', () => {
    const { store, workId, chapterId } = setup()
    store.saveText(workId, chapterId, 'source', 'raw', 0, [])
    const renamed = store.renameChapter(workId, chapterId, 'Đổi tên')
    expect(renamed.chapter).toMatchObject({ hasSource: true, hasTarget: false })
    const second = store.createChapter(workId, 'Hai').chapter
    expect(second).toMatchObject({ hasSource: false, hasTarget: false })
    const moved = store.moveChapter(workId, second.id, 1)
    expect(moved.chapters.map((c) => c.hasSource)).toEqual([false, true])
  })
})

describe('against a plain model', () => {
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

  const ALPHABET = ['a', 'ệ', '山', '😀', '𠮷', '\r\n', ' ', '.', '\n']

  for (const seed of [7, 8, 9, 20261001]) {
    it('keeps text, revision and segment ids in step with a model (seed ' + seed + ')', () => {
      const { store, workId, chapterId } = setup()
      const random = rng(seed)
      const pick = (n: number): number => Math.floor(random() * n)
      let model = { content: '', rev: 0, ids: [] as string[] }

      for (let step = 0; step < 120; step++) {
        const label = 'seed ' + seed + ' step ' + step
        const length = pick(40)
        let content = ''
        while (content.length < length) content += ALPHABET[pick(ALPHABET.length)]

        // Build non-overlapping regions at safe boundaries, reusing some existing ids.
        const segments: SegmentInput[] = []
        let at = 0
        const reusable = [...model.ids]
        while (at < content.length && segments.length < 6) {
          const room = content.length - at
          const size = Math.min(room, 1 + pick(8))
          const end = at + size
          const reuse = reusable.length > 0 && random() < 0.5 ? reusable.shift() : undefined
          segments.push(reuse ? { id: reuse, start: at, end } : { start: at, end })
          at = end + (random() < 0.3 ? 1 : 0)
          if (at > content.length) break
        }

        const stale = random() < 0.15
        if (stale) {
          expect(
            codeOf(() =>
              store.saveText(workId, chapterId, 'source', content, model.rev + 1, segments)
            ),
            label
          ).toBe('conflict')
        } else {
          const saved = store.saveText(workId, chapterId, 'source', content, model.rev, segments)
          model = { content, rev: model.rev + 1, ids: saved.segments.map((s) => s.id) }
          segments.forEach((input, index) => {
            if (input.id) expect(saved.segments[index].id, label).toBe(input.id)
          })
        }

        const read = store.readText(workId, chapterId, 'source')
        expect(read.content, label).toBe(model.content)
        expect(read.rev, label).toBe(model.rev)
        expect(
          read.segments.map((s) => s.id),
          label
        ).toEqual(model.ids)
        expect(
          read.segments.every((s) => s.textRev === read.rev || model.rev === 0),
          label
        ).toBe(true)
        let previous = 0
        for (const segment of read.segments) {
          expect(segment.start >= previous && segment.end <= read.content.length, label).toBe(true)
          previous = segment.end
        }
      }
    })
  }
})
