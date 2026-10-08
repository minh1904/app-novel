import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS } from '../../shared/contracts/channels'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function setup(): {
  library: LibraryStore
  workId: string
  chapterId: string
  handlers: ReturnType<typeof createLibraryHandlers>
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const work = library.create({ title: 'T', sourceLang: 'ja' })
  const chapter = library.createChapter(work.id)
  library.saveText(work.id, chapter.chapter.id, 'source', '原文', 0, [])
  return {
    library,
    workId: work.id,
    chapterId: chapter.chapter.id,
    handlers: createLibraryHandlers(library)
  }
}

describe('proposal IPC boundary', () => {
  it('has no way for the renderer to create a chat proposal', () => {
    const { handlers } = setup()
    expect(Object.keys(handlers).some((channel) => channel.includes('proposals:chat'))).toBe(false)
  })

  it('rejects wrong types before touching storage', async () => {
    const { workId, chapterId, handlers } = setup()
    const badId = await handlers[CHANNELS.aiProposalAccept]({
      workId,
      chapterId,
      partId: '../outside',
      commandId: randomUUID()
    })
    expect(badId.ok).toBe(false)
    const badType = await handlers[CHANNELS.aiProposalDeny]({ workId, chapterId, partId: 1 })
    expect(badType.ok).toBe(false)
  })

  it('rejects another work, missing chapter and foreign part ID', async () => {
    const { library, workId, chapterId, handlers } = setup()
    const wrongWork = await handlers[CHANNELS.aiProposalAccept]({
      workId: randomUUID(),
      chapterId,
      partId: randomUUID(),
      commandId: randomUUID()
    })
    expect(wrongWork.ok).toBe(false)
    const deleted = library.createChapter(workId)
    library.deleteChapter(workId, deleted.chapter.id)
    const missingChapter = await handlers[CHANNELS.aiProposalAccept]({
      workId,
      chapterId: deleted.chapter.id,
      partId: randomUUID(),
      commandId: randomUUID()
    })
    expect(missingChapter.ok).toBe(false)
    const foreignPart = await handlers[CHANNELS.aiProposalAccept]({
      workId,
      chapterId,
      partId: randomUUID(),
      commandId: randomUUID()
    })
    expect(foreignPart.ok).toBe(false)
  })

  it('lists the durable session boundary', async () => {
    const { workId, handlers } = setup()
    const sessions = await handlers[CHANNELS.aiSessionsList]({ workId })
    expect(sessions.ok).toBe(true)
  })
})
