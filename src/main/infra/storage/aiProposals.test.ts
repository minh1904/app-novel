import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { createAiSession, startAiTurn } from './aiSessions'
import {
  type CreateProposalInput,
  createProposal,
  getProposal,
  getTextSnapshotByCommand,
  insertTextSnapshot,
  listChapterProposals,
  pendingCountByChapter,
  setProposalPartDecision
} from './aiProposals'
import { migrate } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { workSchema } from './workSchema'
import { LibraryStore } from '../../services/library/library'

const tempDir = createTempDirs()

function fresh(): Db {
  const db = openDatabase(join(tempDir(), 'ai-proposals.mira'))
  migrate(db, workSchema)
  db.exec(`
    INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w', 'Tác phẩm', 'ja', 1, 1);
    INSERT INTO chapter (id, position, created_at, updated_at) VALUES ('c1', 0, 1, 1), ('c2', 1, 1, 1);
  `)
  return db
}

const input = (chapterId = 'c1'): CreateProposalInput => ({
  id: 'p1', chapterId, origin: 'chat' as const, policy: 'review' as const,
  sourceRev: 2, sourceHash: 'source-hash', targetBaseRev: 3,
  targetBaseContent: 'Một\nHai', context: [{ text: 'nguồn' }], contextHash: 'context-hash',
  runKey: 'run:one', now: 10,
  parts: [
    { id: 'part1', baseFrom: 0, baseTo: 3, beforeText: 'Một', afterText: 'Mới' },
    { id: 'part2', baseFrom: 4, baseTo: 7, beforeText: 'Hai', afterText: 'Khác' }
  ]
})

describe('persistent proposals', () => {
  it('stores parts and returns the original result for a retried run key', () => {
    const db = fresh()
    const first = createProposal(db, input())
    expect(first.parts.map((part) => part.id)).toEqual(['part1', 'part2'])
    expect(first.context).toEqual([{ text: 'nguồn' }])
    const retry = createProposal(db, { ...input(), id: 'p2', parts: [{ ...input().parts[0], id: 'other' }] })
    expect(retry.id).toBe('p1')
    expect(listChapterProposals(db, 'c1', 10)).toHaveLength(1)
    db.close()
  })

  it('links a chat proposal only to a turn in the same chapter and session', () => {
    const db = fresh()
    createAiSession(db, 'session', '', 1)
    startAiTurn(db, {
      id: 'turn', sessionId: 'session', chapterId: 'c1', action: 'sua', question: 'Sửa',
      context: [], droppedTurns: 0, provider: null, model: null, now: 2
    })
    expect(() => createProposal(db, { ...input('c2'), id: 'other', runKey: 'other', sessionId: 'session', turnId: 'turn' })).toThrow()
    expect(createProposal(db, { ...input(), sessionId: 'session', turnId: 'turn' }).turnId).toBe('turn')
    db.close()
  })

  it('counts pending by chapter and persists decisions and checkpoints', () => {
    const db = fresh()
    createProposal(db, input())
    createProposal(db, {
      ...input('c2'), id: 'p2', runKey: 'run:two',
      parts: [{ id: 'part3', baseFrom: null, baseTo: null, beforeText: '', afterText: 'Mới', status: 'needs-placement' }]
    })
    expect(pendingCountByChapter(db)).toEqual([
      { chapterId: 'c1', count: 2 }, { chapterId: 'c2', count: 1 }
    ])
    setProposalPartDecision(db, 'part1', 'applied', 'auto', null, 11)
    setProposalPartDecision(db, 'part2', 'rejected', 'user', null, 12)
    insertTextSnapshot(db, {
      id: 'snapshot', commandId: 'cmd', chapterId: 'c1', beforeRev: 3, afterRev: 4,
      beforeContent: 'Một\nHai', decisions: [{ partId: 'part1', status: 'pending' }],
      actor: 'auto', createdAt: 11
    })
    expect(pendingCountByChapter(db)).toEqual([{ chapterId: 'c2', count: 1 }])
    db.close()

    const reopened = openDatabase(db.path)
    migrate(reopened, workSchema)
    expect(getProposal(reopened, 'p1').parts.map((part) => part.status)).toEqual(['applied', 'rejected'])
    expect(getTextSnapshotByCommand(reopened, 'cmd')?.beforeContent).toBe('Một\nHai')
    reopened.close()
  })

  it('rolls back the whole proposal when one part is invalid', () => {
    const db = fresh()
    expect(() => createProposal(db, {
      ...input(), parts: [{ ...input().parts[0] }, { ...input().parts[1], baseFrom: 10, baseTo: 5 }]
    })).toThrow()
    expect(listChapterProposals(db, 'c1', 10)).toEqual([])
    db.close()
  })

  it('keeps proposals, decisions, checkpoints and session links through backup and restore', () => {
    const library = LibraryStore.open({ dataDir: tempDir() })
    try {
      const work = library.create({ title: 'Sao lưu', sourceLang: 'ja' })
      const chapter = library.createChapter(work.id).chapter
      library.withWork(work.id, (db) => db.transaction(() => {
        createAiSession(db, 'session', 'Hội thoại', 1)
        startAiTurn(db, {
          id: 'turn', sessionId: 'session', chapterId: chapter.id, action: 'sua',
          question: 'Sửa', context: [], droppedTurns: 0, provider: null, model: null, now: 2
        })
        createProposal(db, {
          ...input(chapter.id), sessionId: 'session', turnId: 'turn'
        })
        setProposalPartDecision(db, 'part1', 'applied', 'user', null, 11)
        insertTextSnapshot(db, {
          id: 'snapshot', commandId: 'cmd', chapterId: chapter.id,
          beforeRev: 0, afterRev: 1, beforeContent: '',
          decisions: [{ partId: 'part1', status: 'pending' }], actor: 'user', createdAt: 11
        })
      }))
      const path = join(tempDir(), 'backup.mira')
      library.exportWork(work.id, path)
      const restored = library.restoreWork(path)
      library.withWork(restored.id, (db) => {
        expect(getProposal(db, 'p1')).toMatchObject({
          sessionId: 'session', turnId: 'turn', parts: [{ status: 'applied' }, { status: 'pending' }]
        })
        expect(getTextSnapshotByCommand(db, 'cmd')?.beforeContent).toBe('')
      })
    } finally { library.close() }
  })
})
