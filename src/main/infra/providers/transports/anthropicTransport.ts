import { FORBIDDEN_BODY_FIELDS } from '../../../../shared/contracts/modelSettings'
import { parseSseStream } from '../chatStream'
import { classifyHttpError } from '../classifyError'
import type {
  AssembledToolCall,
  ChatMessage,
  ChatRequest,
  ChatStreamEvent,
  CompleteResult,
  FinishReason
} from './openAiChatTransport'
import { sentParameters } from './openAiChatTransport'
import {
  Attempt,
  DEFAULT_TIMEOUTS,
  buildHeaders,
  errorMessage,
  sendWithRefresh,
  toProviderError,
  type CallOptions,
  type ChatTransport,
  type TransportTimeouts
} from './transportShared'
import { ProviderError } from '../types'
import type { Usage } from '../usage'

/**
 * Giao vận Anthropic Messages: gọi `POST {base}/v1/messages` dạng stream với khóa API.
 * Chuyển đổi các lượt hội thoại và công cụ sang định dạng block của Anthropic,
 * hỗ trợ đánh dấu cache cho system prompt và danh sách công cụ.
 */

export const ANTHROPIC_VERSION = '2023-06-01'
export const ANTHROPIC_BETA =
  'interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
/** Số lượng token tối đa mặc định khi cấu hình mô hình không chỉ định giới hạn (`max_tokens` là bắt buộc). */
export const DEFAULT_MAX_TOKENS = 8192
/** Dung lượng token dự phòng dành cho câu trả lời ngoài ngân sách suy luận (thinking budget). */
export const ANSWER_ROOM = 4096

/** Ngân sách suy luận theo mức độ dành cho các mô hình sử dụng ngân sách cố định. */
export const THINKING_BUDGET: Record<string, number> = {
  minimal: 1024,
  low: 4000,
  medium: 8000,
  high: 16000,
  xhigh: 32000,
  max: 32000
}

/** Mức độ nỗ lực suy luận (effort) dành cho các mô hình suy luận thích ứng. */
const ADAPTIVE_EFFORT: Record<string, string> = {
  minimal: 'low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'max',
  max: 'max'
}

/** Cơ chế suy luận của mô hình Claude dựa trên tên định danh. */
export type ClaudeThinking = 'adaptive' | 'budget' | 'none'

export function claudeThinking(model: string): ClaudeThinking {
  const id = model.toLowerCase()
  if (id.includes('haiku')) return 'none'
  const match = /claude-(?:opus|sonnet)-(\d+)(?:[.-](\d+))?/.exec(id)
  if (!match) return 'budget'
  const major = Number(match[1])
  const minor = match[2] === undefined ? 0 : Number(match[2])
  // Hậu tố ngày tháng không phải là phiên bản phụ (minor version).
  const realMinor = minor > 99 ? 0 : minor
  return major > 4 || (major === 4 && realMinor >= 6) ? 'adaptive' : 'budget'
}

interface Block {
  type: string
  [key: string]: unknown
}

function parseArguments(text: string): unknown {
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/**
 * Chuyển đổi các lượt tin nhắn sang định dạng Anthropic Messages:
 * gom các tin nhắn liên tiếp cùng vai trò và chuyển kết quả công cụ thành `tool_result`.
 */
export function toAnthropicMessages(messages: ChatMessage[]): {
  system: string[]
  messages: Array<{ role: 'user' | 'assistant'; content: Block[] }>
} {
  const system: string[] = []
  const out: Array<{ role: 'user' | 'assistant'; content: Block[] }> = []
  const push = (role: 'user' | 'assistant', blocks: Block[]): void => {
    if (blocks.length === 0) return
    const last = out[out.length - 1]
    if (last && last.role === role) last.content.push(...blocks)
    else out.push({ role, content: blocks })
  }
  for (const message of messages) {
    if (message.role === 'system') system.push(message.content)
    else if (message.role === 'user') push('user', [{ type: 'text', text: message.content }])
    else if (message.role === 'assistant') {
      const blocks: Block[] = []
      if (message.content !== '') blocks.push({ type: 'text', text: message.content })
      for (const call of message.tool_calls ?? []) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.function.name,
          input: parseArguments(call.function.arguments)
        })
      }
      push('assistant', blocks)
    } else {
      push('user', [
        { type: 'tool_result', tool_use_id: message.tool_call_id ?? '', content: message.content }
      ])
    }
  }
  return { system, messages: out }
}

/** Tạo nội dung body của yêu cầu gửi tới Anthropic. */
export function buildAnthropicBody(request: ChatRequest): Record<string, unknown> {
  const { system, messages } = toAnthropicMessages(request.messages)
  const body: Record<string, unknown> = { model: request.model, messages, stream: true }
  if (system.length > 0) {
    body.system = system.map((text, index) => ({
      type: 'text',
      text,
      ...(index === system.length - 1 ? { cache_control: { type: 'ephemeral' } } : {})
    }))
  }
  const tools = (request.tools ?? [])
    .map((tool) => (tool as { function?: Record<string, unknown> }).function)
    .filter((fn): fn is Record<string, unknown> => typeof fn?.name === 'string')
    .map((fn) => ({
      name: fn.name,
      ...(typeof fn.description === 'string' ? { description: fn.description } : {}),
      input_schema: fn.parameters ?? { type: 'object', properties: {} }
    }))
  if (tools.length > 0) {
    tools[tools.length - 1] = {
      ...tools[tools.length - 1],
      cache_control: { type: 'ephemeral' }
    } as (typeof tools)[number]
    body.tools = tools
  }

  let maxTokens = request.maxTokens ?? DEFAULT_MAX_TOKENS
  let temperature = request.temperature
  let topP = request.topP
  const level = request.reasoningEffort
  const family = claudeThinking(request.model)
  if (level !== undefined && family !== 'none') {
    if (level === 'none') {
      body.thinking = { type: 'disabled' }
    } else if (family === 'adaptive') {
      body.thinking = { type: 'adaptive' }
      body.output_config = { effort: ADAPTIVE_EFFORT[level] ?? 'medium' }
    } else {
      const budget = THINKING_BUDGET[level] ?? THINKING_BUDGET.medium
      body.thinking = { type: 'enabled', budget_tokens: budget }
      maxTokens = Math.max(maxTokens, budget + ANSWER_ROOM)
      // Khi bật suy luận có ngân sách chỉ sử dụng tham số lấy mẫu mặc định.
      temperature = 1
      topP = undefined
    }
  }
  body.max_tokens = maxTokens
  if (temperature !== undefined) body.temperature = temperature
  if (topP !== undefined) body.top_p = topP

  const extra: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(request.extraBody ?? {})) {
    if (!(FORBIDDEN_BODY_FIELDS as readonly string[]).includes(name)) extra[name] = value
  }
  return { ...body, ...extra }
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined
}

/** Phân tích thông tin token sử dụng (inputTokens không bao gồm token đọc từ cache). */
function usageOf(raw: Record<string, unknown>, output: number | undefined): Usage | null {
  const input = count(raw.input_tokens)
  if (input === undefined || output === undefined) return null
  const usage: Usage = { inputTokens: input, outputTokens: output }
  const read = count(raw.cache_read_input_tokens)
  const write = count(raw.cache_creation_input_tokens)
  if (read !== undefined && read > 0) usage.cacheReadTokens = read
  if (write !== undefined && write > 0) usage.cacheWriteTokens = write
  return usage
}

export function mapStopReason(reason: unknown): FinishReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop'
    case 'tool_use':
      return 'tool_calls'
    case 'max_tokens':
      return 'length'
    case 'refusal':
      return 'filter'
    default:
      return 'unknown'
  }
}

/** Đọc luồng sự kiện SSE từ Anthropic Messages thành các sự kiện stream chuẩn. */
export async function* readAnthropicEvents(
  events: AsyncIterable<{ data: string }>,
  options: { now: () => number; secrets: readonly (string | null)[]; onEvent?: () => void }
): AsyncGenerator<ChatStreamEvent> {
  let startUsage: Record<string, unknown> = {}
  let output: number | undefined
  let stop: FinishReason = 'unknown'
  const blocks = new Map<number, { type: string; id: string; name: string; json: string }>()

  for await (const event of events) {
    options.onEvent?.()
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>
    } catch {
      continue
    }
    const index = typeof payload.index === 'number' ? payload.index : 0
    switch (payload.type) {
      case 'message_start': {
        const message = (payload.message ?? {}) as Record<string, unknown>
        startUsage = (message.usage ?? {}) as Record<string, unknown>
        output = count(startUsage.output_tokens) ?? output
        break
      }
      case 'content_block_start': {
        const block = (payload.content_block ?? {}) as Record<string, unknown>
        blocks.set(index, {
          type: String(block.type),
          id: typeof block.id === 'string' ? block.id : '',
          name: typeof block.name === 'string' ? block.name : '',
          json: ''
        })
        break
      }
      case 'content_block_delta': {
        const delta = (payload.delta ?? {}) as Record<string, unknown>
        if (delta.type === 'text_delta' && typeof delta.text === 'string' && delta.text !== '') {
          yield { kind: 'delta', text: delta.text }
        } else if (
          delta.type === 'thinking_delta' &&
          typeof delta.thinking === 'string' &&
          delta.thinking !== ''
        ) {
          yield { kind: 'reasoning', text: delta.thinking }
        } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
          const block = blocks.get(index)
          if (block) block.json += delta.partial_json
        }
        break
      }
      case 'message_delta': {
        const delta = (payload.delta ?? {}) as Record<string, unknown>
        if (delta.stop_reason !== undefined) stop = mapStopReason(delta.stop_reason)
        output =
          count((payload.usage as Record<string, unknown> | undefined)?.output_tokens) ?? output
        break
      }
      case 'error': {
        const error = (payload.error ?? {}) as Record<string, unknown>
        const status =
          error.type === 'overloaded_error' ? 529 : error.type === 'rate_limit_error' ? 429 : 500
        throw toProviderError(
          classifyHttpError({
            status,
            body: JSON.stringify({ error }),
            now: options.now(),
            secrets: options.secrets
          })
        )
      }
      default:
        break
    }
  }

  const usage = usageOf(startUsage, output)
  const calls: AssembledToolCall[] = [...blocks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, block]) => block)
    .filter((block) => block.type === 'tool_use' && block.name !== '')
    .map((block) => ({ id: block.id, name: block.name, arguments: block.json || '{}' }))
  if (calls.length > 0) {
    yield { kind: 'tool-calls', calls, usage, finishReason: 'tool_calls' }
    return
  }
  yield {
    kind: 'done',
    usage,
    finishReason: stop,
    ...(stop === 'filter' ? { filter: { group: 'other' as const, raw: 'refusal' } } : {})
  }
}

/** Kiểm tra tính hợp lệ của khóa Anthropic trước khi lưu trữ (trả về null nếu hợp lệ). */
export function anthropicKeyProblem(key: string): string | null {
  const trimmed = key.trim()
  if (trimmed.startsWith('sk-ant-oat')) {
    return 'Đây là token đăng nhập Claude, không phải khóa API. Lấy khóa API ở console.anthropic.com'
  }
  if (!trimmed.startsWith('sk-ant-api')) {
    return 'Khóa Anthropic phải bắt đầu bằng sk-ant-api. Lấy khóa API ở console.anthropic.com'
  }
  return null
}

/** Chuẩn hóa địa chỉ URL cơ sở, loại bỏ hậu tố `/v1` để tránh trùng lặp endpoint. */
export function anthropicBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
}

export interface AnthropicOptions {
  baseUrl: string
  fetchImpl: typeof fetch
  now: () => number
  timeouts?: Partial<TransportTimeouts>
}

export class AnthropicMessagesTransport implements ChatTransport {
  private readonly timeouts: TransportTimeouts

  constructor(private readonly options: AnthropicOptions) {
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts }
  }

  /** Lấy danh sách mô hình qua `GET /v1/models`, hỗ trợ phân trang (`has_more`, `after_id`). */
  async listModels(call: CallOptions): Promise<string[]> {
    const ids: string[] = []
    let after: string | null = null
    for (let page = 0; page < 20; page++) {
      const attempt = new Attempt(call.signal)
      attempt.deadline.arm(this.timeouts.totalMs)
      try {
        const query =
          'v1/models?limit=100' + (after ? '&after_id=' + encodeURIComponent(after) : '')
        const { response, apiKey } = await this.send(query, { method: 'GET' }, attempt, call)
        if (!response.ok) throw await this.failure(response, apiKey, attempt)
        const body = (await response.json()) as {
          data?: Array<{ id?: unknown }>
          has_more?: unknown
          last_id?: unknown
        }
        for (const entry of body.data ?? []) if (typeof entry?.id === 'string') ids.push(entry.id)
        if (body.has_more !== true || typeof body.last_id !== 'string') break
        after = body.last_id
      } finally {
        attempt.finish()
      }
    }
    return ids
  }

  async complete(request: ChatRequest, call: CallOptions): Promise<CompleteResult> {
    let text = ''
    let result: CompleteResult = { text: '', finishReason: 'unknown', usage: null, status: 200 }
    for await (const event of this.stream(request, call)) {
      if (event.kind === 'delta') text += event.text
      else if (event.kind !== 'reasoning') {
        result = {
          text,
          finishReason: event.finishReason,
          usage: event.usage,
          status: 200,
          ...(event.kind === 'done' && event.filter ? { filter: event.filter } : {})
        }
      }
    }
    return { ...result, text }
  }

  async *stream(request: ChatRequest, call: CallOptions): AsyncGenerator<ChatStreamEvent> {
    const attempt = new Attempt(call.signal)
    attempt.deadline.arm(this.timeouts.firstByteMs)
    try {
      const body = JSON.stringify(buildAnthropicBody(request))
      const { response, apiKey } = await this.send(
        'v1/messages',
        { method: 'POST', body, extraHeaders: request.extraHeaders },
        attempt,
        call
      )
      if (!response.ok) throw await this.failure(response, apiKey, attempt, request)
      if (response.body === null) {
        throw new ProviderError('invalid_response', 'Phản hồi không có thân để đọc.', {
          status: response.status
        })
      }
      try {
        yield* readAnthropicEvents(parseSseStream(response.body), {
          now: this.options.now,
          secrets: [apiKey],
          onEvent: () => {
            attempt.deadline.arm(this.timeouts.idleMs)
            if (call.signal?.aborted) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
          }
        })
      } catch (error) {
        const stop = attempt.interruption()
        if (stop !== null) throw stop
        if (error instanceof ProviderError) throw error
        throw new ProviderError('network', 'Mất kết nối: ' + errorMessage(error, apiKey))
      }
    } finally {
      attempt.finish()
    }
  }

  private send(
    path: string,
    init: { method: string; body?: string; extraHeaders?: Record<string, string> },
    attempt: Attempt,
    call: CallOptions
  ): Promise<{ response: Response; apiKey: string | null }> {
    return sendWithRefresh(call, attempt, (current) => {
      const own: Record<string, string> = {
        accept: init.body === undefined ? 'application/json' : 'text/event-stream',
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': ANTHROPIC_BETA
      }
      if (init.body !== undefined) own['content-type'] = 'application/json'
      if (current.apiKey) own['x-api-key'] = current.apiKey
      return this.options.fetchImpl(anthropicBase(this.options.baseUrl) + '/' + path, {
        method: init.method,
        headers: buildHeaders(own, init.extraHeaders),
        body: init.body,
        signal: attempt.signal
      })
    })
  }

  private async failure(
    response: Response,
    apiKey: string | null,
    attempt: Attempt,
    request?: ChatRequest
  ): Promise<ProviderError> {
    let body = ''
    try {
      body = await response.text()
    } catch {
      const stop = attempt.interruption()
      if (stop !== null) return stop
    }
    return toProviderError(
      classifyHttpError({
        status: response.status,
        body,
        headers: response.headers,
        now: this.options.now(),
        secrets: [apiKey]
      }),
      request ? sentParameters(request) : undefined
    )
  }
}
