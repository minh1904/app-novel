import { describe, expect, it } from 'vitest'
import type { ClassifiedError } from './classifyError'
import {
  OpenAiCompatibleProvider,
  parseChatFrame,
  type ChatStreamEvent,
  type KeyExhausted,
  type KeyLease,
  type KeySource
} from './openAiCompatible'
import { ProviderError } from './types'

/**
 * Lối gọi hội thoại của provider, chạy trên endpoint giả.
 *
 * Điều phải đúng trước mọi thứ khác: **lỗi không được làm mất phần chữ đã nhận**, và **hủy không
 * được làm khóa bị đóng băng**. Hai điều đó là lý do tồn tại của `partial` và của luật "báo đúng một
 * lần ở cuối" (D4 của change `ai-chat`).
 *
 * Hình dạng khung ở đây theo quy ước endpoint tương thích OpenAI. Hình dạng **lỗi giữa dòng** của
 * Gemini thì chưa xác minh (task 1.3) — nên lối gọi cài **cả hai** nhánh: lỗi bằng mã HTTP trước khi
 * stream bắt đầu, và lỗi bằng một khung giữa dòng. Test phủ cả hai, bất kể Gemini chọn cái nào.
 */

const NOW = 1_700_000_000_000

function keySource(
  leases: Array<KeyLease | KeyExhausted> = [{ id: 'k1', secret: 'SECRET' }]
): KeySource & { reports: Array<{ keyId: string; outcome: 'ok' | ClassifiedError }> } {
  const queue = [...leases]
  const reports: Array<{ keyId: string; outcome: 'ok' | ClassifiedError }> = []
  return {
    reports,
    async acquire() {
      return queue.length > 1 ? (queue.shift() as KeyLease) : queue[0]
    },
    async report(keyId, outcome) {
      reports.push({ keyId, outcome })
    }
  }
}

/** Một phản hồi SSE phát đúng các chunk đã cho; `signal` làm thân stream lỗi như fetch thật. */
function sseResponse(chunks: string[], signal?: AbortSignal): Response {
  const encoder = new TextEncoder()
  let index = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (signal?.aborted) {
        controller.error(new Error('The operation was aborted.'))
        return
      }
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index++]))
    }
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

/** Khung chữ theo quy ước OpenAI. */
const delta = (text: string): string =>
  'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n'

const usageFrame = (input: number, output: number): string =>
  'data: ' +
  JSON.stringify({ choices: [], usage: { prompt_tokens: input, completion_tokens: output } }) +
  '\n\n'

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  })
}

function provider(
  fetchImpl: typeof fetch,
  keys: ReturnType<typeof keySource>
): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    baseUrl: 'http://127.0.0.1:8317/v1',
    model: 'gemini-flash-latest',
    keys,
    fetchImpl,
    now: () => NOW
  })
}

const ASK = [{ role: 'user' as const, content: 'Dịch tự nhiên hơn' }]

/** Chạy hết một lượt; trả cả các event đã nhận và lỗi (nếu có), vì cả hai cùng quan trọng. */
async function drain(
  stream: AsyncGenerator<ChatStreamEvent>
): Promise<{ events: ChatStreamEvent[]; error: unknown }> {
  const events: ChatStreamEvent[] = []
  try {
    for await (const event of stream) events.push(event)
    return { events, error: null }
  } catch (error) {
    return { events, error }
  }
}

const textOf = (events: ChatStreamEvent[]): string =>
  events.map((e) => (e.kind === 'delta' ? e.text : '')).join('')

describe('parseChatFrame', () => {
  it('đọc phần chữ của một khung', () => {
    expect(parseChatFrame(JSON.stringify({ choices: [{ delta: { content: 'xin' } }] }))).toEqual({
      text: 'xin',
      usage: null,
      toolCalls: []
    })
  })

  it('khung mở đầu chỉ có role cho chữ rỗng, không phải lỗi', () => {
    expect(parseChatFrame(JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] }))).toEqual({
      text: '',
      usage: null,
      toolCalls: []
    })
  })

  it('đọc usage ở khung cuối', () => {
    const frame = parseChatFrame(
      JSON.stringify({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 3 } })
    )
    expect(frame?.usage).toEqual({ inputTokens: 12, outputTokens: 3 })
  })

  it('đưa thân lỗi ra ngoài để bên gọi phân loại', () => {
    const frame = parseChatFrame(JSON.stringify({ error: { code: 429, message: 'chậm lại' } }))
    expect(frame?.error).toEqual({ code: 429, message: 'chậm lại' })
  })

  // Một dòng lạ không đáng giết cả lượt khi phần còn lại vẫn dùng được.
  it('bỏ qua khung không đọc được thay vì ném', () => {
    expect(parseChatFrame('không phải json')).toBeNull()
    expect(parseChatFrame('"chuỗi"')).toBeNull()
  })
})

describe('chat', () => {
  // Task 4.1
  it('ghép chữ theo dòng và lấy usage ở khung cuối', async () => {
    const keys = keySource()
    const p = provider(
      async () => sseResponse([delta('Nhờ '), delta('ngoại hình'), usageFrame(120, 30), 'data: [DONE]\n\n']),
      keys
    )
    const { events, error } = await drain(p.chat(ASK))

    expect(error).toBeNull()
    expect(textOf(events)).toBe('Nhờ ngoại hình')
    expect(events.at(-1)).toEqual({ kind: 'done', usage: { inputTokens: 120, outputTokens: 30 } })
  })

  it('gửi stream và stream_options, cùng khóa ở header', async () => {
    const keys = keySource()
    let seen: { url: string; init: RequestInit | undefined } | null = null
    const p = provider(async (url, init) => {
      seen = { url: String(url), init }
      return sseResponse([delta('a'), 'data: [DONE]\n\n'])
    }, keys)
    await drain(p.chat(ASK))

    const sent = seen as unknown as { url: string; init: RequestInit }
    expect(sent.url).toBe('http://127.0.0.1:8317/v1/chat/completions')
    const body = JSON.parse(String(sent.init.body)) as Record<string, unknown>
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })
    expect(body.messages).toEqual(ASK)
    expect((sent.init.headers as Record<string, string>).authorization).toBe('Bearer SECRET')
  })

  it('báo ok đúng một lần, ở cuối', async () => {
    const keys = keySource()
    const p = provider(async () => sseResponse([delta('a'), 'data: [DONE]\n\n']), keys)
    await drain(p.chat(ASK))
    expect(keys.reports).toEqual([{ keyId: 'k1', outcome: 'ok' }])
  })

  it('xong êm cả khi nhà cung cấp không trả usage', async () => {
    const keys = keySource()
    const p = provider(async () => sseResponse([delta('a'), 'data: [DONE]\n\n']), keys)
    const { events, error } = await drain(p.chat(ASK))
    expect(error).toBeNull()
    expect(events.at(-1)).toEqual({ kind: 'done', usage: null })
  })

  // Task 4.2 — lỗi trước khi stream bắt đầu, đi qua đúng bộ phân loại của lối dịch.
  it('khóa sai cho ra lỗi auth và được báo cho tầng khóa', async () => {
    const keys = keySource()
    const p = provider(
      async () => jsonResponse({ error: { message: 'API key not valid' } }, 401),
      keys
    )
    const { events, error } = await drain(p.chat(ASK))

    expect(events).toEqual([])
    expect(error).toBeInstanceOf(ProviderError)
    expect((error as ProviderError).kind).toBe('auth')
    expect((error as ProviderError).retryable).toBe(false)
    expect(keys.reports[0]?.outcome).toMatchObject({ kind: 'auth' })
  })

  it('hết hạn mức cho ra rate_limited kèm thời gian chờ', async () => {
    const keys = keySource()
    const p = provider(
      async () =>
        jsonResponse(
          {
            error: {
              code: 429,
              message: 'Quota exceeded',
              details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '34.4s' }]
            }
          },
          429
        ),
      keys
    )
    const { error } = await drain(p.chat(ASK))

    expect((error as ProviderError).kind).toBe('rate_limited')
    expect((error as ProviderError).retryAfterMs).toBe(34_400)
    expect((error as ProviderError).retryable).toBe(true)
  })

  it('thân rỗng vẫn cho ra lỗi có loại', async () => {
    const keys = keySource()
    const p = provider(async () => new Response(null, { status: 500 }), keys)
    const { error } = await drain(p.chat(ASK))
    expect((error as ProviderError).kind).toBe('network')
  })

  // Task 4.3 — phần đã nhận phải sống sót qua lỗi; đây là yêu cầu "lỗi là một phần của dòng".
  it('lỗi giữa dòng giữ lại phần chữ đã nhận', async () => {
    const keys = keySource()
    const errorFrame =
      'data: ' + JSON.stringify({ error: { code: 429, message: 'Quota exceeded' } }) + '\n\n'
    const p = provider(
      async () => sseResponse([delta('Nhờ '), delta('ngoại hình'), errorFrame]),
      keys
    )
    const { events, error } = await drain(p.chat(ASK))

    expect(textOf(events)).toBe('Nhờ ngoại hình')
    expect(events.some((e) => e.kind === 'done')).toBe(false)
    expect((error as ProviderError).kind).toBe('rate_limited')
    expect(keys.reports[0]?.outcome).toMatchObject({ kind: 'rate_limited' })
  })

  it('lỗi giữa dòng không có mã thì coi là trục trặc đường truyền, thử lại được', async () => {
    const keys = keySource()
    const errorFrame = 'data: ' + JSON.stringify({ error: { message: 'something broke' } }) + '\n\n'
    const p = provider(async () => sseResponse([delta('a'), errorFrame]), keys)
    const { error } = await drain(p.chat(ASK))

    expect((error as ProviderError).kind).toBe('network')
    expect((error as ProviderError).retryable).toBe(true)
  })

  it('thân stream đứt giữa dòng giữ lại phần đã nhận', async () => {
    const keys = keySource()
    const encoder = new TextEncoder()
    const p = provider(async () => {
      // Lỗi phải xảy ra ở lần `pull` **sau**, không phải ngay sau `enqueue` trong `start`:
      // `controller.error()` xóa hàng đợi, nên gọi liền nhau thì chunk kia không bao giờ đọc được —
      // một tạo tác của stream dựng tay, không phải điều mạng thật làm.
      let sent = false
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (sent) {
            controller.error(new Error('socket hang up'))
            return
          }
          sent = true
          controller.enqueue(encoder.encode(delta('một nửa')))
        }
      })
      return new Response(body, { status: 200 })
    }, keys)
    const { events, error } = await drain(p.chat(ASK))

    expect(textOf(events)).toBe('một nửa')
    expect((error as ProviderError).kind).toBe('network')
  })

  // Task 4.4 — hủy không kết luận gì về khóa, nên không báo gì cả.
  it('hủy giữa dòng ném cancelled và không báo gì cho tầng khóa', async () => {
    const keys = keySource()
    const controller = new AbortController()
    const p = provider(
      async () =>
        sseResponse([delta('một'), delta('hai'), delta('ba'), 'data: [DONE]\n\n'], controller.signal),
      keys
    )

    const events: ChatStreamEvent[] = []
    let caught: unknown = null
    try {
      for await (const event of p.chat(ASK, { signal: controller.signal })) {
        events.push(event)
        controller.abort()
      }
    } catch (error) {
      caught = error
    }

    expect((caught as ProviderError).kind).toBe('cancelled')
    expect(keys.reports).toEqual([])
    // Dừng sớm, nhưng **không** khẳng định dừng ở đúng delta nào: stream pull sẵn một chunk trước
    // (highWaterMark 1), nên một delta đã đệm vẫn được giao sau lệnh hủy — đúng như thân fetch thật.
    // Hợp đồng là "kết thúc bằng cancelled, không có done", không phải "cắt đúng tại ký tự nào".
    expect(events.length).toBeLessThan(3)
    expect(textOf(events).length).toBeGreaterThan(0)
    expect(events.some((e) => e.kind === 'done')).toBe(false)
  })

  it('khóa vừa bị hủy vẫn dùng được cho lượt sau', async () => {
    const keys = keySource()
    const controller = new AbortController()
    const first = provider(
      async () => sseResponse([delta('một'), delta('hai')], controller.signal),
      keys
    )
    try {
      for await (const event of first.chat(ASK, { signal: controller.signal })) {
        expect(event.kind).toBe('delta')
        controller.abort()
      }
    } catch {
      // Lượt bị hủy; điều cần kiểm là tầng khóa không bị nói gì.
    }

    const second = provider(async () => sseResponse([delta('ok'), 'data: [DONE]\n\n']), keys)
    const { error } = await drain(second.chat(ASK))
    expect(error).toBeNull()
    expect(keys.reports).toEqual([{ keyId: 'k1', outcome: 'ok' }])
  })

  // Task 4.5 — cùng một câu với lối dịch khi cạn khóa.
  it('cạn mọi khóa báo rate_limited kèm mốc hồi phục', async () => {
    const keys = keySource([{ exhausted: true, recoverAt: NOW + 5_000 }])
    let called = false
    const p = provider(async () => {
      called = true
      return sseResponse([])
    }, keys)
    const { error } = await drain(p.chat(ASK))

    expect(called).toBe(false)
    expect((error as ProviderError).kind).toBe('rate_limited')
    expect((error as ProviderError).message).toContain('Mọi khóa của kết nối này đều đang hết hạn mức.')
    expect((error as ProviderError).retryAfterMs).toBe(5_000)
  })

  it('kết nối không có khóa vẫn gọi được và không báo gì', async () => {
    const keys = keySource([{ id: null, secret: null }])
    let headers: Record<string, string> = {}
    const p = provider(async (_url, init) => {
      headers = (init?.headers ?? {}) as Record<string, string>
      return sseResponse([delta('a'), 'data: [DONE]\n\n'])
    }, keys)
    const { error } = await drain(p.chat(ASK))

    expect(error).toBeNull()
    expect(headers.authorization).toBeUndefined()
    expect(keys.reports).toEqual([])
  })
})
