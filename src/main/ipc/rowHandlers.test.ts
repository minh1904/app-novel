import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS } from '../../shared/contracts/channels'
import type { LinkRecord } from '../../shared/contracts/links'
import type { Result } from '../../shared/contracts/result'
import type { RowSaved } from '../../shared/contracts/rows'
import { segment } from '../../shared/segmentation/segmenter'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

/** The row channels as the app calls them: checked input, results, and the error codes. */
const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const SOURCE = 'One. Two.\nThree.'

function setup(): {
  handlers: ReturnType<typeof createLibraryHandlers>
  library: LibraryStore
  workId: string
  chapterId: string
  sourceIds: string[]
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const work = library.create({ title: 'Thử', sourceLang: 'en' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  const saved = library.saveText(work.id, chapter.id, 'source', SOURCE, 0, segment(SOURCE, 'en'))
  return {
    handlers: createLibraryHandlers(library),
    library,
    workId: work.id,
    chapterId: chapter.id,
    sourceIds: saved.segments.map((s) => s.id)
  }
}

describe('row channels', () => {
  it('save a row and give back the new translation and the links', async () => {
    const { handlers, workId, chapterId, sourceIds } = setup()
    const result = (await handlers[CHANNELS.rowSave]({
      workId,
      chapterId,
      sourceId: sourceIds[0],
      text: 'Một.',
      expectedRev: 0
    })) as Result<RowSaved>
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.target.content).toBe('Một.')
    expect(result.value.links).toHaveLength(1)
    expect(result.value.links[0]).toMatchObject({ kind: 'user', status: 'ok' })
    expect(result.value.links[0].reviewedAt).not.toBeNull()

    const listed = (await handlers[CHANNELS.linksList]({ workId, chapterId })) as Result<{
      links: LinkRecord[]
    }>
    expect(listed.ok && listed.value.links).toHaveLength(1)
  })

  it('refuse input that is not what the channel takes', async () => {
    const { handlers, workId, chapterId, sourceIds } = setup()
    const bad = [
      { workId: 'x', chapterId, sourceId: sourceIds[0], text: 'a', expectedRev: 0 },
      { workId, chapterId, sourceId: 'not-a-uuid', text: 'a', expectedRev: 0 },
      { workId, chapterId, sourceId: sourceIds[0], text: 5, expectedRev: 0 },
      { workId, chapterId, sourceId: sourceIds[0], text: 'a', expectedRev: -1 },
      { workId, chapterId, sourceId: sourceIds[0], text: 'a', expectedRev: 0, extra: 1 }
    ]
    for (const payload of bad) {
      const result = (await handlers[CHANNELS.rowSave](payload)) as Result<RowSaved>
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('validation')
    }
  })

  it('report a stale revision as a conflict and a missing row as not found', async () => {
    const { handlers, workId, chapterId, sourceIds } = setup()
    await handlers[CHANNELS.rowSave]({
      workId,
      chapterId,
      sourceId: sourceIds[0],
      text: 'Một.',
      expectedRev: 0
    })
    const stale = (await handlers[CHANNELS.rowSave]({
      workId,
      chapterId,
      sourceId: sourceIds[1],
      text: 'Hai.',
      expectedRev: 0
    })) as Result<RowSaved>
    expect(!stale.ok && stale.error.code).toBe('conflict')

    const missing = (await handlers[CHANNELS.rowSave]({
      workId,
      chapterId,
      sourceId: '00000000-0000-4000-8000-000000000000',
      text: 'x',
      expectedRev: 1
    })) as Result<RowSaved>
    expect(!missing.ok && missing.error.code).toBe('not_found')
  })

  it('confirm a row, refusing one with no translation', async () => {
    const { handlers, workId, chapterId, sourceIds } = setup()
    const empty = (await handlers[CHANNELS.rowReview]({
      workId,
      chapterId,
      sourceId: sourceIds[0]
    })) as Result<{ links: LinkRecord[] }>
    expect(!empty.ok && empty.error.code).toBe('validation')
  })

  it('pair in order and say how many', async () => {
    const { handlers, library, workId, chapterId } = setup()
    const text = 'Một. Hai. Ba.'
    library.saveText(workId, chapterId, 'target', text, 0, segment(text, 'vi'))
    const result = (await handlers[CHANNELS.rowsAutoPair]({ workId, chapterId })) as Result<{
      links: LinkRecord[]
      paired: number
    }>
    expect(result.ok && result.value.paired).toBe(3)
    expect(result.ok && result.value.links.every((l) => l.status === 'needs_review')).toBe(true)
  })
})
