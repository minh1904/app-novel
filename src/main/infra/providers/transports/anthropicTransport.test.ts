import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ChatMessage, ChatStreamEvent } from './openAiChatTransport'
import {
  AnthropicMessagesTransport,
  anthropicBase,
  anthropicKeyProblem,
  buildAnthropicBody,
  claudeThinking,
  toAnthropicMessages
} from './anthropicTransport'
import { ProviderError } from '../types'

/**
 * The Anthropic Messages transport (change `subscription-providers`, tasks 5.1–5.2). The SSE fixtures in
 * `__fixtures__/anthropic` are written by hand from the documented event shapes.
 */

const fixture = (name: string): string =>
  readFileSync(join(__dirname, '__fixtures__', 'anthropic', name), 'utf-8')

const HISTORY: ChatMessage[] = [
  { role: 'system', content: 'Bạn là người dịch.' },
  { role: 'user', content: 'Đọc đoạn 1–3' },
  {
    role: 'assistant',
    content: 'Để tôi đọc.',
    tool_calls: [
      {
        id: 'toolu_1',
        type: 'function',
        function: { name: 'read_segments', arguments: '{"chapter":4}' }
      },
      { id: 'toolu_2', type: 'function', function: { name: 'list_glossary', arguments: '' } }
    ]
  },
  { role: 'tool', tool_call_id: 'toolu_1', content: '[1] 一。' },
  { role: 'tool', tool_call_id: 'toolu_2', content: 'Thuật ngữ: 0 mục' },
  { role: 'user', content: 'Dịch đi' }
]

const TOOLS = [
  { type: 'function', function: { name: 'a', description: 'A', parameters: { type: 'object' } } },
  { type: 'function', function: { name: 'b', parameters: { type: 'object' } } }
]

describe('toAnthropicMessages', () => {
  it('puts system aside, turns tool calls into blocks, and merges turns of one role', () => {
    const { system, messages } = toAnthropicMessages(HISTORY)
    expect(system).toEqual(['Bạn là người dịch.'])
    expect(messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user'])
    expect(messages[1].content).toEqual([
      { type: 'text', text: 'Để tôi đọc.' },
      { type: 'tool_use', id: 'toolu_1', name: 'read_segments', input: { chapter: 4 } },
      { type: 'tool_use', id: 'toolu_2', name: 'list_glossary', input: {} }
    ])
    // Two tool answers and the next question share one user turn.
    expect(messages[2].content).toEqual([
      { type: 'tool_result', tool_use_id: 'toolu_1', content: '[1] 一。' },
      { type: 'tool_result', tool_use_id: 'toolu_2', content: 'Thuật ngữ: 0 mục' },
      { type: 'text', text: 'Dịch đi' }
    ])
  })
})

describe('buildAnthropicBody', () => {
  it('always sends max_tokens and marks the system prompt and the last tool for the cache', () => {
    const body = buildAnthropicBody({ model: 'claude-sonnet-4-6', messages: HISTORY, tools: TOOLS })
    expect(body.max_tokens).toBe(8192)
    expect(body.system).toEqual([
      { type: 'text', text: 'Bạn là người dịch.', cache_control: { type: 'ephemeral' } }
    ])
    expect(body.tools).toEqual([
      { name: 'a', description: 'A', input_schema: { type: 'object' } },
      { name: 'b', input_schema: { type: 'object' }, cache_control: { type: 'ephemeral' } }
    ])
  })

  it('thinks adaptively on Claude 4.6', () => {
    const body = buildAnthropicBody({
      model: 'claude-sonnet-4-6',
      messages: HISTORY,
      reasoningEffort: 'high'
    })
    expect(body.thinking).toEqual({ type: 'adaptive' })
    expect(body.output_config).toEqual({ effort: 'high' })
  })

  it('gives Claude 4.5 a budget of 16000 at High, with room for the answer and temperature 1', () => {
    const body = buildAnthropicBody({
      model: 'claude-opus-4-5',
      messages: HISTORY,
      reasoningEffort: 'high',
      maxTokens: 2000,
      temperature: 0.3,
      topP: 0.9
    })
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 16000 })
    expect(body.max_tokens).toBeGreaterThanOrEqual(20096)
    expect(body.temperature).toBe(1)
    expect('top_p' in body).toBe(false)
  })

  it('sends no thinking for Haiku, and switches it off elsewhere for "off"', () => {
    const haiku = buildAnthropicBody({
      model: 'claude-haiku-4-5',
      messages: HISTORY,
      reasoningEffort: 'high'
    })
    expect('thinking' in haiku).toBe(false)
    const off = buildAnthropicBody({
      model: 'claude-sonnet-4-5',
      messages: HISTORY,
      reasoningEffort: 'none'
    })
    expect(off.thinking).toEqual({ type: 'disabled' })
  })

  it('reads the thinking family from the id', () => {
    expect(claudeThinking('claude-opus-4-6')).toBe('adaptive')
    expect(claudeThinking('claude-sonnet-4.6')).toBe('adaptive')
    expect(claudeThinking('claude-opus-5')).toBe('adaptive')
    expect(claudeThinking('claude-sonnet-4-20250514')).toBe('budget')
    expect(claudeThinking('claude-3-7-sonnet-latest')).toBe('budget')
    expect(claudeThinking('claude-3-5-haiku')).toBe('none')
  })
})

describe('keys and address', () => {
  it('refuses a Claude login token and anything that is not an API key', () => {
    expect(anthropicKeyProblem('sk-ant-oat01-abc')).toBe(
      'Đây là token đăng nhập Claude, không phải khóa API. Lấy khóa API ở console.anthropic.com'
    )
    expect(anthropicKeyProblem('sk-proj-abc')).toContain('sk-ant-api')
    expect(anthropicKeyProblem('sk-ant-api03-abc')).toBeNull()
  })

  it('never doubles /v1', () => {
    expect(anthropicBase('https://api.anthropic.com/v1/')).toBe('https://api.anthropic.com')
    expect(anthropicBase('https://api.anthropic.com')).toBe('https://api.anthropic.com')
  })
})

function transport(
  body: string | Response,
  seen: Array<{ url: string; init: RequestInit }> = []
): AnthropicMessagesTransport {
  return new AnthropicMessagesTransport({
    baseUrl: 'https://api.anthropic.com',
    now: () => 1,
    fetchImpl: (async (url: string, init: RequestInit) => {
      seen.push({ url, init })
      return typeof body === 'string'
        ? new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
        : body
    }) as typeof fetch
  })
}

async function collect(stream: AsyncIterable<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

describe('reading the stream', () => {
  it('gives the text, skips thinking, and counts the cache apart', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = []
    const events = await collect(
      transport(fixture('text.sse'), seen).stream(
        { model: 'claude-sonnet-4-6', messages: HISTORY },
        { apiKey: 'sk-ant-api03-x' }
      )
    )
    expect(events.filter((event) => event.kind === 'delta')).toEqual([
      { kind: 'delta', text: 'Ma vương ' },
      { kind: 'delta', text: 'đã đến.' }
    ])
    expect(events.at(-1)).toEqual({
      kind: 'done',
      finishReason: 'stop',
      usage: { inputTokens: 30, outputTokens: 42, cacheReadTokens: 1200 }
    })
    expect(seen[0].url).toBe('https://api.anthropic.com/v1/messages')
    const headers = seen[0].init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('sk-ant-api03-x')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(headers.authorization).toBeUndefined()
  })

  it('assembles a tool call from its JSON pieces', async () => {
    const events = await collect(
      transport(fixture('tool.sse')).stream(
        { model: 'claude-sonnet-4-6', messages: HISTORY },
        { apiKey: 'k' }
      )
    )
    expect(events.at(-1)).toEqual({
      kind: 'tool-calls',
      finishReason: 'tool_calls',
      usage: { inputTokens: 50, outputTokens: 60, cacheWriteTokens: 900 },
      calls: [
        {
          id: 'toolu_1',
          name: 'read_segments',
          arguments: '{"chapter": 4, "from": 1, "to": 3, "side": "source"}'
        }
      ]
    })
  })

  it('makes an overloaded error something to try again', async () => {
    const body =
      'event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\n'
    let error: unknown
    try {
      await collect(
        transport(body).stream({ model: 'claude-sonnet-4-6', messages: HISTORY }, { apiKey: 'k' })
      )
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(ProviderError)
    expect((error as ProviderError).retryable).toBe(true)
  })

  it('lists models page by page', async () => {
    let page = 0
    const lister = new AnthropicMessagesTransport({
      baseUrl: 'https://api.anthropic.com',
      now: () => 1,
      fetchImpl: (async (url: string) => {
        page++
        return new Response(
          JSON.stringify(
            url.includes('after_id')
              ? { data: [{ id: 'claude-haiku-4-5' }], has_more: false }
              : {
                  data: [{ id: 'claude-sonnet-4-6' }],
                  has_more: true,
                  last_id: 'claude-sonnet-4-6'
                }
          ),
          { status: 200 }
        )
      }) as typeof fetch
    })
    expect(await lister.listModels({ apiKey: 'k' })).toEqual([
      'claude-sonnet-4-6',
      'claude-haiku-4-5'
    ])
    expect(page).toBe(2)
  })
})

describe('thinking in the stream', () => {
  it('gives thinking as reasoning, apart from the answer text', async () => {
    const events = await collect(
      transport(fixture('text.sse')).stream({ model: 'claude-sonnet-4-6', messages: HISTORY }, { apiKey: 'k' })
    )
    expect(events.filter((event) => event.kind === 'reasoning')).toEqual([
      { kind: 'reasoning', text: 'Người dùng muốn...' }
    ])
  })
})
