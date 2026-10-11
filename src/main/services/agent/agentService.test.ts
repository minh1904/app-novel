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
import { validateAgentEventSequence } from '../../../shared/contracts/agent'

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

describe('AgentService (Module 5)', () => {
  function setup() {
    const dataDir = mkdtempSync(join(tmpdir(), 'agent-service-test-'))
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
          id: 'mock-1',
          choices: [{ message: { role: 'assistant', content: JSON.stringify(items) } }],
          usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof fetch

    const library = LibraryStore.open({ dataDir })
    stores.push(library)
    const services = createServices({ library, crypto, fetch: mockFetch })

    const connection = services.connections.create({
      name: 'Mock LLM',
      baseUrl: 'https://mock.service.local/v1',
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

    // Work 1 with chapters
    const work1 = library.create({ title: 'Đại Đạo', sourceLang: 'zh-Hans' })
    const ch1_1 = library.createChapter(work1.id, 'Chương 1').chapter
    const ch1_2 = library.createChapter(work1.id, 'Tiết tử Thượng').chapter
    const ch1_3 = library.createChapter(work1.id, 'Tiết tử Hạ').chapter
    const src1 = 'Câu một.\n\nCâu hai.'
    library.saveText(work1.id, ch1_1.id, 'source', src1, 0, segment(src1, 'zh-Hans'))
    library.saveText(work1.id, ch1_2.id, 'source', src1, 0, segment(src1, 'zh-Hans'))
    library.saveText(work1.id, ch1_3.id, 'source', src1, 0, segment(src1, 'zh-Hans'))

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
      registry,
      services,
      agentService,
      connectionId: connection.id,
      entryId,
      work1,
      ch1_1,
      ch1_2
    }
  }

  it('rejects concurrent sends in the same session with turn_in_progress', async () => {
    const { agentService, repository } = setup()

    const session = agentService.createSession('Test Session')
    // Manually insert an active turn
    repository.createTurn({
      id: 'active-turn',
      sessionId: session.id,
      instruction: 'Đang chạy...',
      context: {},
      now: 1000
    })

    const streamEvents: AgentStreamEvent[] = []
    await expect(
      agentService.send({
        sessionId: session.id,
        instruction: 'Gửi thêm lệnh',
        onStream: (ev) => streamEvents.push(ev)
      })
    ).rejects.toMatchObject({ code: 'conflict' })

    // Verify stream received turn_in_progress error
    const errEv = streamEvents.find((e) => e.kind === 'error')
    expect(errEv).toBeDefined()
    expect(errEv?.error).toMatchObject({ code: 'turn_in_progress' })
  })

  it('Scenario 1: Questions do not create write operations and produce stream ending in done', async () => {
    const { agentService, work1 } = setup()

    const streamEvents: AgentStreamEvent[] = []
    const res = await agentService.send({
      instruction: 'Cho biết tác phẩm có những chương nào?',
      context: { workId: work1.id },
      onStream: (ev) => streamEvents.push(ev)
    })

    expect(res.status).toBe('completed')
    expect(res.answer).toContain('Chương 1')

    // No write operations created
    const ops = agentService.listOperations(res.turnId)
    expect(ops).toEqual([])

    // Validate stream events sequence: monotonic eventSeq, exactly one terminal
    const validation = validateAgentEventSequence(streamEvents)
    expect(validation).toEqual({ ok: true })
    expect(streamEvents[streamEvents.length - 1].kind).toBe('done')
  })

  it('Scenario 2: Clear write command resolves target, creates write operation, and executes cleanly', async () => {
    const { agentService, work1, ch1_1, connectionId, entryId } = setup()

    const streamEvents: AgentStreamEvent[] = []
    const res = await agentService.send({
      instruction: 'Dịch chương 1',
      context: { workId: work1.id, chapterId: ch1_1.id },
      modelSelection: { connectionId, entryId },
      onStream: (ev) => streamEvents.push(ev)
    })

    expect(res.status).toBe('completed')
    expect(res.answer).toContain('Đã dịch')

    // Write operation was created and completed
    const ops = agentService.listOperations(res.turnId)
    expect(ops.length).toBe(1)
    expect(ops[0].capability).toBe('translate_chapter')
    expect(ops[0].state).toBe('completed')

    // Validate stream event sequence
    const validation = validateAgentEventSequence(streamEvents)
    expect(validation).toEqual({ ok: true })

    const opEvents = streamEvents.filter((e) => e.kind === 'operation')
    expect(opEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('Scenario 3: Ambiguous write command yields waiting_user, creates NO operation, and clarify-resume continues same turn', async () => {
    const { agentService, work1, connectionId, entryId } = setup()

    const streamEvents: AgentStreamEvent[] = []
    // "Dịch chương Tiết tử" matches both "Tiết tử Thượng" and "Tiết tử Hạ"
    const res = await agentService.send({
      instruction: 'Dịch chương Tiết tử',
      context: { workId: work1.id },
      modelSelection: { connectionId, entryId },
      onStream: (ev) => streamEvents.push(ev)
    })

    expect(res.status).toBe('waiting_user')
    expect(res.answer).toContain('Có nhiều ứng viên phù hợp')

    // NO operation created for ambiguous request!
    const ops = agentService.listOperations(res.turnId)
    expect(ops).toEqual([])

    // Stream ended with done waiting_user
    const lastEvent = streamEvents[streamEvents.length - 1]
    expect(lastEvent.kind).toBe('done')
    if (lastEvent.kind === 'done') {
      expect(lastEvent.turnState).toBe('waiting_user')
    }

    // Clarify-resume: user answers clarification on the SAME turn
    const clarifyEvents: AgentStreamEvent[] = []
    const resumeRes = await agentService.send({
      sessionId: res.sessionId,
      turnId: res.turnId,
      instruction: 'Tôi muốn dịch chương Tiết tử Hạ',
      context: { workId: work1.id },
      modelSelection: { connectionId, entryId },
      onStream: (ev) => clarifyEvents.push(ev)
    })

    // Continued on same turnId!
    expect(resumeRes.turnId).toBe(res.turnId)
    expect(resumeRes.status).toBe('completed')

    const newOps = agentService.listOperations(res.turnId)
    expect(newOps.length).toBe(1)
    expect(newOps[0].capability).toBe('translate_chapter')
  })

  it('startup reconciler marks unsettled running turns as interrupted', () => {
    const { agentService, repository } = setup()

    const session = agentService.createSession('Crash Session')
    repository.createTurn({
      id: 'crashed-turn-1',
      sessionId: session.id,
      instruction: 'Đang dịch dở thì sập nguồn...',
      context: {},
      now: 1000
    })

    const recon = agentService.reconcileOnStartup()
    expect(recon.settledTurns).toBe(1)

    const turn = repository.getTurn('crashed-turn-1')
    expect(turn?.status).toBe('interrupted')
    expect(turn?.answer).toContain('gián đoạn do ứng dụng đóng bất ngờ')
  })

  it('cancelTurn aborts running execution and marks turn cancelled', () => {
    const { agentService, repository } = setup()

    const session = agentService.createSession('Cancel Session')
    repository.createTurn({
      id: 'cancel-turn',
      sessionId: session.id,
      instruction: 'Lệnh cần hủy',
      context: {},
      now: 1000
    })

    agentService.cancelTurn('cancel-turn')
    const turn = repository.getTurn('cancel-turn')
    expect(turn?.status).toBe('cancelled')
  })
})
