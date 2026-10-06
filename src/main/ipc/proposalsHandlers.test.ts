import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS } from '../../shared/contracts/channels'
import type { ChatProposalInput } from '../../shared/contracts/aiProposals'
import { TEXT_MAX_UNITS } from '../../shared/contracts/text'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => { for (const store of stores.splice(0)) store.close() })

function setup(): { library: LibraryStore; workId: string; chapterId: string; handlers: ReturnType<typeof createLibraryHandlers> } {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const work = library.create({ title: 'T', sourceLang: 'ja' })
  const chapter = library.createChapter(work.id)
  library.saveText(work.id, chapter.chapter.id, 'source', '原文', 0, [])
  return { library, workId: work.id, chapterId: chapter.chapter.id,
    handlers: createLibraryHandlers(library) }
}

const payload = (workId: string, chapterId: string): ChatProposalInput => ({
  workId, chapterId, commandId: randomUUID(), action: 'apply', blockAutoApply: false,
  sourceRev: 1, sourceContent: '原文', targetBaseRev: 0, targetBaseContent: '',
  range: { from: 0, to: 0, text: '' }, replacement: 'Bản dịch'
})

describe('proposal IPC boundary', () => {
  it('rejects wrong types and oversized text before touching storage', async () => {
    const { workId, chapterId, handlers } = setup()
    const badId = await handlers[CHANNELS.aiProposalChatCreate]({
      ...payload(workId, chapterId), commandId: '../outside'
    })
    expect(badId.ok).toBe(false)
    const badAction = await handlers[CHANNELS.aiProposalChatCreate]({
      ...payload(workId, chapterId), action: 'unknown'
    })
    expect(badAction.ok).toBe(false)
    const badType = await handlers[CHANNELS.aiProposalChatCreate]({
      ...payload(workId, chapterId), targetBaseRev: '0'
    })
    expect(badType.ok).toBe(false)
    const tooLong = await handlers[CHANNELS.aiProposalChatCreate]({
      ...payload(workId, chapterId), replacement: 'x'.repeat(TEXT_MAX_UNITS + 1)
    })
    expect(tooLong.ok).toBe(false)
  })

  it('rejects another work, missing chapter and foreign part ID', async () => {
    const { library, workId, chapterId, handlers } = setup()
    const wrongWork = await handlers[CHANNELS.aiProposalChatCreate](payload(randomUUID(), chapterId))
    expect(wrongWork.ok).toBe(false)
    const deleted = library.createChapter(workId)
    library.deleteChapter(workId, deleted.chapter.id)
    const missingChapter = await handlers[CHANNELS.aiProposalChatCreate](payload(workId, deleted.chapter.id))
    expect(missingChapter.ok).toBe(false)
    const foreignPart = await handlers[CHANNELS.aiProposalAccept]({
      workId, chapterId, partId: randomUUID(), commandId: randomUUID()
    })
    expect(foreignPart.ok).toBe(false)
  })

  it('accepts a complete direct action and lists the durable session boundary', async () => {
    const { workId, chapterId, handlers } = setup()
    const created = await handlers[CHANNELS.aiProposalChatCreate](payload(workId, chapterId))
    expect(created.ok).toBe(true)
    const sessions = await handlers[CHANNELS.aiSessionsList]({ workId })
    expect(sessions.ok).toBe(true)
  })
})
