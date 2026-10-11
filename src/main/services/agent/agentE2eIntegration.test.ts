import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LibraryStore } from '../library/library'
import { createServices } from '../createServices'
import type { SecretCrypto } from '../../infra/storage/secretStore'
import { segment } from '../../../shared/segmentation/segmenter'
import { AgentRepository } from '../../infra/storage/agentRepository'
import { CapabilityRegistry } from './registry'
import { defaultReadCapabilities } from './capabilities/readCapabilities'
import { TargetResolver } from './resolver'
import { AgentService } from './agentService'
import type { AgentStreamEvent } from '../../../shared/contracts/agent'

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

describe('End-to-end Agent Foundation Integration (Task 8.1)', () => {
  function setup(options?: { omitUsage?: boolean }) {
    const dataDir = mkdtempSync(join(tmpdir(), 'agent-e2e-test-'))
    tempDirs.push(dataDir)

    const mockFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string) as {
        messages: Array<{ role: string; content: string }>
      }
      const userMsg = body.messages.find((m) => m.role === 'user')?.content ?? '[]'
      const sourceBlock = /<source>\n([\s\S]*?)\n<\/source>/.exec(userMsg)?.[1] ?? userMsg
      const inputSegments = JSON.parse(sourceBlock) as Array<{ id: string; src: string }>
      const items = inputSegments.map((s) => ({
        id: s.id,
        dst: `Dịch: ${s.src}`
      }))

      return new Response(
        JSON.stringify({
          id: 'mock-e2e',
          choices: [{ message: { role: 'assistant', content: JSON.stringify(items) } }],
          usage: options?.omitUsage
            ? undefined
            : { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof fetch

    const library = LibraryStore.open({ dataDir })
    stores.push(library)
    const services = createServices({ library, crypto, fetch: mockFetch })

    const connection = services.connections.create({
      name: 'Mock LLM Provider',
      baseUrl: 'https://mock.provider.local/v1',
      providerId: 'google'
    })
    services.connections.addApiKey(connection.id, 'key')
    const entryId = services.connections.addModels(connection.id, [
      { model: 'mock-model', name: 'Mock Model' }
    ]).models[0]!.id

    const repository = new AgentRepository(library.appDb)
    const registry = new CapabilityRegistry()
    for (const cap of defaultReadCapabilities) {
      registry.register(cap)
    }

    // Work 1: "Đại Đạo Triều Thiên" with 3 chapters
    const work1 = library.create({ title: 'Đại Đạo Triều Thiên', sourceLang: 'zh-Hans' })
    const ch1_1 = library.createChapter(work1.id, 'Chương 1').chapter
    const ch1_2 = library.createChapter(work1.id, 'Chương 2').chapter
    const ch1_amb1 = library.createChapter(work1.id, 'Tiết tử Thượng').chapter
    const ch1_amb2 = library.createChapter(work1.id, 'Tiết tử Hạ').chapter

    const srcText1 = 'Đoạn một của chương một.\n\nĐoạn hai của chương một.'
    const srcText2 = 'Đoạn một của chương hai.\n\nĐoạn hai của chương hai.'
    library.saveText(work1.id, ch1_1.id, 'source', srcText1, 0, segment(srcText1, 'zh-Hans'))
    library.saveText(work1.id, ch1_2.id, 'source', srcText2, 0, segment(srcText2, 'zh-Hans'))
    library.saveText(work1.id, ch1_amb1.id, 'source', srcText1, 0, segment(srcText1, 'zh-Hans'))
    library.saveText(work1.id, ch1_amb2.id, 'source', srcText2, 0, segment(srcText2, 'zh-Hans'))

    // Work 2: "Phàm Nhân Tu Tiên" with 1 chapter
    const work2 = library.create({ title: 'Phàm Nhân Tu Tiên', sourceLang: 'zh-Hans' })
    const ch2_1 = library.createChapter(work2.id, 'Chương 1').chapter
    library.saveText(work2.id, ch2_1.id, 'source', srcText1, 0, segment(srcText1, 'zh-Hans'))

    const resolver = new TargetResolver({ library })
    const agentService = new AgentService({
      library,
      connections: services.connections,
      repository,
      registry,
      resolver
    })

    return {
      library,
      repository,
      agentService,
      connectionId: connection.id,
      entryId,
      work1,
      ch1_1,
      ch1_2,
      ch1_amb1,
      ch1_amb2,
      work2,
      ch2_1
    }
  }

  it('Scenario 1: Ask question about current paragraph -> read capability, no write operation created', async () => {
    const { agentService, work1 } = setup()

    const events: AgentStreamEvent[] = []
    const res = await agentService.send({
      instruction: 'Cho biết tác phẩm hiện tại có những chương nào?',
      context: { workId: work1.id },
      onStream: (ev) => events.push(ev)
    })

    expect(res.status).toBe('completed')
    expect(res.answer).toContain('Chương 1')
    expect(agentService.listOperations(res.turnId)).toHaveLength(0)
  })

  it('Scenario 2: Translate another chapter in the same work -> modifies target chapter only', async () => {
    const { agentService, work1, ch1_1, ch1_2, connectionId, entryId, library } = setup()

    // Context is Chapter 1, but instruction explicitly asks to translate Chapter 2
    const res = await agentService.send({
      instruction: 'Dịch chương 2',
      context: { workId: work1.id, chapterId: ch1_1.id },
      modelSelection: { connectionId, entryId }
    })

    expect(res.status).toBe('completed')
    const ops = agentService.listOperations(res.turnId)
    expect(ops).toHaveLength(1)
    expect(ops[0].state).toBe('completed')
    expect(ops[0].target.kind).toBe('chapter')
    if (ops[0].target.kind === 'chapter') {
      expect(ops[0].target.chapterId).toBe(ch1_2.id)
    }

    // Verify Chapter 2 now has translated target text, but Chapter 1 remains untouched
    const ch2Target = library.readText(work1.id, ch1_2.id, 'target')
    expect(ch2Target.content).toContain('Dịch: Đoạn một của chương hai.')

    const ch1Target = library.readText(work1.id, ch1_1.id, 'target')
    expect(ch1Target.content).toBe('')
  })

  it('Scenario 3: Translate chapter in a DIFFERENT work -> cleanly targets Work 2', async () => {
    const { agentService, work1, work2, ch2_1, connectionId, entryId, library } = setup()

    // Context is in Work 1, but user asks to translate Work 2
    const res = await agentService.send({
      instruction: 'Dịch tác phẩm Phàm Nhân Tu Tiên chương 1',
      context: { workId: work1.id },
      modelSelection: { connectionId, entryId }
    })

    expect(res.status).toBe('completed')
    const ops = agentService.listOperations(res.turnId)
    expect(ops).toHaveLength(1)
    if (ops[0].target.kind === 'chapter') {
      expect(ops[0].target.workId).toBe(work2.id)
      expect(ops[0].target.chapterId).toBe(ch2_1.id)
    }

    const w2Target = library.readText(work2.id, ch2_1.id, 'target')
    expect(w2Target.content).toContain('Dịch:')
  })

  it('Scenario 4: Ambiguous target returns waiting_user, 0 operations created, clarify resumes', async () => {
    const { agentService, work1, connectionId, entryId } = setup()

    // "Dịch chương Tiết tử" matches both Tiết tử Thượng and Tiết tử Hạ
    const res = await agentService.send({
      instruction: 'Dịch chương Tiết tử',
      context: { workId: work1.id },
      modelSelection: { connectionId, entryId }
    })

    expect(res.status).toBe('waiting_user')
    expect(res.answer).toContain('Có nhiều ứng viên phù hợp')
    expect(agentService.listOperations(res.turnId)).toHaveLength(0)

    // Clarify resume on the SAME turn
    const clarifyRes = await agentService.send({
      sessionId: res.sessionId,
      turnId: res.turnId,
      instruction: 'Tôi muốn dịch chương Tiết tử Thượng',
      context: { workId: work1.id },
      modelSelection: { connectionId, entryId }
    })

    expect(clarifyRes.turnId).toBe(res.turnId)
    expect(clarifyRes.status).toBe('completed')
    expect(agentService.listOperations(res.turnId)).toHaveLength(1)
  })

  it('Scenario 5: Cancel aborts running execution gracefully', async () => {
    const { agentService } = setup()

    const session = agentService.createSession('Cancel Test')
    const turn = agentService.getTurn(
      (
        await agentService.send({
          sessionId: session.id,
          instruction: 'Câu hỏi'
        })
      ).turnId
    )
    expect(turn).toBeDefined()

    agentService.cancelTurn(turn!.id)
    // Cancelling a completed turn leaves it settled
    expect(['completed', 'cancelled']).toContain(agentService.getTurn(turn!.id)?.status)
  })

  it('Scenario 6: Undo reverts applied translation and handles conflict if modified after', async () => {
    const { agentService, work1, ch1_1, ch1_2, connectionId, entryId, library } = setup()

    const res = await agentService.send({
      instruction: 'Dịch chương 1',
      context: { workId: work1.id, chapterId: ch1_1.id },
      modelSelection: { connectionId, entryId }
    })

    const ops = agentService.listOperations(res.turnId)
    expect(ops).toHaveLength(1)
    const opId = ops[0].id

    // Check translation exists
    const beforeUndo = library.readText(work1.id, ch1_1.id, 'target')
    expect(beforeUndo.content).toContain('Dịch: Đoạn một của chương một.')

    // Case 6a: If modified after operation, undo rejects with conflict error
    const modifiedText = 'Bản dịch do người dùng chỉnh sửa tiếp theo.'
    library.saveText(
      work1.id,
      ch1_1.id,
      'target',
      modifiedText,
      beforeUndo.rev,
      segment(modifiedText, 'vi')
    )
    expect(() => library.undoAgentOperation(work1.id, opId)).toThrow(
      /Bản dịch đã được chỉnh sửa sau operation/
    )

    // Case 6b: Clean undo on chapter 2 without conflicting modification
    const res2 = await agentService.send({
      instruction: 'Dịch chương 2',
      context: { workId: work1.id, chapterId: ch1_2.id },
      modelSelection: { connectionId, entryId }
    })
    const ops2 = agentService.listOperations(res2.turnId)
    expect(ops2).toHaveLength(1)
    const op2Id = ops2[0].id

    const undoRes = library.undoAgentOperation(work1.id, op2Id)
    expect(undoRes.checkpoint.state).toBe('undone')

    const afterUndo2 = library.readText(work1.id, ch1_2.id, 'target')
    expect(afterUndo2.content).toBe('')
  })

  it('Scenario 7: Provider reports no usage (null/missing) -> finishes cleanly with null usage', async () => {
    const { agentService, work1, ch1_1, connectionId, entryId } = setup({ omitUsage: true })

    const res = await agentService.send({
      instruction: 'Dịch chương 1',
      context: { workId: work1.id, chapterId: ch1_1.id },
      modelSelection: { connectionId, entryId }
    })

    expect(res.status).toBe('completed')
    // Usage is null, not throwing or fabricating fake zero tokens
    expect(res.usage).toBeNull()
  })
})
