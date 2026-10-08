import { createHash } from 'node:crypto'
import { FORBIDDEN_BODY_FIELDS } from '../../../shared/contracts/modelSettings'
import { parseSseStream } from './chatStream'
import { classifyHttpError } from './classifyError'
import { normalizeModelId } from './modelCatalog'
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
  baseFor,
  buildHeaders,
  errorMessage,
  joinUrl,
  sendWithRefresh,
  toProviderError,
  type CallOptions,
  type ChatTransport,
  type TransportTimeouts
} from './transportShared'
import { ProviderError } from './types'
import type { Usage } from './usage'

/**
 * The OpenAI Responses API: `POST {base}/responses`, streamed (change `subscription-providers`, design D2).
 * Codex speaks only this, and Copilot uses it for `gpt-5` and later.
 *
 * Mira's messages and tools are turned into Responses items **at the edge**, here, and the stream is read
 * back into the same `ChatStreamEvent`s Chat Completions gives, so chat, translation and the chat tools do
 * not know which transport ran. Protocol details follow Hermes (`agent/codex_responses_adapter.py`,
 * `agent/codex_runtime.py`, commit `bf871a5943`).
 */

/** Which Responses endpoint: Codex wants a few things the public API does not, and refuses `max_output_tokens`. */
export type ResponsesFlavor = 'codex' | 'standard'

export interface ResponsesOptions {
  baseUrl: string
  flavor: ResponsesFlavor
  fetchImpl: typeof fetch
  now: () => number
  timeouts?: Partial<TransportTimeouts>
  headers?: (call: CallOptions, request?: ChatRequest) => Record<string, string>
  /**
   * What the prompt cache key is scoped to (the connection), so two accounts never share one. Codex only.
   */
  cacheScope?: string
  /** The model takes `reasoning.effort: "none"`; when it does not, "off" sends no `reasoning` at all. */
  supportsNoReasoning?: boolean
  refreshWhen?: (status: number, body: string) => boolean
}

/** Longest `call_id` the API takes. */
export const CALL_ID_MAX = 64

/** A `call_id` within the limit: long ones become a stable hash, so the same id always maps the same way. */
export function shortCallId(id: string): string {
  if (id.length <= CALL_ID_MAX) return id
  return 'call_' + createHash('sha256').update(id).digest('hex').slice(0, 40)
}

/**
 * Text the Responses API rejects: the harmony control tokens. They are replaced by the same characters with
 * a fullwidth bar, so the text reads the same and the request goes through (`adapter.py:88`).
 */
export function sanitizeText(text: string): string {
  return text.replace(/<\|(start|end|channel|message)\|>/g, '<｜$1｜>')
}

interface FunctionTool {
  type: 'function'
  name: string
  description?: string
  strict: false
  parameters: unknown
}

/** A Chat Completions tool (`{type, function:{…}}`) as a Responses tool. */
function toResponsesTool(tool: unknown): FunctionTool | null {
  const fn = (
    tool as { function?: { name?: unknown; description?: unknown; parameters?: unknown } }
  )?.function
  if (typeof fn?.name !== 'string') return null
  return {
    type: 'function',
    name: fn.name,
    ...(typeof fn.description === 'string' ? { description: fn.description } : {}),
    strict: false,
    parameters: fn.parameters ?? { type: 'object', properties: {} }
  }
}

/** Mira's turns as Responses `input` items, and the system turns as `instructions`. */
export function toResponsesInput(messages: ChatMessage[]): {
  instructions: string
  input: Array<Record<string, unknown>>
} {
  const system: string[] = []
  const input: Array<Record<string, unknown>> = []
  for (const message of messages) {
    if (message.role === 'system') {
      system.push(message.content)
    } else if (message.role === 'user') {
      input.push({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: sanitizeText(message.content) }]
      })
    } else if (message.role === 'assistant') {
      if (message.content !== '') {
        input.push({
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: sanitizeText(message.content) }]
        })
      }
      for (const call of message.tool_calls ?? []) {
        input.push({
          type: 'function_call',
          call_id: shortCallId(call.id),
          name: call.function.name,
          arguments: call.function.arguments === '' ? '{}' : call.function.arguments
        })
      }
    } else {
      input.push({
        type: 'function_call_output',
        call_id: shortCallId(message.tool_call_id ?? ''),
        output: sanitizeText(message.content)
      })
    }
  }
  return { instructions: system.join('\n\n'), input }
}

/** `pck_` + 24 hex: the same instructions and tools in the same scope reuse the same cache. */
export function promptCacheKey(scope: string, instructions: string, tools: FunctionTool[]): string {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))
  const digest = createHash('sha256')
    .update(scope + '\0' + instructions + '\0' + JSON.stringify(sorted))
    .digest('hex')
  return 'pck_' + digest.slice(0, 24)
}

/** The request body. Like Chat Completions, a field appears only when somebody set it. */
export function buildResponsesBody(
  request: ChatRequest,
  options: Pick<ResponsesOptions, 'flavor' | 'cacheScope' | 'supportsNoReasoning'>
): Record<string, unknown> {
  const { instructions, input } = toResponsesInput(request.messages)
  const tools = (request.tools ?? [])
    .map(toResponsesTool)
    .filter((tool): tool is FunctionTool => tool !== null)
  const body: Record<string, unknown> = {
    model: request.model,
    instructions,
    input,
    stream: true,
    store: false
  }
  if (tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }
  const effort = request.reasoningEffort
  if (effort !== undefined) {
    if (effort !== 'none') body.reasoning = { effort, summary: 'auto' }
    else if (options.supportsNoReasoning) body.reasoning = { effort: 'none' }
  }
  if (options.flavor === 'codex') {
    body.include = ['reasoning.encrypted_content']
    body.prompt_cache_key = promptCacheKey(options.cacheScope ?? '', instructions, tools)
  } else {
    if (request.maxTokens !== undefined) body.max_output_tokens = request.maxTokens
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.topP !== undefined) body.top_p = request.topP
  }
  const extra: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(request.extraBody ?? {})) {
    if (!(FORBIDDEN_BODY_FIELDS as readonly string[]).includes(name)) extra[name] = value
  }
  // Codex refuses an output cap however it arrives.
  if (options.flavor === 'codex') delete extra.max_output_tokens
  return { ...body, ...extra }
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined
}

/** Responses usage: `input_tokens` **includes** the cached part, which Mira counts apart. */
export function responsesUsage(raw: unknown): Usage | null {
  const usage = (raw ?? {}) as Record<string, unknown>
  const input = count(usage.input_tokens)
  const output = count(usage.output_tokens)
  if (input === undefined || output === undefined) return null
  const cached = count(
    (usage.input_tokens_details as Record<string, unknown> | undefined)?.cached_tokens
  )
  const reasoning = count(
    (usage.output_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens
  )
  const result: Usage = { inputTokens: input - (cached ?? 0), outputTokens: output }
  if (cached !== undefined && cached > 0) result.cacheReadTokens = cached
  if (reasoning !== undefined && reasoning > 0) result.reasoningTokens = reasoning
  return result
}

interface PendingCall {
  callId: string
  name: string
  arguments: string
  done: boolean
}

/** Phases of a `message` item that are the model talking to itself, not the answer. */
const HIDDEN_PHASES = new Set(['commentary', 'analysis'])

/**
 * Reads a Responses event stream into Mira's events. A pure function over the `data:` payloads, so the
 * fixtures in `__fixtures__` test it without HTTP.
 */
export async function* readResponsesEvents(
  events: AsyncIterable<{ data: string }>,
  options: { now: () => number; secrets: readonly (string | null)[]; onEvent?: () => void }
): AsyncGenerator<ChatStreamEvent> {
  const phases = new Map<string, string>()
  const calls = new Map<string, PendingCall>()
  const order: string[] = []
  let usage: Usage | null = null
  let finishReason: FinishReason = 'unknown'

  for await (const event of events) {
    options.onEvent?.()
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>
    } catch {
      continue
    }
    const type = payload.type
    const item = (payload.item ?? {}) as Record<string, unknown>
    if (type === 'response.output_item.added' || type === 'response.output_item.done') {
      const id = typeof item.id === 'string' ? item.id : ''
      if (item.type === 'message' && typeof item.phase === 'string') phases.set(id, item.phase)
      if (item.type === 'function_call') {
        const current = calls.get(id)
        const next: PendingCall = {
          callId: typeof item.call_id === 'string' ? item.call_id : (current?.callId ?? id),
          name: typeof item.name === 'string' ? item.name : (current?.name ?? ''),
          arguments:
            typeof item.arguments === 'string' && item.arguments !== ''
              ? item.arguments
              : (current?.arguments ?? ''),
          done: type === 'response.output_item.done' || current?.done === true
        }
        if (!current) order.push(id)
        calls.set(id, next)
      }
    } else if (type === 'response.output_text.delta') {
      const itemId = typeof payload.item_id === 'string' ? payload.item_id : ''
      if (HIDDEN_PHASES.has(phases.get(itemId) ?? '')) continue
      if (typeof payload.delta === 'string' && payload.delta !== '') {
        yield { kind: 'delta', text: payload.delta }
      }
    } else if (type === 'response.function_call_arguments.delta') {
      const call = calls.get(String(payload.item_id))
      if (call && !call.done && typeof payload.delta === 'string') call.arguments += payload.delta
    } else if (type === 'response.function_call_arguments.done') {
      const call = calls.get(String(payload.item_id))
      if (call && typeof payload.arguments === 'string') {
        call.arguments = payload.arguments
        call.done = true
      }
    } else if (
      type === 'response.completed' ||
      type === 'response.incomplete' ||
      type === 'response.failed'
    ) {
      const response = (payload.response ?? {}) as Record<string, unknown>
      usage = responsesUsage(response.usage) ?? usage
      if (type === 'response.failed' || response.status === 'failed') {
        const error = (response.error ?? {}) as Record<string, unknown>
        throw failureFromEvent(error, options)
      }
      const reason = (response.incomplete_details as Record<string, unknown> | undefined)?.reason
      if (response.status === 'incomplete' || type === 'response.incomplete') {
        finishReason = reason === 'content_filter' ? 'filter' : 'length'
      } else {
        finishReason = 'stop'
      }
    } else if (type === 'error') {
      throw failureFromEvent((payload.error ?? payload) as Record<string, unknown>, options)
    }
  }

  // A call opened without a closing `.done` is closed with what it has; with nothing, its arguments are `{}`.
  const assembled: AssembledToolCall[] = order
    .map((id) => calls.get(id)!)
    .filter((call) => call.name !== '')
    .map((call) => ({ id: call.callId, name: call.name, arguments: call.arguments || '{}' }))
  if (assembled.length > 0) {
    yield { kind: 'tool-calls', calls: assembled, usage, finishReason: 'tool_calls' }
    return
  }
  yield { kind: 'done', usage, finishReason }
}

/** An error reported inside the stream, classified like an HTTP error with the status it names. */
function failureFromEvent(
  error: Record<string, unknown>,
  options: { now: () => number; secrets: readonly (string | null)[] }
): ProviderError {
  const code = typeof error.code === 'string' ? error.code : ''
  const status =
    typeof error.status === 'number'
      ? error.status
      : code === 'rate_limit_exceeded' || code === 'usage_limit_reached'
        ? 429
        : code === 'context_length_exceeded' || code === 'invalid_request_error'
          ? 400
          : 500
  return toProviderError(
    classifyHttpError({
      status,
      body: JSON.stringify({ error }),
      now: options.now(),
      secrets: options.secrets
    })
  )
}

export class ResponsesTransport implements ChatTransport {
  private readonly timeouts: TransportTimeouts

  constructor(private readonly options: ResponsesOptions) {
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts }
  }

  /**
   * The models the endpoint lists. Codex lists `{models:[{slug, visibility, priority}]}` and wants a client
   * version: 99.0.0 first, then 0.0.0 when that lists nothing (`hermes_cli/codex_models.py`).
   */
  async listModels(call: CallOptions): Promise<string[]> {
    const versions = this.options.flavor === 'codex' ? ['99.0.0', '0.0.0'] : [null]
    let ids: string[] = []
    for (const version of versions) {
      ids = await this.listOnce(call, version)
      if (ids.length > 0) break
    }
    return ids
  }

  private async listOnce(call: CallOptions, version: string | null): Promise<string[]> {
    const attempt = new Attempt(call.signal)
    attempt.deadline.arm(this.timeouts.totalMs)
    try {
      const path = version === null ? 'models' : 'models?client_version=' + version
      const { response, apiKey } = await this.send(path, { method: 'GET' }, attempt, call)
      if (!response.ok) throw await this.failure(response, apiKey, attempt)
      let body: { data?: unknown[]; models?: unknown[] }
      try {
        body = (await response.json()) as typeof body
      } catch (error) {
        throw new ProviderError(
          'invalid_response',
          'Phản hồi không phải JSON hợp lệ: ' + errorMessage(error, apiKey)
        )
      }
      return listedModels(body)
    } finally {
      attempt.finish()
    }
  }

  /** Codex answers only in a stream, so a plain call reads the stream to its end. */
  async complete(request: ChatRequest, call: CallOptions): Promise<CompleteResult> {
    let text = ''
    let result: CompleteResult = { text: '', finishReason: 'unknown', usage: null, status: 200 }
    for await (const event of this.stream(request, call)) {
      if (event.kind === 'delta') text += event.text
      else result = { text, finishReason: event.finishReason, usage: event.usage, status: 200 }
    }
    return { ...result, text }
  }

  async *stream(request: ChatRequest, call: CallOptions): AsyncGenerator<ChatStreamEvent> {
    const attempt = new Attempt(call.signal)
    attempt.deadline.arm(this.timeouts.firstByteMs)
    try {
      const body = JSON.stringify(buildResponsesBody(request, this.options))
      const { response, apiKey } = await this.send(
        'responses',
        { method: 'POST', body, extraHeaders: request.extraHeaders },
        attempt,
        call,
        request
      )
      if (!response.ok) throw await this.failure(response, apiKey, attempt, request)
      if (response.body === null) {
        throw new ProviderError('invalid_response', 'Phản hồi không có thân để đọc.', {
          status: response.status
        })
      }
      try {
        yield* readResponsesEvents(parseSseStream(response.body), {
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
    call: CallOptions,
    request?: ChatRequest
  ): Promise<{ response: Response; apiKey: string | null }> {
    return sendWithRefresh(
      call,
      attempt,
      (current) => {
        const own: Record<string, string> = {
          accept: init.body === undefined ? 'application/json' : 'text/event-stream'
        }
        if (init.body !== undefined) own['content-type'] = 'application/json'
        if (current.apiKey) own.authorization = 'Bearer ' + current.apiKey
        const provided = this.options.headers?.(current, request) ?? {}
        return this.options.fetchImpl(joinUrl(baseFor(this.options.baseUrl, current), path), {
          method: init.method,
          headers: buildHeaders(own, { ...init.extraHeaders, ...provided }),
          body: init.body,
          signal: attempt.signal
        })
      },
      this.options.refreshWhen
    )
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

/** The model ids of a listing, in either shape: `{data:[{id}]}` or Codex's `{models:[{slug,…}]}`. */
export function listedModels(body: { data?: unknown[]; models?: unknown[] }): string[] {
  if (Array.isArray(body.models)) {
    return body.models
      .map(
        (raw) => raw as { slug?: unknown; id?: unknown; visibility?: unknown; priority?: unknown }
      )
      .filter((model) => model.visibility !== 'hide' && model.visibility !== 'hidden')
      .map((model, index) => ({
        id:
          typeof model.slug === 'string'
            ? model.slug
            : typeof model.id === 'string'
              ? model.id
              : '',
        priority: typeof model.priority === 'number' ? model.priority : Number.MAX_SAFE_INTEGER,
        index
      }))
      .filter((model) => model.id !== '')
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map((model) => model.id)
  }
  return (body.data ?? [])
    .map((entry) => (entry as { id?: unknown })?.id)
    .filter((id): id is string => typeof id === 'string')
    .map(normalizeModelId)
}
