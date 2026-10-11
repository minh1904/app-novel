import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS } from '../../shared/contracts/channels'
import type { TextApi } from '../../shared/contracts/desktopApi'
import {
  describeSaveFailure,
  prepareImport,
  saveImport,
  type ImportPlan
} from '../../shared/text/rawImport'
import type { Result } from '../../shared/contracts/result'
import { segment } from '../../shared/segmentation/segmenter'
import type { TextRecord } from '../../shared/contracts/text'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

/**
 * Toàn bộ luồng import trên kho lưu trữ thật: văn bản chuẩn bị bằng hàm dùng chung, lưu qua
 * handler mà ứng dụng sử dụng, và đọc lại sau khi đóng rồi mở lại thư viện.
 */
const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function setup(lang: 'ja' | 'en' = 'ja'): {
  library: LibraryStore
  dataDir: string
  workId: string
  chapterId: string
  api: Pick<TextApi, 'save'>
} {
  const dataDir = tempDir()
  const library = LibraryStore.open({ dataDir })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  const work = library.create({ title: 'Thử', sourceLang: lang })
  const chapter = library.createChapter(work.id, 'Một').chapter
  const api: Pick<TextApi, 'save'> = {
    save: async (workId, chapterId, side, content, expectedRev, segments) =>
      (await handlers[CHANNELS.textSave]({
        workId,
        chapterId,
        side,
        content,
        expectedRev,
        segments
      })) as Result<TextRecord>
  }
  return { library, dataDir, workId: work.id, chapterId: chapter.id, api }
}

function plan(text: string, lang: 'ja' | 'en' = 'ja'): ImportPlan {
  const result = prepareImport({ kind: 'paste', text }, lang)
  if (!result.ok) throw new Error(result.message)
  return result.plan
}

const SAMPLE =
  '　「おはよう。」と彼は言った。今日は晴れだ。\r\n\r\n　「本当に？」彼女は笑った！\r\n𠮷野家は旨い。😀そうだ。\r\n'

describe('importing a source into a chapter', () => {
  it('stores the text and segments, and they are the same after closing and reopening', async () => {
    const { library, dataDir, workId, chapterId, api } = setup()
    const prepared = plan(SAMPLE)
    const saved = await saveImport(api, { workId, chapterId }, 0, prepared)
    expect(saved.ok).toBe(true)

    library.close()
    stores.splice(stores.indexOf(library), 1)
    const reopened = LibraryStore.open({ dataDir })
    stores.push(reopened)
    const read = reopened.readText(workId, chapterId, 'source')

    expect(read.content).toBe(prepared.text)
    expect(read.rev).toBe(1)
    expect(read.segments.map((s) => [s.start, s.end])).toEqual(
      prepared.segments.map((s) => [s.start, s.end])
    )
    expect(read.segments.map((s) => read.content.slice(s.start, s.end))).toEqual([
      '「おはよう。」',
      'と彼は言った。',
      '今日は晴れだ。',
      '「本当に？」',
      '彼女は笑った！',
      '𠮷野家は旨い。',
      '😀そうだ。'
    ])
    expect(reopened.listChapters(workId)[0]).toMatchObject({ hasSource: true, hasTarget: false })
  })

  it('keeps indentation and normalises only line endings', async () => {
    const { library, workId, chapterId, api } = setup()
    const prepared = plan(SAMPLE)
    await saveImport(api, { workId, chapterId }, 0, prepared)
    const text = library.readText(workId, chapterId, 'source').content
    expect(text.startsWith('　「')).toBe(true)
    expect(text).not.toContain('\r')
    expect(text.endsWith('そうだ。')).toBe(true)
  })

  it('stores exactly what the shared splitter computes, even for 5,000 segments', async () => {
    const { library, workId, chapterId, api } = setup('en')
    const text = Array.from({ length: 5000 }, (_, i) => 'Sentence number ' + i + '.').join('\n')
    const prepared = plan(text, 'en')
    expect(prepared.segments).toHaveLength(5000)
    expect((await saveImport(api, { workId, chapterId }, 0, prepared)).ok).toBe(true)
    const read = library.readText(workId, chapterId, 'source')
    expect(read.segments).toHaveLength(5000)
    expect(segment(read.content, 'en')).toEqual(
      read.segments.map((s) => ({ start: s.start, end: s.end }))
    )
  })

  it('refuses a stale revision, keeps the old source, and explains', async () => {
    const { library, workId, chapterId, api } = setup()
    await saveImport(api, { workId, chapterId }, 0, plan('最初の文。'))
    // Hộp thoại được mở khi chương còn trống (revision 0); có người đã lưu trong khoảng thời gian đó.
    const result = await saveImport(api, { workId, chapterId }, 0, plan('二番目の文。'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('conflict')
      expect(describeSaveFailure(result.error)).toMatch(/đã đổi ở nơi khác/)
    }
    expect(library.readText(workId, chapterId, 'source').content).toBe('最初の文。')
  })

  it('replaces a source using the revision that was current when the dialog opened', async () => {
    const { library, workId, chapterId, api } = setup()
    await saveImport(api, { workId, chapterId }, 0, plan('古い。'))
    const result = await saveImport(api, { workId, chapterId }, 1, plan('新しい。'))
    expect(result.ok).toBe(true)
    expect(library.readText(workId, chapterId, 'source')).toMatchObject({
      content: '新しい。',
      rev: 2
    })
  })

  it('reports a failure that the store reports, with the text still available to retry', async () => {
    const { workId, api } = setup()
    const prepared = plan('文。')
    const result = await saveImport(
      api,
      { workId, chapterId: '00000000-0000-4000-8000-000000000000' },
      0,
      prepared
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(describeSaveFailure(result.error)).toMatch(/Không tìm thấy chương/)
    expect(prepared.text).toBe('文。')
    expect(workId).toBeDefined()
  })
})

describe('replacing a source that already has a translation and links', () => {
  it('keeps the translation, gives the source new segments and flags the old links', async () => {
    const { library, workId, chapterId, api } = setup()
    await saveImport(api, { workId, chapterId }, 0, plan('甲。乙。'))
    const oldSource = library.readText(workId, chapterId, 'source')

    const target = library.saveText(workId, chapterId, 'target', 'Giáp. Ất.', 0, [
      { start: 0, end: 5 },
      { start: 6, end: 9 }
    ])
    const link = library.createLink(workId, chapterId, {
      kind: 'ai',
      members: [oldSource.segments[0].id, target.segments[0].id]
    })

    const replaced = await saveImport(
      api,
      { workId, chapterId },
      oldSource.rev,
      plan('丙。丁。戊。')
    )
    expect(replaced.ok).toBe(true)

    // Bản dịch giữ nguyên hoàn toàn như cũ, bao gồm cả các id.
    expect(library.readText(workId, chapterId, 'target')).toEqual(target)
    // Bản gốc là nội dung mới, với các segment id mới.
    const newSource = library.readText(workId, chapterId, 'source')
    expect(newSource.content).toBe('丙。丁。戊。')
    expect(newSource.segments).toHaveLength(3)
    const oldIds = new Set(oldSource.segments.map((s) => s.id))
    expect(newSource.segments.some((s) => oldIds.has(s.id))).toBe(false)
    // Liên kết vẫn còn, được đánh dấu cần xem lại, và chỉ còn lại phần tử thuộc bản dịch.
    const after = library.listLinks(workId, chapterId).find((l) => l.id === link.id)
    expect(after?.status).toBe('needs_review')
    expect(after?.members).toEqual([target.segments[0].id])
  })

  it('leaves everything alone when the new source is refused before saving', () => {
    const { library, workId, chapterId } = setup()
    library.saveText(workId, chapterId, 'source', '残る。', 0, [{ start: 0, end: 3 }])
    expect(prepareImport({ kind: 'paste', text: '   ' }, 'ja').ok).toBe(false)
    expect(library.readText(workId, chapterId, 'source').content).toBe('残る。')
  })
})
