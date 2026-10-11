import { afterEach, describe, expect, it } from 'vitest'
import type { ChatChunk } from '../../../shared/contracts/aiChat'
import { segment } from '../../../shared/segmentation/segmenter'
import type { SecretCrypto } from '../../infra/storage/secretStore'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { createServices } from '../createServices'

/**
 * **Tùy chọn (Opt-in)**: Kiểm thử trực tiếp với API Gemini thực tế. Được bỏ qua trừ khi cả hai biến
 * môi trường `MIRA_LIVE=1` và `GEMINI_API_KEY` được thiết lập, để tránh chạy trong quy trình CI thông thường.
 *
 *   PowerShell:  $env:MIRA_LIVE='1'; $env:GEMINI_API_KEY='…'; node_modules/.bin/vitest run src/main/services/ai/liveGemini.test.ts
 *   Tùy chọn:    $env:MIRA_LIVE_MODEL='gemini-3.5-flash'   (mặc định gemini-2.5-flash)
 *
 * Kiểm tra toàn bộ luồng hoạt động: kết nối → cấu hình mục mô hình → gateway → nhà cung cấp — cho các chức năng
 * dịch thuật, lượt trò chuyện và nút kiểm tra kết nối với cấu hình suy nghĩ (thinking) và nhiệt độ (temperature).
 *
 * Khóa API chỉ được lưu trong bộ nhớ và không bao giờ được ghi log ra ngoài.
 */

const KEY = process.env.GEMINI_API_KEY ?? ''
const LIVE = process.env.MIRA_LIVE === '1' && KEY !== ''
const MODEL = process.env.MIRA_LIVE_MODEL ?? 'gemini-2.5-flash'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

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

const leaks = (text: string): boolean => KEY !== '' && text.includes(KEY)

async function setup(): Promise<{
  library: LibraryStore
  services: ReturnType<typeof createServices>
  requests: Array<Record<string, unknown>>
  connectionId: string
  entries: { quiet: string; plain: string }
}> {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const requests: Array<Record<string, unknown>> = []
  const spying = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof init?.body === 'string')
      requests.push(JSON.parse(init.body) as Record<string, unknown>)
    return fetch(input, init)
  }) as typeof fetch
  const services = createServices({ library, crypto, fetch: spying })

  const connection = services.connections.create({
    name: 'Gemini (live)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    providerId: 'google'
  })
  await services.connections.addApiKey(connection.id, KEY)
  const view = services.connections.addModels(connection.id, [
    { model: MODEL, name: 'Tắt + 0,3' },
    { model: MODEL, name: 'Mặc định' }
  ])
  const [quiet, plain] = view.models.map((entry) => entry.id) as [string, string]
  services.connections.updateEntry(quiet, {
    settings: { thinking: 'off', temperature: { enabled: true, value: 0.3 } }
  })
  return { library, services, requests, connectionId: connection.id, entries: { quiet, plain } }
}

describe.skipIf(!LIVE)('live Gemini qua kết nối → mục mô hình → gateway', () => {
  it('tests an entry with its own settings, and thinking off costs no more output than the default', async () => {
    const { services, requests, entries } = await setup()

    const off = await services.connections.testEntry(entries.quiet)
    const sent = requests.at(-1)
    const plain = await services.connections.testEntry(entries.plain)

    console.log(
      `[live ${MODEL}] "Tắt + 0,3": ${off.ms} ms, ${JSON.stringify(off.usage)}; "Mặc định": ${plain.ms} ms, ${JSON.stringify(plain.usage)}`
    )
    // Các thiết lập cấu hình của mục mô hình đã được gửi đi…
    expect(sent).toMatchObject({ model: MODEL, temperature: 0.3, reasoning_effort: 'none' })
    // …và mục mô hình không cấu hình thêm gì sẽ không gửi thừa thông tin.
    expect(Object.keys(requests.at(-1)!).sort()).toEqual(['messages', 'model'])
    // Token suy nghĩ ẩn được tính vào đầu ra, nên khi tắt thinking chi phí đầu ra không thể nhiều hơn.
    expect(off.usage).not.toBeNull()
    expect(off.usage!.outputTokens).toBeLessThanOrEqual(plain.usage!.outputTokens)
  }, 120_000)

  it('translates a chapter with the entry, in one request per planned batch, with the settings and the usage', async () => {
    const { library, services, requests, connectionId, entries } = await setup()
    const work = library.create({ title: 'Live', sourceLang: 'en' })
    const chapter = library.createChapter(work.id, 'Một').chapter
    const source = 'The door opened. Petals lay white across the yard.'
    library.saveText(work.id, chapter.id, 'source', source, 0, segment(source, 'en'))

    const before = requests.length
    const planned = services.translator.plan({
      workId: work.id,
      chapterId: chapter.id,
      connectionId,
      entryId: entries.quiet
    })
    const result = await services.translator.runBatch({
      workId: work.id,
      chapterId: chapter.id,
      connectionId,
      entryId: entries.quiet,
      settingsKey: planned.settingsKey,
      sourceIds: planned.batches[0]!.sourceIds,
      expectedRev: planned.targetRev
    })

    console.log(
      `[live ${MODEL}] translate: written ${result.written.length}/${planned.segmentCount}, usage ${JSON.stringify(result.usage)}, error ${JSON.stringify(result.error)}`
    )
    expect(result.error).toBeNull()
    expect(result.written.length).toBe(planned.segmentCount)
    expect(result.usage?.inputTokens).toBeGreaterThan(0)
    expect(requests.length - before).toBe(1)
    expect(requests.at(-1)).toMatchObject({ temperature: 0.3, reasoning_effort: 'none' })
    expect(leaks(JSON.stringify(result))).toBe(false)
  }, 120_000)

  it('answers a chat turn with the entry, and the turn ends in done', async () => {
    const { library, services, requests, connectionId, entries } = await setup()
    const work = library.create({ title: 'Live', sourceLang: 'en' })
    const chapter = library.createChapter(work.id, 'Một').chapter

    const chunks: ChatChunk[] = []
    const before = requests.length
    services.chat.start(
      {
        workId: work.id,
        chapterId: chapter.id,
        connectionId,
        entryId: entries.quiet,
        sourceLang: 'en',
        question: 'Trả lời đúng một từ: OK.',
        history: [],
        location: { caret: { source: null, target: null }, selection: null }
      },
      (chunk) => chunks.push(chunk)
    )
    const deadline = Date.now() + 90_000
    while (!chunks.some((chunk) => chunk.kind === 'done' || chunk.kind === 'error')) {
      if (Date.now() > deadline) throw new Error('the chat turn did not finish in 90 s')
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    const ending = chunks.find((chunk) => chunk.kind === 'done' || chunk.kind === 'error')!
    console.log(
      `[live ${MODEL}] chat ended in ${ending.kind}: ${JSON.stringify(ending).slice(0, 200)}`
    )
    expect(ending.kind).toBe('done')
    expect(requests.length - before).toBeGreaterThanOrEqual(1)
    expect(requests[before]).toMatchObject({
      temperature: 0.3,
      reasoning_effort: 'none',
      stream: true
    })
    expect(leaks(JSON.stringify(chunks))).toBe(false)
  }, 120_000)

  it('tells the person what Gemini said when an entry carries a parameter it refuses, asks once, and leaks no key', async () => {
    const { services, requests, connectionId, entries } = await setup()
    services.connections.updateEntry(entries.plain, {
      settings: { extraBody: { enabled: true, value: { mira_not_a_parameter: 1 } } }
    })
    const before = requests.length

    const outcome = await services.connections.testEntry(entries.plain).then(
      () => 'accepted',
      (error: unknown) => (error instanceof Error ? error.message : String(error))
    )

    console.log(`[live ${MODEL}] refused parameter → ${String(outcome).slice(0, 200)}`)
    // Gemini may in principle ignore an unknown field; if it does, there is nothing to refuse and the
    // point of this test (the wording and the single request) does not arise.
    if (outcome !== 'accepted') {
      expect(outcome.length).toBeGreaterThan(0)
      expect(requests.length - before).toBe(1)
    }
    expect(leaks(String(outcome))).toBe(false)
    expect(connectionId).toBeTruthy()
  }, 120_000)
})
