import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ChatMessage, ChatStreamEvent } from './openAiChatTransport'
import {
  ResponsesTransport,
  buildResponsesBody,
  listedModels,
  promptCacheKey,
  sanitizeText,
  shortCallId
} from './responsesTransport'
import { ProviderError } from './types'

/**
 * The Responses transport (change `subscription-providers`, tasks 2.1–2.2). The SSE fixtures in
 * `__fixtures__/responses` are written by hand from the event shapes Hermes reads
 * (`agent/codex_runtime.py`); a recording from a real account replaces them when one is made (task 7.2).
 */

const fixture = (name: string): string =>
  readFileSync(join(__dirname, '__fixtures__', 'responses', name), 'utf-8')

function sse(text: string): Response {
  return new Response(text, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function transport(
  body: string | Response,
  flavor: 'codex' | 'standard' = 'codex',
  seen: Array<{ url: string; init: RequestInit }> = []
): ResponsesTransport {
  return new ResponsesTransport({
    baseUrl: 'https://chatgpt.com/backend-api/codex',
    flavor,
    cacheScope: 'conn-1',
    now: () => 1000,
    fetchImpl: (async (url: string, init: RequestInit) => {
      seen.push({ url, init })
      return typeof body === 'string' ? sse(body) : body
    }) as typeof fetch
  })
}

async function collect(stream: AsyncIterable<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

const HISTORY: ChatMessage[] = [
  { role: 'system', content: 'Bạn là trợ lý.' },
  { role: 'system', content: 'Luật thuật ngữ.' },
  { role: 'user', content: 'Đọc chương 2' },
  {
    role: 'assistant',
    content: '',
    tool_calls: [
      {
        id: 'call_' + 'x'.repeat(80),
        type: 'function',
        function: { name: 'read_chapter', arguments: '{"chapter":2,"side":"source"}' }
      }
    ]
  },
  { role: 'tool', tool_call_id: 'call_' + 'x'.repeat(80), content: 'Chương 2 · bản gốc' },
  { role: 'assistant', content: 'Đã đọc <|channel|> xong.' },
  { role: 'user', content: 'Tiếp' }
]

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_chapter',
      description: 'Đọc',
      parameters: { type: 'object', properties: {} }
    }
  }
]

describe('buildResponsesBody', () => {
  it('turns system turns into instructions and every other turn into typed items', () => {
    const body = buildResponsesBody(
      { model: 'gpt-5.5', messages: HISTORY, tools: TOOLS },
      { flavor: 'standard' }
    )
    expect(body.instructions).toBe('Bạn là trợ lý.\n\nLuật thuật ngữ.')
    const input = body.input as Array<Record<string, unknown>>
    expect(input[0]).toEqual({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Đọc chương 2' }]
    })
    expect(input[1]).toMatchObject({ type: 'function_call', name: 'read_chapter' })
    expect((input[1].call_id as string).length).toBeLessThanOrEqual(64)
    // The output answers the same (shortened) call.
    expect(input[2]).toEqual({
      type: 'function_call_output',
      call_id: input[1].call_id,
      output: 'Chương 2 · bản gốc'
    })
    // An assistant string is never sent bare.
    expect(input[3]).toEqual({
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'Đã đọc <｜channel｜> xong.' }]
    })
    expect(body.tools).toEqual([
      {
        type: 'function',
        name: 'read_chapter',
        description: 'Đọc',
        strict: false,
        parameters: { type: 'object', properties: {} }
      }
    ])
    expect(body.store).toBe(false)
    expect(body.stream).toBe(true)
  })

  it('leaves the tools key out when there are none', () => {
    const body = buildResponsesBody({ model: 'm', messages: HISTORY }, { flavor: 'standard' })
    expect('tools' in body).toBe(false)
  })

  it('sends the thinking level, and no reasoning at all for "none" unless the model takes it', () => {
    const high = buildResponsesBody(
      { model: 'm', messages: HISTORY, reasoningEffort: 'high' },
      { flavor: 'standard' }
    )
    expect(high.reasoning).toEqual({ effort: 'high', summary: 'auto' })
    const off = buildResponsesBody(
      { model: 'm', messages: HISTORY, reasoningEffort: 'none' },
      { flavor: 'standard' }
    )
    expect('reasoning' in off).toBe(false)
    const offTaken = buildResponsesBody(
      { model: 'm', messages: HISTORY, reasoningEffort: 'none' },
      { flavor: 'standard', supportsNoReasoning: true }
    )
    expect(offTaken.reasoning).toEqual({ effort: 'none' })
  })

  it('adds what Codex needs and drops the output cap however it arrives', () => {
    const body = buildResponsesBody(
      {
        model: 'gpt-5.5',
        messages: HISTORY,
        tools: TOOLS,
        maxTokens: 4000,
        extraBody: { max_output_tokens: 10 }
      },
      { flavor: 'codex', cacheScope: 'conn-1' }
    )
    expect(body.include).toEqual(['reasoning.encrypted_content'])
    expect(body.prompt_cache_key).toMatch(/^pck_[0-9a-f]{24}$/)
    expect('max_output_tokens' in body).toBe(false)
    const standard = buildResponsesBody(
      { model: 'gpt-5.5', messages: HISTORY, maxTokens: 4000 },
      { flavor: 'standard' }
    )
    expect(standard.max_output_tokens).toBe(4000)
  })
})

describe('helpers', () => {
  it('keeps short call ids and hashes long ones the same way every time', () => {
    expect(shortCallId('call_1')).toBe('call_1')
    const long = 'c'.repeat(100)
    expect(shortCallId(long)).toBe(shortCallId(long))
    expect(shortCallId(long).length).toBeLessThanOrEqual(64)
  })

  it('replaces only the harmony control tokens', () => {
    expect(sanitizeText('<|start|>a<|end|> <|other|>')).toBe('<｜start｜>a<｜end｜> <|other|>')
  })

  it('scopes the cache key and ignores the order of the tools', () => {
    const tools = [
      { type: 'function' as const, name: 'b', strict: false as const, parameters: {} },
      { type: 'function' as const, name: 'a', strict: false as const, parameters: {} }
    ]
    expect(promptCacheKey('s', 'i', tools)).toBe(promptCacheKey('s', 'i', [...tools].reverse()))
    expect(promptCacheKey('s', 'i', tools)).not.toBe(promptCacheKey('t', 'i', tools))
  })

  it('reads either listing shape, hides hidden models and sorts by priority', () => {
    expect(
      listedModels({
        models: [
          { slug: 'gpt-5.4', priority: 3 },
          { slug: 'internal', visibility: 'hide', priority: 0 },
          { slug: 'gpt-5.5', priority: 1 },
          { slug: 'hidden', visibility: 'hidden' }
        ]
      })
    ).toEqual(['gpt-5.5', 'gpt-5.4'])
    expect(listedModels({ data: [{ id: 'gpt-5' }, { id: 'models/x' }] })).toEqual(['gpt-5', 'x'])
  })
})

describe('reading the stream', () => {
  it('gives the answer text, skips commentary, and reports usage with the cache apart', async () => {
    const events = await collect(
      transport(fixture('text.sse')).stream({ model: 'm', messages: HISTORY }, { apiKey: 't' })
    )
    const text = events.flatMap((event) => (event.kind === 'delta' ? [event.text] : [])).join('')
    expect(text).toBe('Ma vương đã đến.')
    expect(events.at(-1)).toEqual({
      kind: 'done',
      finishReason: 'stop',
      usage: { inputTokens: 20, outputTokens: 30, cacheReadTokens: 100, reasoningTokens: 12 }
    })
  })

  it('assembles tool calls by item, and closes one that never got a done with {}', async () => {
    const events = await collect(
      transport(fixture('tool.sse')).stream({ model: 'm', messages: HISTORY }, { apiKey: 't' })
    )
    expect(events).toEqual([
      {
        kind: 'tool-calls',
        finishReason: 'tool_calls',
        usage: { inputTokens: 40, outputTokens: 9 },
        calls: [
          { id: 'call_read', name: 'read_chapter', arguments: '{"chapter":2,"side":"source"}' },
          { id: 'call_where', name: 'get_current_chapter', arguments: '{}' }
        ]
      }
    ])
  })

  it('says an answer cut by the output cap ended for length', async () => {
    const events = await collect(
      transport(fixture('incomplete.sse')).stream(
        { model: 'm', messages: HISTORY },
        { apiKey: 't' }
      )
    )
    expect(events.at(-1)).toMatchObject({ kind: 'done', finishReason: 'length' })
  })

  it('throws a failed response after the text that came before it', async () => {
    const seen: ChatStreamEvent[] = []
    let error: unknown
    try {
      for await (const event of transport(fixture('error.sse')).stream(
        { model: 'm', messages: HISTORY },
        { apiKey: 't' }
      )) {
        seen.push(event)
      }
    } catch (caught) {
      error = caught
    }
    expect(seen).toEqual([{ kind: 'delta', text: 'Bắt đầu' }])
    expect(error).toBeInstanceOf(ProviderError)
    expect((error as ProviderError).kind).toBe('quota')
  })

  it('reads a plain call to the end of the stream', async () => {
    const result = await transport(fixture('text.sse')).complete(
      { model: 'm', messages: HISTORY },
      { apiKey: 't' }
    )
    expect(result).toMatchObject({ text: 'Ma vương đã đến.', finishReason: 'stop', status: 200 })
  })

  it('posts to {base}/responses with the bearer token', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = []
    await collect(
      transport(fixture('text.sse'), 'codex', seen).stream(
        { model: 'm', messages: HISTORY },
        { apiKey: 'tok' }
      )
    )
    expect(seen[0].url).toBe('https://chatgpt.com/backend-api/codex/responses')
    expect((seen[0].init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('refreshes once on 401 and sends again with the new token', async () => {
    const seen: string[] = []
    let calls = 0
    const responses = new ResponsesTransport({
      baseUrl: 'https://chatgpt.com/backend-api/codex',
      flavor: 'codex',
      now: () => 1,
      fetchImpl: (async (_url: string, init: RequestInit) => {
        seen.push((init.headers as Record<string, string>).authorization)
        calls++
        return calls === 1
          ? new Response('{"error":{"message":"expired"}}', { status: 401 })
          : sse(fixture('text.sse'))
      }) as typeof fetch
    })
    const events = await collect(
      responses.stream(
        { model: 'm', messages: HISTORY },
        {
          apiKey: 'old',
          refresh: async () => ({ kind: 'oauth', provider: 'codex', accessToken: 'new' })
        }
      )
    )
    expect(seen).toEqual(['Bearer old', 'Bearer new'])
    expect(events.at(-1)).toMatchObject({ kind: 'done' })
  })
})

describe('reasoning summary', () => {
  it('gives the reasoning summary as reasoning, not as the answer', async () => {
    const body =
      'data: {"type":"response.reasoning_summary_text.delta","item_id":"rs_1","delta":"Đang nghĩ"}\n\n' +
      'data: {"type":"response.output_text.delta","item_id":"msg_1","delta":"Đáp"}\n\n' +
      'data: {"type":"response.completed","response":{"status":"completed"}}\n\n'
    const events = await collect(transport(body).stream({ model: 'm', messages: HISTORY }, { apiKey: 't' }))
    expect(events.slice(0, 2)).toEqual([
      { kind: 'reasoning', text: 'Đang nghĩ' },
      { kind: 'delta', text: 'Đáp' }
    ])
    const plain = await transport(body).complete({ model: 'm', messages: HISTORY }, { apiKey: 't' })
    expect(plain.text).toBe('Đáp')
  })
})
