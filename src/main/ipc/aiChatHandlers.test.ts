import { afterEach, describe, expect, it } from 'vitest'
import type { ChatChunk } from '../../shared/contracts/aiChat'
import type { ConnectionView } from '../../shared/contracts/aiConnections'
import { CHANNELS, EVENT_CHANNELS } from '../../shared/contracts/channels'
import type { Result } from '../../shared/contracts/result'
import { ChatService, type ChatConnections } from '../services/ai/chatService'
import type { ConnectionTranslator } from '../services/ai/connectionService'
import { OpenAiCompatibleProvider, type KeySource } from '../infra/providers/openAiCompatible'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import type { ChunkSink } from './handler'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

/**
 * Hai kênh chat, gọi đúng như app gọi: qua handler, với một `webContents` giả.
 *
 * Điều phải đúng trước mọi thứ khác: lời gọi `invoke` trả **chỉ** `requestId` — nội dung câu trả lời
 * không bao giờ đi qua đường đó. Và không chunk nào được gửi vào một cửa sổ đã đóng; đó là chỗ sinh
 * ra lỗi "object has been destroyed" mà người dùng chỉ gặp khi đóng app giữa lượt.
 */

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const CONNECTION_ID = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'
const WORK_ID = '11111111-2222-4333-8444-555555555555'
const CHAPTER_ID = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const NOW = 1_700_000_000_000

const delta = (text: string): string =>
  'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n'
const DONE = 'data: [DONE]\n\n'

/**
 * Endpoint SSE giả. `signal` **phải** được truyền vào: `fetch` thật làm thân stream lỗi khi signal
 * tắt, nên một fake bỏ qua signal sẽ chạy tới hết và làm test hủy vô nghĩa.
 */
function sseResponse(
  chunks: string[],
  options: { signal?: AbortSignal; gate?: () => Promise<void> } = {}
): Response {
  const encoder = new TextEncoder()
  let index = 0
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (options.gate) await options.gate()
      if (options.signal?.aborted) {
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

const keys: KeySource = {
  acquire: () => Promise.resolve({ id: 'k1', secret: 'SECRET' }),
  // Nothing recorded: these tests are about the two channels, not key bookkeeping.
  report: () => Promise.resolve()
}

const view: ConnectionView = {
  id: CONNECTION_ID,
  name: 'Gemini',
  baseUrl: 'http://127.0.0.1:8317/v1',
  enabled: true,
  providerId: 'google',
  defaultModel: 'gemini-flash-latest',
  checkedAt: null,
  keys: [{ id: 'k1', tail: '9f3a', state: 'ok', frozenUntil: null, frozenScope: null }],
  models: [],
  ...{}
}

function connections(fetchImpl: typeof fetch): ChatConnections {
  return {
    translator(_id, model): ConnectionTranslator {
      return {
        connection: view,
        provider: new OpenAiCompatibleProvider({
          baseUrl: view.baseUrl,
          model,
          keys,
          fetchImpl,
          now: () => NOW
        }),
        lastKeyTail: () => '9f3a'
      }
    }
  }
}

/** `webContents` giả: ghi lại mọi lần gửi, và đóng được bằng tay. */
function fakeSink(): ChunkSink & {
  sent: Array<{ channel: string; payload: unknown }>
  destroy(): void
} {
  const sent: Array<{ channel: string; payload: unknown }> = []
  const callbacks: Array<() => void> = []
  let destroyed = false
  return {
    sent,
    send(channel, payload) {
      if (destroyed) throw new Error('Object has been destroyed')
      sent.push({ channel, payload })
    },
    isDestroyed: () => destroyed,
    onDestroyed(callback) {
      callbacks.push(callback)
    },
    destroy() {
      destroyed = true
      for (const callback of callbacks.splice(0)) callback()
    }
  }
}

function setup(fetchImpl: typeof fetch): {
  handlers: ReturnType<typeof createLibraryHandlers>
  chat: ChatService
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const chat = new ChatService({
    connections: connections(fetchImpl),
    newId: () => library.newAppId(),
    now: () => NOW
  })
  return {
    handlers: createLibraryHandlers(library, undefined, undefined, undefined, chat),
    chat
  }
}

const input = (patch: Record<string, unknown> = {}): unknown => ({
  workId: WORK_ID,
  chapterId: CHAPTER_ID,
  connectionId: CONNECTION_ID,
  model: 'gemini-flash-latest',
  mode: 'hoi',
  sourceLang: 'en',
  question: 'Dịch tự nhiên hơn',
  history: [],
  context: [],
  ...patch
})

const chunksOf = (sink: ReturnType<typeof fakeSink>): ChatChunk[] =>
  sink.sent.map((entry) => entry.payload as ChatChunk)

/** Chờ tới khi sink nhận được chunk kết thúc, hoặc hết số vòng vi mô đã cho. */
async function settle(sink: ReturnType<typeof fakeSink>, turns = 60): Promise<void> {
  for (let i = 0; i < turns; i++) {
    if (chunksOf(sink).some((chunk) => chunk.kind !== 'delta')) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('ai:chat:send', () => {
  it('trả chỉ requestId, không trả nội dung câu trả lời', async () => {
    const { handlers } = setup(async () => sseResponse([delta('Nhờ '), delta('ngoại hình'), DONE]))
    const sink = fakeSink()

    const reply = (await handlers[CHANNELS.aiChatSend](input(), sink)) as Result<{
      requestId: string
    }>

    expect(reply.ok).toBe(true)
    const value = reply.ok ? reply.value : null
    expect(Object.keys(value ?? {})).toEqual(['requestId'])
    expect(JSON.stringify(reply)).not.toContain('ngoại hình')
  })

  it('đẩy chunk về đúng kênh sự kiện, mang đúng requestId', async () => {
    const { handlers } = setup(async () => sseResponse([delta('một'), delta('hai'), DONE]))
    const sink = fakeSink()

    const reply = (await handlers[CHANNELS.aiChatSend](input(), sink)) as Result<{
      requestId: string
    }>
    const requestId = reply.ok ? reply.value.requestId : ''
    await settle(sink)

    expect(sink.sent.every((entry) => entry.channel === EVENT_CHANNELS.aiChatChunk)).toBe(true)
    expect(chunksOf(sink).every((chunk) => chunk.requestId === requestId)).toBe(true)
    const text = chunksOf(sink)
      .map((chunk) => (chunk.kind === 'delta' ? chunk.text : ''))
      .join('')
    expect(text).toBe('mộthai')
    expect(chunksOf(sink).filter((chunk) => chunk.kind !== 'delta')).toHaveLength(1)
  })

  it('payload không hợp lệ bị từ chối trước khi có requestId', async () => {
    const { handlers, chat } = setup(async () => sseResponse([DONE]))
    const sink = fakeSink()

    const reply = (await handlers[CHANNELS.aiChatSend](
      input({ question: '' }),
      sink
    )) as Result<unknown>

    expect(reply.ok).toBe(false)
    expect(!reply.ok && reply.error.code).toBe('validation')
    expect(chat.activeCount).toBe(0)
    expect(sink.sent).toEqual([])
  })

  it('không có kho kết nối thì nói rõ thay vì im lặng', async () => {
    const library = LibraryStore.open({ dataDir: tempDir() })
    stores.push(library)
    const handlers = createLibraryHandlers(library)

    const reply = (await handlers[CHANNELS.aiChatSend](input(), fakeSink())) as Result<unknown>
    expect(reply.ok).toBe(false)
    expect(!reply.ok && reply.error.code).toBe('io')
  })

  it('nguồn gửi không tin cậy thì không có lượt nào bắt đầu', async () => {
    const { handlers, chat } = setup(async () => sseResponse([delta('a'), DONE]))
    const guarded = guardHandlers(handlers, () => false)

    const reply = (await guarded[CHANNELS.aiChatSend]({}, input())) as Result<unknown>
    expect(!reply.ok && reply.error.code).toBe('untrusted_sender')
    expect(chat.activeCount).toBe(0)
  })
})

describe('ai:chat:cancel', () => {
  it('dừng lượt đang chạy và lượt kết thúc bằng cancelled', async () => {
    let release = (): void => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let opened = false
    const { handlers } = setup(async (_url, init) =>
      sseResponse([delta('một'), delta('hai'), DONE], {
        signal: (init?.signal ?? undefined) as AbortSignal,
        gate: async () => {
          if (opened) return
          opened = true
          await held
        }
      })
    )
    const sink = fakeSink()

    const reply = (await handlers[CHANNELS.aiChatSend](input(), sink)) as Result<{
      requestId: string
    }>
    const requestId = reply.ok ? reply.value.requestId : ''

    const cancelled = (await handlers[CHANNELS.aiChatCancel]({ requestId })) as Result<unknown>
    expect(cancelled.ok).toBe(true)
    release()
    await settle(sink)

    const ending = chunksOf(sink).find((chunk) => chunk.kind !== 'delta')
    expect(ending?.kind).toBe('error')
    expect(ending && ending.kind === 'error' && ending.error.kind).toBe('cancelled')
  })

  it('hủy một requestId không tồn tại không phải lỗi', async () => {
    const { handlers } = setup(async () => sseResponse([DONE]))
    const reply = (await handlers[CHANNELS.aiChatCancel]({
      requestId: CONNECTION_ID
    })) as Result<unknown>
    expect(reply.ok).toBe(true)
  })
})

// Task 6.2
describe('cửa sổ đóng giữa lượt', () => {
  it('dọn sổ và không gửi gì thêm', async () => {
    let release = (): void => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let opened = false
    const { handlers, chat } = setup(async (_url, init) =>
      sseResponse([delta('một'), delta('hai'), DONE], {
        signal: (init?.signal ?? undefined) as AbortSignal,
        gate: async () => {
          if (opened) return
          opened = true
          await held
        }
      })
    )
    const sink = fakeSink()

    await handlers[CHANNELS.aiChatSend](input(), sink)
    expect(chat.activeCount).toBe(1)

    sink.destroy()
    expect(chat.activeCount).toBe(0)

    const before = sink.sent.length
    release()
    // `send` của sink giả ném khi đã đóng, nên nếu có chunk nào lọt qua thì test này đỏ.
    await settle(sink, 10)
    expect(sink.sent.length).toBe(before)
  })
})
