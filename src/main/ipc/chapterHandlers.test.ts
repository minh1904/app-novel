import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/channels'
import type { ChapterChange, ChapterItem, ChaptersChange } from '../../shared/chapters'
import type { WorkSummary } from '../../shared/library'
import type { Result } from '../../shared/result'
import { LibraryStore } from '../storage/library'
import { fakeJpegDataUrl } from '../storage/testCover'
import { createTempDirs } from '../storage/testing'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const OTHER_ID = '11111111-1111-4111-8111-111111111111'

function setup(): {
  library: LibraryStore
  workId: string
  call<T = unknown>(channel: Channel, raw?: unknown): Result<T>
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  const work = library.create({ title: 'Hiệu thuốc trên núi', sourceLang: 'zh-Hans' })
  return {
    library,
    workId: work.id,
    call: (channel, raw) => handlers[channel](raw) as Result<never>
  }
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error('expected ok, got ' + result.error.code)
  return result.value
}

const codeOf = (result: Result<unknown>): string | undefined =>
  result.ok ? undefined : result.error.code

describe('chapter IPC handlers', () => {
  it('creates, renames, moves, opens and deletes through validated calls', () => {
    const { call, workId } = setup()
    const first = value(call<ChapterChange>(CHANNELS.chaptersCreate, { workId, title: 'A' }))
    const second = value(call<ChapterChange>(CHANNELS.chaptersCreate, { workId, title: ' B \n' }))
    expect(second.chapter.title).toBe('B')
    expect(second.work.chapterCount).toBe(2)

    const renamed = value(
      call<ChapterChange>(CHANNELS.chaptersRename, {
        workId,
        chapterId: first.chapter.id,
        title: 'Mở\r\nđầu'
      })
    )
    expect(renamed.chapter.title).toBe('Mở đầu')

    const moved = value(
      call<ChaptersChange>(CHANNELS.chaptersMove, { workId, chapterId: second.chapter.id, to: 1 })
    )
    expect(moved.chapters.map((c) => c.title)).toEqual(['B', 'Mở đầu'])

    const opened = value(
      call<{ work: WorkSummary }>(CHANNELS.chaptersOpen, { workId, chapterId: second.chapter.id })
    )
    expect(opened.work.lastChapter?.id).toBe(second.chapter.id)

    const deleted = value(
      call<ChaptersChange>(CHANNELS.chaptersDelete, { workId, chapterId: second.chapter.id })
    )
    expect(deleted.chapters).toHaveLength(1)
    expect(deleted.work.lastChapter).toBeNull()
    expect(
      value(call<{ chapters: ChapterItem[] }>(CHANNELS.chaptersList, { workId })).chapters
    ).toEqual(deleted.chapters)
  })

  it('creates a chapter without a title', () => {
    const { call, workId } = setup()
    const created = value(call<ChapterChange>(CHANNELS.chaptersCreate, { workId }))
    expect(created.chapter).toMatchObject({ title: '', number: 1 })
  })

  it.each([
    ['a missing work id', CHANNELS.chaptersCreate, {}],
    ['a path-like work id', CHANNELS.chaptersList, { workId: '../library' }],
    ['a non-text title', CHANNELS.chaptersCreate, { title: 5 }],
    ['an oversized title', CHANNELS.chaptersCreate, { title: 'x'.repeat(201) }],
    ['an unexpected field', CHANNELS.chaptersCreate, { path: 'C:\\evil' }],
    ['null', CHANNELS.chaptersList, null]
  ])('rejects %s without touching data', (_name, channel, extra) => {
    const { call, workId, library } = setup()
    const raw =
      extra && typeof extra === 'object' && !('workId' in extra) && Object.keys(extra).length > 0
        ? { workId, ...extra }
        : extra
    const result = call(channel, raw)
    expect(codeOf(result)).toBe('validation')
    expect(library.listChapters(workId)).toEqual([])
  })

  it('rejects bad move targets and chapter ids as validation errors', () => {
    const { call, workId } = setup()
    const { chapter } = value(call<ChapterChange>(CHANNELS.chaptersCreate, { workId, title: 'A' }))
    const base = { workId, chapterId: chapter.id }

    for (const to of [0, -1, 1.5, '2', null, undefined]) {
      expect(codeOf(call(CHANNELS.chaptersMove, { ...base, to }))).toBe('validation')
    }
    expect(codeOf(call(CHANNELS.chaptersMove, { ...base, to: 2 }))).toBe('validation')
    expect(codeOf(call(CHANNELS.chaptersRename, { workId, chapterId: 'abc', title: 'x' }))).toBe(
      'validation'
    )
    expect(codeOf(call(CHANNELS.chaptersDelete, { workId }))).toBe('validation')
  })

  it('refuses a chapter that belongs to another work and changes nothing', () => {
    const { call, workId, library } = setup()
    const other = library.create({ title: 'Truyện khác', sourceLang: 'en' })
    const foreign = library.createChapter(other.id, 'Của truyện khác').chapter
    library.createChapter(workId, 'Của tôi')
    const before = library.listChapters(workId)

    const ref = { workId, chapterId: foreign.id }
    const attempts: [Channel, unknown][] = [
      [CHANNELS.chaptersRename, { ...ref, title: 'X' }],
      [CHANNELS.chaptersMove, { ...ref, to: 1 }],
      [CHANNELS.chaptersDelete, ref],
      [CHANNELS.chaptersOpen, ref]
    ]
    for (const [channel, raw] of attempts) {
      expect(codeOf(call(channel, raw)), channel).toBe('not_found')
    }
    expect(library.listChapters(workId)).toEqual(before)
    expect(library.listChapters(other.id)).toHaveLength(1)
  })

  it('returns not_found for an unknown work', () => {
    const { call } = setup()
    expect(codeOf(call(CHANNELS.chaptersList, { workId: OTHER_ID }))).toBe('not_found')
    expect(codeOf(call(CHANNELS.chaptersCreate, { workId: OTHER_ID }))).toBe('not_found')
  })

  it('saves details and cover together through works:update', () => {
    const { call, workId } = setup()
    const updated = value(
      call<WorkSummary>(CHANNELS.worksUpdate, {
        id: workId,
        patch: { author: 'Lý Minh', cover: fakeJpegDataUrl(2_000, 3) }
      })
    )
    expect(updated.author).toBe('Lý Minh')
    expect(updated.coverVersion).not.toBeNull()

    const removed = value(
      call<WorkSummary>(CHANNELS.worksUpdate, { id: workId, patch: { cover: null } })
    )
    expect(removed.coverVersion).toBeNull()
    expect(
      codeOf(call(CHANNELS.worksUpdate, { id: workId, patch: { cover: 'data:text/html,x' } }))
    ).toBe('validation')
  })

  it('refuses untrusted senders on every chapter channel', () => {
    const { library, workId } = setup()
    const guarded = guardHandlers(createLibraryHandlers(library), () => false)
    for (const channel of [
      CHANNELS.chaptersList,
      CHANNELS.chaptersCreate,
      CHANNELS.chaptersRename,
      CHANNELS.chaptersMove,
      CHANNELS.chaptersDelete,
      CHANNELS.chaptersOpen
    ]) {
      const result = guarded[channel]('iframe', { workId, title: 'Injected' })
      expect(codeOf(result), channel).toBe('untrusted_sender')
    }
    expect(library.listChapters(workId)).toEqual([])
  })
})
