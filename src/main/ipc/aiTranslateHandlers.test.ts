import { afterEach, describe, expect, it } from 'vitest'
import type { ConnectionView } from '../../shared/contracts/aiConnections'
import type { TranslateBatchResult, TranslatePlan } from '../../shared/contracts/aiTranslate'
import { CHANNELS } from '../../shared/contracts/channels'
import type { LinkRecord } from '../../shared/contracts/links'
import type { Result } from '../../shared/contracts/result'
import { segment } from '../../shared/algorithms/segmenter'
import { ChapterTranslator } from '../services/ai/chapterTranslation'
import { ConnectionService } from '../services/ai/connectionService'
import { LibraryStore } from '../services/library/library'
import { SecretStore, type SecretCrypto } from '../infra/storage/secretStore'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

/**
 * Dịch chương bằng AI, gọi đúng như app gọi: qua handler, trên kho thật, với một endpoint giả.
 * Điều phải đúng trước mọi thứ khác: **không ghi đè câu người dùng đã viết hay đã soát**.
 */

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const NOW = 1_700_000_000_000
const MODEL = 'gemini-flash-latest'
const SOURCE = 'One. Two. Three.'

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

interface Reply {
  status?: number
  /** Trả về `dst` cho từng `src`; mặc định là tiền tố "VI:". */
  translate?: (src: string) => string
  /** Bỏ câu ở vị trí này trong lô, để thử nhánh thiếu segment. */
  skipIndex?: number
  body?: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

/** Endpoint tương thích OpenAI giả. Mỗi phần tử của `replies` phục vụ một lời gọi, rồi lặp cái cuối. */
function fakeEndpoint(replies: Reply[]): { fetchImpl: typeof fetch; calls: string[][] } {
  const calls: string[][] = []
  let index = 0
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    const reply = replies[Math.min(index++, replies.length - 1)]
    const sent = JSON.parse(String(init?.body ?? '{}')) as {
      messages?: Array<{ content?: string }>
    }
    const asked = JSON.parse(sent.messages?.[1]?.content ?? '[]') as Array<{
      id: string
      src: string
    }>
    calls.push(asked.map((item) => item.id))

    if (reply.status !== undefined && reply.status >= 400) {
      return new Response(reply.body ?? '{"error":{"message":"nope"}}', { status: reply.status })
    }
    const items = asked
      .filter((_item, at) => at !== reply.skipIndex)
      .map((item) => ({ id: item.id, dst: (reply.translate ?? ((src) => 'VI:' + src))(item.src) }))
    const payload: Record<string, unknown> = {
      choices: [{ message: { content: JSON.stringify(items) } }]
    }
    if (reply.usage) payload.usage = reply.usage
    return new Response(JSON.stringify(payload), { status: 200 })
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

interface Harness {
  handlers: ReturnType<typeof createLibraryHandlers>
  library: LibraryStore
  workId: string
  chapterId: string
  sourceIds: string[]
  connectionId: string
  calls: string[][]
}

async function setup(replies: Reply[] = [{}], options: { key?: string } = {}): Promise<Harness> {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  let counter = 0
  const fakeId = (n: number): string => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
  const { fetchImpl, calls } = fakeEndpoint(replies)
  const connections = new ConnectionService({
    db: library.appDb,
    secrets: new SecretStore(crypto),
    now: () => NOW,
    newId: () => fakeId(++counter),
    fetchImpl
  })
  const translator = new ChapterTranslator({ library, connections, now: () => NOW })
  const handlers = createLibraryHandlers(library, undefined, connections, translator)

  const work = library.create({ title: 'Thử', sourceLang: 'en' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  const saved = library.saveText(work.id, chapter.id, 'source', SOURCE, 0, segment(SOURCE, 'en'))

  const connection = connections.create({
    name: 'Gateway',
    baseUrl: 'http://127.0.0.1:8317/v1',
    providerId: 'google'
  })
  if (options.key) await connections.addApiKey(connection.id, options.key)

  return {
    handlers,
    library,
    workId: work.id,
    chapterId: chapter.id,
    sourceIds: saved.segments.map((item) => item.id),
    connectionId: connection.id,
    calls
  }
}

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.code + ': ' + result.error.message)
  return result.value
}

async function plan(harness: Harness): Promise<TranslatePlan> {
  return unwrap(
    (await harness.handlers[CHANNELS.aiTranslatePlan]({
      workId: harness.workId,
      chapterId: harness.chapterId,
      connectionId: harness.connectionId,
      model: MODEL
    })) as Result<TranslatePlan>
  )
}

async function runBatch(
  harness: Harness,
  sourceIds: string[],
  expectedRev: number
): Promise<TranslateBatchResult> {
  return unwrap(
    (await harness.handlers[CHANNELS.aiTranslateBatch]({
      workId: harness.workId,
      chapterId: harness.chapterId,
      connectionId: harness.connectionId,
      model: MODEL,
      sourceIds,
      expectedRev
    })) as Result<TranslateBatchResult>
  )
}

async function links(harness: Harness): Promise<LinkRecord[]> {
  const result = (await harness.handlers[CHANNELS.linksList]({
    workId: harness.workId,
    chapterId: harness.chapterId
  })) as Result<{ links: LinkRecord[] }>
  return unwrap(result).links
}

describe('ai translate channels', () => {
  it('plans before sending anything: segments, batches and an estimate with a price', async () => {
    const harness = await setup()
    const planned = await plan(harness)

    expect(planned.segmentCount).toBe(3)
    expect(planned.batches.flatMap((batch) => batch.sourceIds)).toEqual(harness.sourceIds)
    expect(planned.hasTranslation).toBe(false)
    expect(planned.protectedCount).toBe(0)
    expect(planned.estimate.inputTokens).toBeGreaterThan(0)
    expect(planned.estimate.usd).toBeGreaterThan(0)
    expect(planned.catalogReadAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Lập kế hoạch không gửi gì ra ngoài.
    expect(harness.calls).toEqual([])
  })

  it('says a model with no price is unpriced instead of showing zero', async () => {
    const harness = await setup()
    const planned = unwrap(
      (await harness.handlers[CHANNELS.aiTranslatePlan]({
        workId: harness.workId,
        chapterId: harness.chapterId,
        connectionId: harness.connectionId,
        model: 'khong-co-trong-bang'
      })) as Result<TranslatePlan>
    )
    expect(planned.estimate.usd).toBeUndefined()
    expect(planned.estimate.inputTokens).toBeGreaterThan(0)
  })

  it('writes a batch into the translation as an unconfirmed AI suggestion', async () => {
    const harness = await setup([{ usage: { prompt_tokens: 120, completion_tokens: 90 } }])
    const result = await runBatch(harness, harness.sourceIds, 0)

    expect(result.written).toEqual(harness.sourceIds)
    expect(result.held).toEqual([])
    expect(result.failed).toEqual([])
    expect(result.error).toBeNull()
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 90 })

    const target = harness.library.readText(harness.workId, harness.chapterId, 'target')
    expect(target.content).toContain('VI:One.')
    expect(target.content).toContain('VI:Three.')
    expect(target.rev).toBe(result.targetRev)

    const all = await links(harness)
    expect(all).toHaveLength(3)
    for (const link of all) {
      expect(link.kind).toBe('ai')
      // Máy dịch chưa ai soát: hàng phải hiện là "AI", không phải "đã soát".
      expect(link.reviewedAt).toBeNull()
    }

    const first = target.segments[0]
    expect(harness.library.getProvenance(harness.workId, first.id)).toMatchObject({
      origin: 'ai',
      model: MODEL
    })
  })

  it('keeps a row the user wrote and hands back the AI version as a suggestion', async () => {
    const harness = await setup()
    // Người dùng tự dịch câu đầu.
    const mine = harness.library.saveRow(harness.workId, {
      chapterId: harness.chapterId,
      sourceId: harness.sourceIds[0],
      text: 'Bản của tôi.',
      expectedRev: 0
    })

    const planned = await plan(harness)
    expect(planned.hasTranslation).toBe(true)
    expect(planned.protectedCount).toBe(1)

    const result = await runBatch(harness, harness.sourceIds, mine.target.rev)
    expect(result.written).toEqual([harness.sourceIds[1], harness.sourceIds[2]])
    expect(result.held).toEqual([
      {
        sourceId: harness.sourceIds[0],
        sourceText: 'One.',
        userText: 'Bản của tôi.',
        aiText: 'VI:One.'
      }
    ])
    expect(result.error).toBeNull()

    const target = harness.library.readText(harness.workId, harness.chapterId, 'target')
    expect(target.content).toContain('Bản của tôi.')
    expect(target.content).not.toContain('VI:One.')

    const own = (await links(harness)).filter((link) =>
      link.members.includes(harness.sourceIds[0])
    )
    expect(own).toHaveLength(1)
    expect(own[0]).toMatchObject({ kind: 'user' })
    expect(own[0].reviewedAt).not.toBeNull()
  })

  it('overwrites its own earlier suggestion, since nobody has confirmed it', async () => {
    const harness = await setup([{ translate: (src) => 'VI:' + src }, { translate: () => 'Lần hai.' }])
    const first = await runBatch(harness, [harness.sourceIds[0]], 0)
    const second = await runBatch(harness, [harness.sourceIds[0]], first.targetRev)

    expect(second.written).toEqual([harness.sourceIds[0]])
    expect(second.held).toEqual([])
    const target = harness.library.readText(harness.workId, harness.chapterId, 'target')
    expect(target.content).toBe('Lần hai.')
  })

  it('a failed batch loses nothing and lists its own segments for a retry', async () => {
    // Trần thử lại của một lô là ba lần, nên phải ba lần 429 lô mới coi là lỗi.
    const fail429 = { status: 429, body: '{"error":{"message":"hết hạn mức"}}' }
    const harness = await setup([fail429, fail429, fail429, {}])
    const failedRun = await runBatch(harness, harness.sourceIds, 0)

    expect(failedRun.written).toEqual([])
    expect(failedRun.failed).toEqual(harness.sourceIds)
    expect(failedRun.error?.kind).toBe('rate_limited')
    expect(harness.library.readText(harness.workId, harness.chapterId, 'target').content).toBe('')

    // "Dịch lại phần lỗi": chỉ gửi lại đúng các câu lỗi.
    const retry = await runBatch(harness, failedRun.failed, failedRun.targetRev)
    expect(retry.written).toEqual(harness.sourceIds)
    expect(retry.error).toBeNull()
  })

  it('reports the segments the provider never answered instead of passing silently', async () => {
    const harness = await setup([{ skipIndex: 0 }])
    const result = await runBatch(harness, harness.sourceIds, 0)
    // Hai câu về được thì vẫn ghi; câu không bao giờ về nằm trong nhóm chạy lại.
    expect(result.written).toEqual([harness.sourceIds[1], harness.sourceIds[2]])
    expect(result.failed).toEqual([harness.sourceIds[0]])
    expect(result.error?.kind).toBe('invalid_response')
    expect(harness.library.readText(harness.workId, harness.chapterId, 'target').content).toContain(
      'VI:Two.'
    )
  })

  it('names the key it used, so a switch between batches can be announced', async () => {
    const harness = await setup([{}], { key: 'AIzaSy-khoa-gia-0001' })
    const result = await runBatch(harness, harness.sourceIds, 0)
    expect(result.keyTail).toBe('0001')
  })

  it('refuses a stale revision rather than writing over a change made elsewhere', async () => {
    const harness = await setup()
    const result = (await harness.handlers[CHANNELS.aiTranslateBatch]({
      workId: harness.workId,
      chapterId: harness.chapterId,
      connectionId: harness.connectionId,
      model: MODEL,
      sourceIds: harness.sourceIds,
      expectedRev: 7
    })) as Result<TranslateBatchResult>
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('conflict')
    expect(harness.calls).toEqual([])
  })

  it('refuses to plan a chapter with no source text', async () => {
    const harness = await setup()
    const empty = harness.library.createChapter(harness.workId, 'Rỗng').chapter
    const result = (await harness.handlers[CHANNELS.aiTranslatePlan]({
      workId: harness.workId,
      chapterId: empty.id,
      connectionId: harness.connectionId,
      model: MODEL
    })) as Result<TranslatePlan>
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('bản gốc')
  })

  it('refuses a connection the user switched off', async () => {
    const harness = await setup()
    unwrap(
      (await harness.handlers[CHANNELS.aiConnectionsUpdate]({
        id: harness.connectionId,
        patch: { enabled: false }
      })) as Result<ConnectionView>
    )
    const result = (await harness.handlers[CHANNELS.aiTranslatePlan]({
      workId: harness.workId,
      chapterId: harness.chapterId,
      connectionId: harness.connectionId,
      model: MODEL
    })) as Result<TranslatePlan>
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('đang tắt')
  })

  it('refuses input that is not what the channel takes', async () => {
    const harness = await setup()
    const base = {
      workId: harness.workId,
      chapterId: harness.chapterId,
      connectionId: harness.connectionId,
      model: MODEL,
      sourceIds: harness.sourceIds,
      expectedRev: 0
    }
    const bad = [
      { ...base, workId: 'x' },
      { ...base, model: '' },
      { ...base, sourceIds: [] },
      { ...base, sourceIds: ['not-a-uuid'] },
      { ...base, expectedRev: -1 },
      { ...base, extra: 1 }
    ]
    for (const payload of bad) {
      const result = (await harness.handlers[CHANNELS.aiTranslateBatch](
        payload
      )) as Result<TranslateBatchResult>
      expect(result.ok).toBe(false)
    }
  })
})
