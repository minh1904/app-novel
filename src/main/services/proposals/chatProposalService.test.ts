import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { ChatProposalInput } from '../../../shared/contracts/aiProposals'
import { createTempDirs } from '../../testing/testing'
import { getProposal } from '../../infra/storage/aiProposals'
import { createAiSession, startAiTurn, updateAiTurn } from '../../infra/storage/aiSessions'
import { LibraryStore } from '../library/library'
import { textHash } from './proposalService'
import { createChatProposal } from './chatProposalService'

const tempDir = createTempDirs()

function fresh(): { library: LibraryStore; workId: string; chapterId: string } {
  const library = LibraryStore.open({ dataDir: tempDir(), now: () => 100, newId: randomUUID })
  const work = library.create({ title: 'Tác phẩm', sourceLang: 'ja' })
  const chapter = library.createChapter(work.id)
  library.saveText(work.id, chapter.chapter.id, 'source', '原文', 0, [])
  return { library, workId: work.id, chapterId: chapter.chapter.id }
}

function input(workId: string, chapterId: string, action: ChatProposalInput['action']): ChatProposalInput {
  return {
    workId, chapterId, commandId: randomUUID(), action, blockAutoApply: false,
    sourceRev: 1, sourceContent: '原文', targetBaseRev: 0, targetBaseContent: '',
    range: { from: 0, to: 0, text: '' }, replacement: 'Bản dịch'
  }
}

describe('chat proposal service', () => {
  it('stores a review proposal without changing a blank translation', () => {
    const { library, workId, chapterId } = fresh()
    const result = createChatProposal(library, input(workId, chapterId, 'edit'))
    expect(result).toMatchObject({ status: 'pending', content: null, rev: null })
    expect(library.readText(workId, chapterId, 'target')).toMatchObject({ content: '', rev: 0 })
    expect(library.withWork(workId, (db) => getProposal(db, result.proposalId)).parts[0].afterText).toBe('Bản dịch')
    library.close()
  })

  it('uses the same accept service for direct apply and is idempotent', () => {
    const { library, workId, chapterId } = fresh()
    const request = input(workId, chapterId, 'apply')
    const first = createChatProposal(library, request)
    expect(first).toMatchObject({ status: 'applied', content: 'Bản dịch', rev: 1 })
    expect(createChatProposal(library, request).proposalId).toBe(first.proposalId)
    expect(library.readText(workId, chapterId, 'target').rev).toBe(1)
    library.close()
  })

  it('keeps a direct action for review if source changed or editor has unsaved text', () => {
    const { library, workId, chapterId } = fresh()
    const request = input(workId, chapterId, 'apply')
    library.saveText(workId, chapterId, 'source', '変更', 1, [])
    expect(createChatProposal(library, request).status).toBe('stale')
    expect(library.readText(workId, chapterId, 'target').content).toBe('')
    const blocked = { ...request, commandId: randomUUID(), blockAutoApply: true }
    expect(createChatProposal(library, blocked).status).toBe('conflict')
    library.close()
  })

  it('rejects a wrong chapter or an anchor that does not match the sent base', () => {
    const { library, workId, chapterId } = fresh()
    expect(() => createChatProposal(library, { ...input(workId, chapterId, 'edit'),
      range: { from: 0, to: 0, text: 'khác' }
    })).toThrow()
    expect(() => createChatProposal(library, input(workId, randomUUID(), 'edit'))).toThrow()
    library.close()
  })

  it('links the completed turn and hashes the context blocks it sent', () => {
    const { library, workId, chapterId } = fresh()
    const sessionId = randomUUID()
    const turnId = randomUUID()
    const context = [{ kind: 'chapter-source' as const, label: 'Bản gốc',
      detail: '2 ký tự', text: '原文' }]
    library.withWork(workId, (db) => {
      createAiSession(db, sessionId, 'Dịch', 100)
      startAiTurn(db, {
        id: turnId, sessionId, chapterId, action: 'edit', question: 'Dịch', context,
        range: { from: 0, to: 0, text: '', targetIds: [] },
        droppedTurns: 0, provider: 'google', model: 'gemini', now: 100
      })
      updateAiTurn(db, turnId, { status: 'done', answer: 'Bản dịch',
        usage: { inputTokens: 12, outputTokens: 4 } }, 101)
    })
    const result = createChatProposal(library, { ...input(workId, chapterId, 'edit'), turnId })
    const stored = library.withWork(workId, (db) => getProposal(db, result.proposalId))
    expect(stored).toMatchObject({ sessionId, turnId, provider: 'google', model: 'gemini' })
    expect(stored.context).toEqual(context)
    expect(stored.contextHash).toBe(textHash(JSON.stringify(context)))
    expect(stored.usage).toMatchObject({ inputTokens: 12, outputTokens: 4 })
    library.close()
  })
})
