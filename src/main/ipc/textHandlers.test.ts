import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import type { ChapterChange, ChapterItem } from '../../shared/contracts/chapters'
import type { Result } from '../../shared/contracts/result'
import { TEXT_MAX_UNITS, type TextRecord } from '../../shared/contracts/text'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function setup(): {
  library: LibraryStore
  workId: string
  chapterId: string
  call<T = unknown>(channel: Channel, raw?: unknown): Result<T>
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  const work = library.create({ title: 'Truyện', sourceLang: 'ja' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  return {
    library,
    workId: work.id,
    chapterId: chapter.id,
    call: (channel, raw) => handlers[channel](raw) as Result<never>
  }
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok)
    throw new Error('expected ok, got ' + result.error.code + ': ' + result.error.message)
  return result.value
}
const codeOf = (result: Result<unknown>): string | undefined =>
  result.ok ? undefined : result.error.code

describe('text IPC handlers', () => {
  it('reads an unsaved side as empty, saves, and reads back', () => {
    const { call, workId, chapterId } = setup()
    const ref = { workId, chapterId, side: 'source' }
    expect(value(call<TextRecord>(CHANNELS.textGet, ref))).toEqual({
      content: '',
      rev: 0,
      segments: []
    })

    const saved = value(
      call<TextRecord>(CHANNELS.textSave, {
        ...ref,
        content: 'Xin chào. 😀',
        expectedRev: 0,
        segments: [
          { start: 0, end: 9 },
          { start: 10, end: 12 }
        ]
      })
    )
    expect(saved.rev).toBe(1)
    expect(saved.segments).toHaveLength(2)
    expect(value(call<TextRecord>(CHANNELS.textGet, ref))).toEqual(saved)
  })

  it('reports a stale revision as conflict', () => {
    const { call, workId, chapterId } = setup()
    const ref = { workId, chapterId, side: 'target' }
    value(call(CHANNELS.textSave, { ...ref, content: 'a', expectedRev: 0, segments: [] }))
    const stale = call(CHANNELS.textSave, { ...ref, content: 'b', expectedRev: 0, segments: [] })
    expect(codeOf(stale)).toBe('conflict')
    expect(value(call<TextRecord>(CHANNELS.textGet, ref)).content).toBe('a')
  })

  it.each([
    ['an unknown side', { side: 'both' }],
    ['a path-like work id', { workId: '../library' }],
    ['a missing chapter id', { chapterId: undefined }],
    ['an unexpected field', { path: 'C:\\evil' }],
    ['a non-text content', { content: 5 }],
    ['content over the limit', { content: 'x'.repeat(TEXT_MAX_UNITS + 1) }],
    ['a negative revision', { expectedRev: -1 }],
    ['a fractional revision', { expectedRev: 0.5 }],
    ['a non-array segment list', { segments: 'nope' }],
    ['a segment with a text offset', { segments: [{ start: '0', end: 1 }] }],
    ['a segment with a negative offset', { segments: [{ start: -1, end: 1 }] }],
    ['a segment with a bad id', { segments: [{ id: 'abc', start: 0, end: 1 }] }],
    ['a segment with an extra field', { segments: [{ start: 0, end: 1, text: 'x' }] }]
  ])('rejects %s without touching data', (_name, patch) => {
    const { call, library, workId, chapterId } = setup()
    const base = {
      workId,
      chapterId,
      side: 'source',
      content: 'ok',
      expectedRev: 0,
      segments: []
    }
    const result = call(CHANNELS.textSave, { ...base, ...patch })
    expect(codeOf(result)).toBe('validation')
    expect(library.readText(workId, chapterId, 'source').rev).toBe(0)
  })

  it('rejects an invalid region as a validation error and keeps the old text', () => {
    const { call, workId, chapterId } = setup()
    const ref = { workId, chapterId, side: 'source' }
    value(call(CHANNELS.textSave, { ...ref, content: 'abcdef', expectedRev: 0, segments: [] }))
    const result = call(CHANNELS.textSave, {
      ...ref,
      content: 'abc',
      expectedRev: 1,
      segments: [{ start: 0, end: 10 }]
    })
    expect(codeOf(result)).toBe('validation')
    expect(value(call<TextRecord>(CHANNELS.textGet, ref)).content).toBe('abcdef')
  })

  it('refuses a chapter of another work', () => {
    const { call, library, workId } = setup()
    const other = library.create({ title: 'Khác', sourceLang: 'en' })
    const foreign = library.createChapter(other.id, 'X').chapter
    expect(codeOf(call(CHANNELS.textGet, { workId, chapterId: foreign.id, side: 'source' }))).toBe(
      'not_found'
    )
    expect(
      codeOf(
        call(CHANNELS.textSave, {
          workId,
          chapterId: foreign.id,
          side: 'source',
          content: 'x',
          expectedRev: 0,
          segments: []
        })
      )
    ).toBe('not_found')
    expect(library.readText(other.id, foreign.id, 'source').rev).toBe(0)
  })

  it('refuses untrusted senders on both text channels', () => {
    const { library, workId, chapterId } = setup()
    const guarded = guardHandlers(createLibraryHandlers(library), () => false)
    for (const channel of [CHANNELS.textGet, CHANNELS.textSave]) {
      const result = guarded[channel]('iframe', {
        workId,
        chapterId,
        side: 'source',
        content: 'Injected',
        expectedRev: 0,
        segments: []
      }) as Result<unknown>
      expect(codeOf(result), channel).toBe('untrusted_sender')
    }
    expect(library.readText(workId, chapterId, 'source').rev).toBe(0)
  })

  it('carries the content flags through every chapters channel', () => {
    const { call, library, workId, chapterId } = setup()
    library.saveText(workId, chapterId, 'source', 'raw', 0, [])
    const listed = value(call<{ chapters: ChapterItem[] }>(CHANNELS.chaptersList, { workId }))
    expect(listed.chapters[0]).toMatchObject({ hasSource: true, hasTarget: false })
    const created = value(call<ChapterChange>(CHANNELS.chaptersCreate, { workId }))
    expect(created.chapter).toMatchObject({ hasSource: false, hasTarget: false })
  })
})
