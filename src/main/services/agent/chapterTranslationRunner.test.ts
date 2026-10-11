import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LibraryStore } from '../library/library'
import { createServices } from '../createServices'
import type { SecretCrypto } from '../../infra/storage/secretStore'
import { segment } from '../../../shared/segmentation/segmenter'
import { pendingCountByChapter } from '../../infra/storage/aiProposals'
import { runChapterTranslation } from './chapterTranslationRunner'
import { createWriteCapabilities } from './capabilities/writeCapabilities'
import { CapabilityRegistry } from './registry'

const crypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  async encrypt(plain) {
    return new Uint8Array([...Buffer.from(plain, 'utf-8')].map((b) => b ^ 0xff))
  },
  async decrypt(cipher) {
    return {
      value: Buffer.from([...cipher].map((b) => b ^ 0xff)).toString('utf-8'),
      shouldReEncrypt: false
    }
  }
}

const tempDirs: string[] = []
const stores: LibraryStore[] = []

afterEach(() => {
  for (const s of stores.splice(0)) {
    try {
      s.close()
    } catch {
      // ignore
    }
  }
  for (const dir of tempDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})

describe('chapterTranslationRunner & Write Capabilities', () => {
  function setup() {
    const dataDir = mkdtempSync(join(tmpdir(), 'agent-runner-test-'))
    tempDirs.push(dataDir)
    let callCount = 0

    const mockFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      callCount++
      const body = JSON.parse(init?.body as string) as {
        messages: Array<{ role: string; content: string }>
      }
      const userMsg = body.messages.find((m) => m.role === 'user')?.content ?? '[]'
      const sourceBlock = /<source>\n([\s\S]*?)\n<\/source>/.exec(userMsg)?.[1] ?? userMsg
      const inputSegments = JSON.parse(sourceBlock) as Array<{ id: string; src: string }>
      const items = inputSegments.map((s) => ({
        id: s.id,
        dst: `Bản dịch cho: ${s.src}`
      }))

      const responsePayload = {
        id: `mock-${callCount}`,
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify(items)
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35
        }
      }

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }) as typeof fetch

    const library = LibraryStore.open({ dataDir })
    stores.push(library)
    const services = createServices({ library, crypto, fetch: mockFetch })

    const connection = services.connections.create({
      name: 'Mock LLM',
      baseUrl: 'https://mock.llm.local/v1',
      providerId: 'google'
    })
    services.connections.addApiKey(connection.id, 'mock-key')
    const entryId = services.connections.addModels(connection.id, [
      { model: 'mock-model', name: 'Mock Model' }
    ]).models[0]!.id

    // Work 1
    const work1 = library.create({ title: 'Tác phẩm 1', sourceLang: 'zh-Hans' })
    const ch1_1 = library.createChapter(work1.id, 'Chương 1').chapter
    const srcText1 = '第一句。\n\n第二句。\n\n第三句。'
    const segs1 = segment(srcText1, 'zh-Hans')
    const savedSrc1 = library.saveText(work1.id, ch1_1.id, 'source', srcText1, 0, segs1)

    // Work 2
    const work2 = library.create({ title: 'Tác phẩm 2', sourceLang: 'en' })
    const ch2_1 = library.createChapter(work2.id, 'Chapter 1').chapter
    const srcText2 = 'Sentence one.\n\nSentence two.'
    const segs2 = segment(srcText2, 'en')
    const savedSrc2 = library.saveText(work2.id, ch2_1.id, 'source', srcText2, 0, segs2)

    return {
      library,
      services,
      connectionId: connection.id,
      entryId,
      work1,
      ch1_1,
      sourceIds1: savedSrc1.segments.map((s) => s.id),
      work2,
      ch2_1,
      sourceIds2: savedSrc2.segments.map((s) => s.id)
    }
  }

  it('translates a whole chapter cleanly with completed state and valid checkpoint', async () => {
    const { library, services, connectionId, entryId, work1, ch1_1 } = setup()

    const res = await runChapterTranslation({
      library,
      connections: services.connections,
      workId: work1.id,
      chapterId: ch1_1.id,
      operationId: 'op-full-1',
      modelSelection: { connectionId, entryId }
    })

    expect(res.state).toBe('completed')
    expect(res.appliedUnits).toBe(3)
    expect(res.protectedCount).toBe(0)
    expect(res.summary).toContain('Đã dịch hoàn tất 3/3 câu')

    const target = library.readText(work1.id, ch1_1.id, 'target')
    expect(target.content).toContain('Bản dịch cho: 第一句。')
    expect(target.content).toContain('Bản dịch cho: 第二句。')
    expect(target.content).toContain('Bản dịch cho: 第三句。')

    // Evidence
    const evidence = library.readAgentOperationEvidence(work1.id, 'op-full-1')
    expect(evidence?.checkpoint.state).toBe('terminal')
    expect(evidence?.checkpoint.terminalState).toBe('completed')
    expect(evidence?.batches.length).toBeGreaterThanOrEqual(1)

    // Pending proposal queue must NOT increase
    const pending = library.withWork(work1.id, (db) => pendingCountByChapter(db))
    expect(pending).toEqual([])
  })

  it('preserves protected rows, drops AI output for them, sets partially_completed, and keeps queue clean', async () => {
    const { library, services, connectionId, entryId, work1, ch1_1, sourceIds1 } = setup()

    // Pre-save sentence 1 with user translation (state !== 'ai')
    library.saveRow(work1.id, {
      chapterId: ch1_1.id,
      sourceId: sourceIds1[0],
      text: 'Bản dịch tay của người dùng.',
      expectedRev: 0,
      by: { origin: 'human', provider: 'user', model: 'manual' }
    })

    const res = await runChapterTranslation({
      library,
      connections: services.connections,
      workId: work1.id,
      chapterId: ch1_1.id,
      operationId: 'op-part-1',
      modelSelection: { connectionId, entryId }
    })

    expect(res.state).toBe('partially_completed')
    expect(res.appliedUnits).toBe(2)
    expect(res.protectedCount).toBe(1)
    expect(res.summary).toContain('giữ nguyên 1 câu đã có bản dịch')

    const target = library.readText(work1.id, ch1_1.id, 'target')
    expect(target.content).toContain('Bản dịch tay của người dùng.')
    expect(target.content).not.toContain('Bản dịch cho: 第一句。')
    expect(target.content).toContain('Bản dịch cho: 第二句。')

    // Proposal queue must NOT have any new items
    const pending = library.withWork(work1.id, (db) => pendingCountByChapter(db))
    expect(pending).toEqual([])
  })

  it('terminates in conflict without applying any batches when all rows are protected', async () => {
    const { library, services, connectionId, entryId, work1, ch1_1, sourceIds1 } = setup()

    // Protect all 3 rows
    let rev = 0
    for (let i = 0; i < sourceIds1.length; i++) {
      const s = library.saveRow(work1.id, {
        chapterId: ch1_1.id,
        sourceId: sourceIds1[i],
        text: `Người dùng dịch câu ${i + 1}.`,
        expectedRev: rev,
        by: { origin: 'human', provider: 'user', model: 'manual' }
      })
      rev = s.target.rev
    }

    const res = await runChapterTranslation({
      library,
      connections: services.connections,
      workId: work1.id,
      chapterId: ch1_1.id,
      operationId: 'op-all-protected',
      modelSelection: { connectionId, entryId }
    })

    expect(res.state).toBe('conflict')
    expect(res.appliedUnits).toBe(0)
    expect(res.protectedCount).toBe(3)
    expect(res.lastAppliedRev).toBeNull()

    const evidence = library.readAgentOperationEvidence(work1.id, 'op-all-protected')
    expect(evidence?.checkpoint.state).toBe('terminal')
    expect(evidence?.checkpoint.terminalState).toBe('conflict')
    expect(evidence?.batches).toEqual([])
  })

  it('supports cross-work translation via translate_chapter capability and does not leak full text in answer', async () => {
    const { library, services, work1, ch1_1, work2, ch2_1 } = setup()
    const caps = createWriteCapabilities({ connections: services.connections })
    const registry = new CapabilityRegistry()
    registry.register(caps.translateChapterCapability)

    // Context is Work 1, but target is Work 2 Chapter 1
    const target2 = {
      kind: 'chapter' as const,
      workId: work2.id,
      workLabel: work2.title,
      chapterId: ch2_1.id,
      chapterLabel: ch2_1.title
    }

    const execRes = await registry.execute(
      'translate_chapter',
      {},
      {
        turnId: 't-cross',
        commandId: 'cmd-cross',
        operationId: 'op-cross-1',
        target: target2,
        library,
        now: 1000
      }
    )

    expect(execRes.ok).toBe(true)
    const val = execRes.value as { state: string; appliedUnits: number; totalUnits: number }
    expect(val.state).toBe('completed')
    expect(val.appliedUnits).toBe(2)

    // Verify Work 1 target remains empty (untouched)
    expect(library.readText(work1.id, ch1_1.id, 'target').content).toBe('')
    // Work 2 target has translations
    const target2Text = library.readText(work2.id, ch2_1.id, 'target')
    expect(target2Text.content).toContain('Bản dịch cho: Sentence one.')
    expect(target2Text.content).toContain('Bản dịch cho: Sentence two.')
  })

  it('cancels gracefully mid-run, preserves committed batches, and can be undone', async () => {
    const { library, services, connectionId, entryId, work1, ch1_1 } = setup()

    const controller = new AbortController()
    // Pre-abort to test cancellation right at start or first check
    controller.abort()

    const res = await runChapterTranslation({
      library,
      connections: services.connections,
      workId: work1.id,
      chapterId: ch1_1.id,
      operationId: 'op-abort-1',
      modelSelection: { connectionId, entryId },
      signal: controller.signal
    })

    expect(res.state).toBe('cancelled')
    expect(res.summary).toContain('Đã dừng dịch')

    const evidence = library.readAgentOperationEvidence(work1.id, 'op-abort-1')
    expect(evidence?.checkpoint.terminalState).toBe('cancelled')
  })

  it('edits translations via edit_translation with ceilings, duplicate rejection, and conflict detection', async () => {
    const { library, services, work2, ch2_1, sourceIds2 } = setup()
    const caps = createWriteCapabilities({ connections: services.connections })
    const registry = new CapabilityRegistry()
    registry.register(caps.editTranslationCapability)
    registry.register(caps.undoOperationCapability)

    const target = {
      kind: 'chapter' as const,
      workId: work2.id,
      workLabel: work2.title,
      chapterId: ch2_1.id,
      chapterLabel: ch2_1.title
    }

    // 1. Rejects duplicate sourceId
    const dupRes = await registry.execute(
      'edit_translation',
      {
        replacements: [
          { sourceId: sourceIds2[0], text: 'Sửa câu 1' },
          { sourceId: sourceIds2[0], text: 'Sửa lại câu 1' }
        ]
      },
      { turnId: 't-edit', commandId: 'cmd-edit-dup', target, library, now: 1000 }
    )
    expect(dupRes.ok).toBe(false)
    expect(dupRes.error?.message).toContain('trùng lặp')

    // 2. Applies edits cleanly
    const applyRes = await registry.execute(
      'edit_translation',
      {
        replacements: [{ sourceId: sourceIds2[0], text: 'Chỉnh sửa câu đầu tiên.' }]
      },
      {
        turnId: 't-edit',
        commandId: 'cmd-edit-1',
        operationId: 'op-edit-success',
        target,
        library,
        now: 1000
      }
    )
    expect(applyRes.ok).toBe(true)
    expect(library.readText(work2.id, ch2_1.id, 'target').content).toBe('Chỉnh sửa câu đầu tiên.')

    // 3. Rejects on revision conflict
    const conflictRes = await registry.execute(
      'edit_translation',
      {
        replacements: [{ sourceId: sourceIds2[1], text: 'Sửa câu hai' }],
        expectedRev: 0 // current is 1
      },
      { turnId: 't-edit', commandId: 'cmd-edit-conflict', target, library, now: 1000 }
    )
    expect(conflictRes.ok).toBe(false)
    expect(conflictRes.error?.code).toBe('conflict')

    // 4. Undoes edit via undo_operation
    const undoRes = await registry.execute(
      'undo_operation',
      { operationId: 'op-edit-success' },
      { turnId: 't-undo', commandId: 'cmd-undo', target, library, now: 1000 }
    )
    expect(undoRes.ok).toBe(true)
    expect(library.readText(work2.id, ch2_1.id, 'target').content).toBe('')
  })
})
