import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { getProposal } from '../../infra/storage/aiProposals'
import { createAiSession, startAiTurn } from '../../infra/storage/aiSessions'
import { LibraryStore } from '../library/library'
import type { ToolProposalInput } from '../ai/chatTools'
import { createToolProposalInDb } from './chatProposalService'
import { acceptProposalParts } from './proposalService'

const tempDir = createTempDirs()

const TARGET = 'Một.\n\nHai.\n\nBa.'

function fresh(): { library: LibraryStore; workId: string; chapterId: string } {
  const library = LibraryStore.open({ dataDir: tempDir(), now: () => 100, newId: randomUUID })
  const work = library.create({ title: 'Tác phẩm', sourceLang: 'ja' })
  const chapter = library.createChapter(work.id)
  library.saveText(work.id, chapter.chapter.id, 'source', '一。\n\n二。\n\n三。', 0, [])
  library.saveText(work.id, chapter.chapter.id, 'target', TARGET, 0, [])
  library.withWork(work.id, (db) => {
    createAiSession(db, 's', 'Hỏi', 1)
    startAiTurn(db, {
      id: 't',
      sessionId: 's',
      chapterId: chapter.chapter.id,
      action: 'chat',
      question: 'Sửa đoạn 2',
      location: { caret: { source: null, target: 2 }, selection: null },
      droppedTurns: 0,
      provider: 'p',
      model: 'm',
      now: 2
    })
  })
  return { library, workId: work.id, chapterId: chapter.chapter.id }
}

function input(chapterId: string, patch: Partial<ToolProposalInput> = {}): ToolProposalInput {
  const from = TARGET.indexOf('Hai.')
  return {
    turnId: 't',
    chapterId,
    commandId: 't:1',
    sourceRev: 1,
    sourceContent: '一。\n\n二。\n\n三。',
    targetBaseRev: 1,
    targetBaseContent: TARGET,
    part: {
      baseFrom: from,
      baseTo: from + 4,
      beforeText: 'Hai.',
      afterText: 'Hai đã sửa.',
      sourceOrder: null,
      sourceText: null,
      status: 'pending'
    },
    ...patch
  }
}

describe('createToolProposalInDb', () => {
  it('stores a review proposal tied to the turn and its session, without touching the text', () => {
    const { library, workId, chapterId } = fresh()
    const created = library.withWork(workId, (db) =>
      createToolProposalInDb(db, input(chapterId), 100, randomUUID)
    )
    const saved = library.withWork(workId, (db) => getProposal(db, created.proposalId))
    expect(saved).toMatchObject({
      origin: 'chat',
      policy: 'review',
      turnId: 't',
      sessionId: 's',
      provider: 'p',
      model: 'm'
    })
    expect(saved.parts.map((part) => [part.id, part.status])).toEqual([
      [created.partIds[0], 'pending']
    ])
    expect(library.readText(workId, chapterId, 'target')).toMatchObject({ content: TARGET, rev: 1 })

    const accepted = library.withWork(workId, (db) =>
      acceptProposalParts(db, {
        chapterId,
        partIds: created.partIds,
        commandId: randomUUID(),
        actor: 'user',
        now: 101,
        newId: randomUUID
      })
    )
    expect(accepted.content).toBe('Một.\n\nHai đã sửa.\n\nBa.')
    library.close()
  })

  it('makes one proposal for a command id that runs twice', () => {
    const { library, workId, chapterId } = fresh()
    const first = library.withWork(workId, (db) =>
      createToolProposalInDb(db, input(chapterId), 100, randomUUID)
    )
    const again = library.withWork(workId, (db) =>
      createToolProposalInDb(db, input(chapterId), 100, randomUUID)
    )
    expect(again).toEqual(first)
    const second = library.withWork(workId, (db) =>
      createToolProposalInDb(db, input(chapterId, { commandId: 't:2' }), 100, randomUUID)
    )
    expect(second.proposalId).not.toBe(first.proposalId)
    library.close()
  })

  it('refuses an anchor that does not match the base, and another chapter than the turn', () => {
    const { library, workId, chapterId } = fresh()
    const wrong = input(chapterId)
    wrong.part = { ...wrong.part, beforeText: 'Ba.' }
    expect(() =>
      library.withWork(workId, (db) => createToolProposalInDb(db, wrong, 100, randomUUID))
    ).toThrow('Vùng thay thế không khớp')
    const other = library.createChapter(workId).chapter.id
    expect(() =>
      library.withWork(workId, (db) => createToolProposalInDb(db, input(other), 100, randomUUID))
    ).toThrow('Lượt AI không thuộc chương')
    library.close()
  })
})
