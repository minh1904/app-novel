import { normalizeBaseUrl } from '../../../shared/contracts/endpointUrl'
import { FORBIDDEN_BODY_FIELDS, FORBIDDEN_HEADERS } from '../../../shared/contracts/modelSettings'
import { classifyHttpError, type ClassifiedError } from './classifyError'
import { parseSseStream } from './chatStream'
import type { Compat } from './compat'
import { normalizeModelId } from './modelCatalog'
import { redactSecrets } from './redact'
import { ProviderError } from './types'
import { normalizeUsage, type Usage } from './usage'

/**
 * One call to an OpenAI-compatible `/chat/completions` endpoint, and nothing else.
 *
 * This is the bottom layer of the connection stack (design D2 of change `ai-gateway`). It does **not**
 * pick a key, retry, split work into batches or know what a prompt is about: the key is handed in per
 * call, and everything that is a *policy* belongs to the layer above. What it does own is the part
 * that is the same for every caller and easy to get wrong:
 *
 *  - building the request body so that a parameter nobody set is **not sent**;
 *  - reading the answer — text, tool calls, why it ended, usage — in one shape, in both the plain and
 *    the streaming form;
 *  - deadlines and cancel, and telling the two apart (cancel wins);
 *  - turning every failure into a typed `ProviderError` that carries what was learned (status, wait
 *    time, quota scope, a scrubbed excerpt of the body) and never the key that was sent.
 *
 * Errors are **thrown**, as everywhere in this repo, rather than returned as values the way
 * LinguaGacha's client does. The facts LinguaGacha returns (status, retry-after, retryable) travel on
 * the error instead; text received before a mid-stream error has already been yielded by then.
 */

/** A turn in the conversation, in the shape an OpenAI-compatible endpoint takes. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** An `assistant` turn that asked for tools; it must be sent back unchanged on the next round. */
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  /** A `tool` turn answers exactly this call. */
  tool_call_id?: string
}

/** A tool call after its fragments were put back together. */
export interface AssembledToolCall {
  id: string
  name: string
  arguments: string
}

/** Why the answer ended. `unknown` is what an endpoint that did not say gets, and is not an error. */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'filter' | 'unknown'

/**
 * What a streamed turn produces: any number of `delta`, then **exactly one** ending — `done` when the
 * model finished answering, or `tool-calls` when it wants to read something first.
 *
 * Failures are not an event: they are thrown, after the `delta`s that came before them.
 */
export type ChatStreamEvent =
  | { kind: 'delta'; text: string }
  | {
      kind: 'tool-calls'
      calls: AssembledToolCall[]
      usage: Usage | null
      finishReason: FinishReason
    }
  | { kind: 'done'; usage: Usage | null; finishReason: FinishReason }

/** What to ask for. Generation parameters are optional and are sent only when set. */
export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  tools?: readonly unknown[]
  /** Output-token cap. The field it goes in is the endpoint's (`Compat.maxTokensField`). */
  maxTokens?: number
  temperature?: number
  topP?: number
  /** Sent whenever it is set, to any endpoint: a parameter the person chose is never dropped here. */
  reasoningEffort?: string
  /**
   * Fields merged into the body last, so the caller has the final say with a vendor's own parameters. Not
   * the final say over the fields Mira reads the answer by: those are removed (`FORBIDDEN_BODY_FIELDS`).
   */
  extraBody?: Record<string, unknown>
  /**
   * Headers added to the call. They go in **under** the ones Mira sets, and any that would carry the key or
   * describe the body is removed (`FORBIDDEN_HEADERS`), so the key still travels by the one path that
   * schedules and scrubs it.
   */
  extraHeaders?: Record<string, string>
}

/** The result of a plain (non-streaming) call. */
export interface CompleteResult {
  text: string
  finishReason: FinishReason
  usage: Usage | null
  /** HTTP status of the answer. */
  status: number
}

/** How long a call may take before it is given up as `timeout`. */
export interface TransportTimeouts {
  /** A plain call: the whole of it. */
  totalMs: number
  /** A streamed call: from sending the request until the first event arrives. */
  firstByteMs: number
  /** A streamed call: how long it may then stay silent between two events. */
  idleMs: number
}

export const DEFAULT_TIMEOUTS: TransportTimeouts = {
  totalMs: 180_000,
  firstByteMs: 60_000,
  idleMs: 60_000
}

export interface TransportOptions {
  /** The base address; it is normalized here as well as when saved, so old connections still work. */
  baseUrl: string
  compat: Compat
  fetchImpl: typeof fetch
  now: () => number
  timeouts?: Partial<TransportTimeouts>
}

/** What differs from call to call. */
export interface CallOptions {
  /** `null` for an endpoint on this machine that wants no key. */
  apiKey: string | null
  signal?: AbortSignal
}

/** Joins a path to a base without caring about a trailing slash or a pasted endpoint (see `normalizeBaseUrl`). */
export function joinUrl(baseUrl: string, path: string): string {
  return normalizeBaseUrl(baseUrl) + '/' + path.replace(/^\/+/, '')
}

/** The request body. A field appears only when somebody set it. */
export function buildChatBody(
  request: ChatRequest,
  compat: Compat,
  stream: boolean
): Record<string, unknown> {
  const body: Record<string, unknown> = { model: request.model, messages: request.messages }
  if (stream) {
    body.stream = true
    // Asked for out loud even though some sources say Gemini sends usage anyway: those are forum posts,
    // and the same call also runs against gateways. Saying it is right on both.
    if (compat.streamUsage) body.stream_options = { include_usage: true }
  }
  if (request.tools !== undefined && request.tools.length > 0) body.tools = request.tools
  if (request.maxTokens !== undefined) body[compat.maxTokensField] = request.maxTokens
  if (request.temperature !== undefined) body.temperature = request.temperature
  if (request.topP !== undefined) body.top_p = request.topP
  if (request.reasoningEffort !== undefined) body.reasoning_effort = request.reasoningEffort
  return { ...body, ...withoutForbiddenFields(request.extraBody) }
}

/**
 * The caller's `extraBody` minus the fields the rest of Mira depends on. They are refused when the setting
 * is saved too (`modelSettingsSchema`); this is the second fence, for a value that reached here some other
 * way, because spreading `stream: false` over a streamed call would leave the reader waiting for events
 * that never come.
 */
function withoutForbiddenFields(
  extra: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (extra === undefined) return {}
  const allowed: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(extra)) {
    if (!(FORBIDDEN_BODY_FIELDS as readonly string[]).includes(name)) allowed[name] = value
  }
  return allowed
}

/**
 * The headers of one call: the caller's extras first, then Mira's own on top. Names are compared without
 * regard to case, because header names are not case sensitive: `Authorization` and `authorization` are
 * one header, and the extra one must not survive next to the real one.
 */
export function buildHeaders(
  own: Record<string, string>,
  extra: Record<string, string> | undefined
): Record<string, string> {
  const ownNames = new Set(Object.keys(own).map((name) => name.toLowerCase()))
  const merged: Record<string, string> = {}
  for (const [name, value] of Object.entries(extra ?? {})) {
    const lower = name.toLowerCase()
    if ((FORBIDDEN_HEADERS as readonly string[]).includes(lower) || ownNames.has(lower)) continue
    merged[name] = value
  }
  return { ...merged, ...own }
}

/** `finish_reason` of an OpenAI-compatible answer, in the app's words. Anything unrecognized is `unknown`. */
export function mapFinishReason(raw: unknown): FinishReason {
  switch (raw) {
    case 'stop':
      return 'stop'
    case 'length':
      return 'length'
    case 'tool_calls':
    case 'function_call':
      return 'tool_calls'
    case 'content_filter':
      return 'filter'
    default:
      // Gemini qua endpoint tương thích OpenAI ghi kèm lý do: "content_filter: PROHIBITED_CONTENT",
      // "content_filter: RECITATION". Bỏ sót dạng này thì lô bị lọc trông như một phản hồi thiếu id.
      return typeof raw === 'string' && raw.startsWith('content_filter') ? 'filter' : 'unknown'
  }
}

/** A piece of a tool call. The name arrives once; the arguments trickle in over several frames. */
export interface ToolCallFragment {
  index: number
  id?: string
  name?: string
  arguments?: string
}

/** One `data:` frame of a streamed turn, taken out of its JSON. */
export interface ChatFrame {
  /** The new text of this frame; empty is normal (the opening frame carries only the role). */
  text: string
  usage: Usage | null
  /** The tool-call fragments of this frame, if any. */
  toolCalls: ToolCallFragment[]
  /** Raw `finish_reason`, present on the frame that closes the choice. */
  finishReason?: string
  /** The error body, when the provider reports a failure **mid-stream** instead of with an HTTP status. */
  error?: Record<string, unknown>
}

function readToolFragments(raw: unknown): ToolCallFragment[] {
  if (!Array.isArray(raw)) return []
  const fragments: ToolCallFragment[] = []
  for (const entry of raw) {
    const item = entry as {
      index?: unknown
      id?: unknown
      function?: { name?: unknown; arguments?: unknown }
    }
    // A missing `index` is the first call: some endpoints leave it out when there is only one.
    const index = typeof item?.index === 'number' ? item.index : 0
    const fragment: ToolCallFragment = { index }
    if (typeof item?.id === 'string') fragment.id = item.id
    if (typeof item?.function?.name === 'string') fragment.name = item.function.name
    if (typeof item?.function?.arguments === 'string') fragment.arguments = item.function.arguments
    fragments.push(fragment)
  }
  return fragments
}

/**
 * Reads one `data:` frame.
 *
 * Returns `null` for a frame it cannot read and does **not** throw: one odd line is not worth killing a
 * turn whose other frames are fine. An error frame is different — it is real news, so it is passed out
 * for the caller to classify.
 */
export function parseChatFrame(data: string): ChatFrame | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object') return null
  const payload = parsed as {
    error?: unknown
    usage?: unknown
    choices?: Array<{
      delta?: { content?: unknown; tool_calls?: unknown }
      finish_reason?: unknown
    }>
  }

  if (payload.error !== null && typeof payload.error === 'object') {
    return { text: '', usage: null, toolCalls: [], error: payload.error as Record<string, unknown> }
  }

  const choice = payload.choices?.[0]
  const content = choice?.delta?.content
  const frame: ChatFrame = {
    text: typeof content === 'string' ? content : '',
    usage: normalizeUsage(payload.usage),
    toolCalls: readToolFragments(choice?.delta?.tool_calls)
  }
  if (typeof choice?.finish_reason === 'string') frame.finishReason = choice.finish_reason
  return frame
}

/** A single deadline that can be re-armed; when it fires it aborts the call and remembers that it did. */
class Deadline {
  fired = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly onFire: () => void) {}

  arm(ms: number): void {
    this.clear()
    this.timer = setTimeout(() => {
      this.fired = true
      this.onFire()
    }, ms)
  }

  clear(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }
}

/**
 * The cancellation of one call: the caller's signal and our own deadline, merged.
 *
 * Both end the call by aborting it, so the *reason* has to be recovered afterwards. **Cancel beats
 * timeout** when both are true: a person who pressed Cancel is told it was cancelled, not that the
 * provider was slow.
 */
class Attempt {
  readonly signal: AbortSignal
  readonly deadline: Deadline
  private readonly controller = new AbortController()
  private readonly onAbort = (): void => this.controller.abort()

  constructor(private readonly caller: AbortSignal | undefined) {
    this.signal = this.controller.signal
    this.deadline = new Deadline(() => this.controller.abort())
    if (caller?.aborted) this.controller.abort()
    else caller?.addEventListener('abort', this.onAbort, { once: true })
  }

  /** The error that matches why the call stopped, or `null` when it did not stop for either reason. */
  interruption(): ProviderError | null {
    if (this.caller?.aborted) return new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
    if (this.deadline.fired) {
      return new ProviderError('timeout', 'Nhà cung cấp không trả lời trong thời hạn cho phép.')
    }
    return null
  }

  /** Always called when the call is over: it frees the timer, the listener and a connection left open. */
  finish(): void {
    this.deadline.clear()
    this.caller?.removeEventListener('abort', this.onAbort)
    this.controller.abort()
  }
}

function errorMessage(error: unknown, secret: string | null): string {
  return redactSecrets(error instanceof Error ? error.message : String(error), [secret])
}

export function toProviderError(error: ClassifiedError): ProviderError {
  return new ProviderError(error.kind, error.message, {
    retryAfterMs: error.retryAfterMs,
    status: error.status,
    receivedAt: error.receivedAt,
    quotaScope: error.quotaScope,
    bodySnippet: error.bodySnippet
  })
}

export class OpenAiChatTransport {
  private readonly timeouts: TransportTimeouts

  constructor(private readonly options: TransportOptions) {
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts }
  }

  /** The ids the endpoint lists under `GET /models` (a leading `models/` is dropped). Throws when it cannot. */
  async listModels({ apiKey, signal }: CallOptions): Promise<string[]> {
    const attempt = new Attempt(signal)
    attempt.deadline.arm(this.timeouts.totalMs)
    try {
      const response = await this.send('models', { method: 'GET', apiKey }, attempt)
      if (!response.ok) throw await this.failure(response, apiKey, attempt)
      const body = (await this.readJson(response, attempt, apiKey)) as {
        data?: Array<{ id?: unknown }>
      }
      return (body.data ?? [])
        .map((entry) => entry?.id)
        .filter((id): id is string => typeof id === 'string')
        .map(normalizeModelId)
    } finally {
      attempt.finish()
    }
  }

  /** A plain call: one request, one answer. */
  async complete(request: ChatRequest, { apiKey, signal }: CallOptions): Promise<CompleteResult> {
    const attempt = new Attempt(signal)
    attempt.deadline.arm(this.timeouts.totalMs)
    try {
      const body = JSON.stringify(buildChatBody(request, this.options.compat, false))
      const response = await this.send(
        'chat/completions',
        { method: 'POST', body, apiKey, extraHeaders: request.extraHeaders },
        attempt
      )
      if (!response.ok) throw await this.failure(response, apiKey, attempt)

      const payload = (await this.readJson(response, attempt, apiKey)) as {
        choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>
        usage?: unknown
      }
      const content = payload.choices?.[0]?.message?.content
      const finishReason = mapFinishReason(payload.choices?.[0]?.finish_reason)
      // Bị bộ lọc nội dung chặn thì không có chữ: đó là một câu trả lời ("từ chối"), không phải phản hồi
      // hỏng. Ném lỗi ở đây thì lõi dịch không biết để chia nhỏ lô, và cả lô mất.
      if (typeof content !== 'string' && finishReason === 'filter') {
        return {
          text: '',
          finishReason,
          usage: normalizeUsage(payload.usage),
          status: response.status
        }
      }
      if (typeof content !== 'string') {
        throw new ProviderError('invalid_response', 'Phản hồi không có nội dung văn bản.', {
          status: response.status
        })
      }
      return {
        text: content,
        finishReason,
        usage: normalizeUsage(payload.usage),
        status: response.status
      }
    } finally {
      attempt.finish()
    }
  }

  /**
   * A streamed call. Yields `delta`s as they arrive and ends with exactly one `done` or `tool-calls`.
   *
   * Closing the generator early (the consumer stops reading) releases the connection: `finish()` runs in
   * the `finally`, and it aborts whatever is still open.
   */
  async *stream(
    request: ChatRequest,
    { apiKey, signal }: CallOptions
  ): AsyncGenerator<ChatStreamEvent> {
    const attempt = new Attempt(signal)
    attempt.deadline.arm(this.timeouts.firstByteMs)
    try {
      const body = JSON.stringify(buildChatBody(request, this.options.compat, true))
      const response = await this.send(
        'chat/completions',
        { method: 'POST', body, apiKey, extraHeaders: request.extraHeaders },
        attempt
      )
      if (!response.ok) throw await this.failure(response, apiKey, attempt)
      if (response.body === null) {
        throw new ProviderError('invalid_response', 'Phản hồi không có thân để đọc.', {
          status: response.status
        })
      }

      let usage: Usage | null = null
      let finishReason: FinishReason = 'unknown'
      // Fragments of a tool call are gathered by `index`: the name comes once, the arguments over many frames.
      const pending = new Map<number, { id: string; name: string; arguments: string }>()
      try {
        for await (const event of parseSseStream(response.body)) {
          // The first event ends the wait for a first byte; from here on the limit is silence between events.
          attempt.deadline.arm(this.timeouts.idleMs)
          // Checked inside the loop and not left to the body stream failing by itself: a real fetch does
          // abort its body, but a proxy or another endpoint may not, and Cancel must never depend on that.
          if (signal?.aborted) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
          const frame = parseChatFrame(event.data)
          if (frame === null) continue
          if (frame.error !== undefined) {
            // An error in the middle of a stream has no HTTP status of its own, so take the `code` it
            // carries and fall back to 500: "line trouble, worth trying again" is a safer default than
            // `refused`, which would stop a person from retrying something temporary.
            throw toProviderError(
              classifyHttpError({
                status: typeof frame.error.code === 'number' ? frame.error.code : 500,
                body: JSON.stringify({ error: frame.error }),
                now: this.options.now(),
                secrets: [apiKey]
              })
            )
          }
          if (frame.usage !== null) usage = frame.usage
          if (frame.finishReason !== undefined) finishReason = mapFinishReason(frame.finishReason)
          for (const fragment of frame.toolCalls) {
            const current = pending.get(fragment.index) ?? { id: '', name: '', arguments: '' }
            pending.set(fragment.index, {
              id: fragment.id ?? current.id,
              name: fragment.name ?? current.name,
              arguments: current.arguments + (fragment.arguments ?? '')
            })
          }
          if (frame.text !== '') yield { kind: 'delta', text: frame.text }
        }
      } catch (error) {
        const stop = attempt.interruption()
        if (stop !== null) throw stop
        if (error instanceof ProviderError) throw error
        throw new ProviderError('network', 'Mất kết nối: ' + errorMessage(error, apiKey))
      }

      // A call without a name is a broken fragment, not a call: drop it rather than hand it on to be run.
      const calls = [...pending.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, call]) => call)
        .filter((call) => call.name !== '')
      if (calls.length > 0) {
        yield {
          kind: 'tool-calls',
          calls,
          usage,
          finishReason: finishReason === 'unknown' ? 'tool_calls' : finishReason
        }
        return
      }
      yield { kind: 'done', usage, finishReason }
    } finally {
      attempt.finish()
    }
  }

  /** One request. A failure to even get an answer is `network`, or `timeout`/`cancelled` when that is why. */
  private async send(
    path: string,
    init: {
      method: string
      body?: string
      apiKey: string | null
      extraHeaders?: Record<string, string>
    },
    attempt: Attempt
  ): Promise<Response> {
    const own: Record<string, string> = { accept: 'application/json' }
    if (init.body !== undefined) own['content-type'] = 'application/json'
    if (init.apiKey) own.authorization = 'Bearer ' + init.apiKey
    const headers = buildHeaders(own, init.extraHeaders)

    try {
      return await this.options.fetchImpl(joinUrl(this.options.baseUrl, path), {
        method: init.method,
        headers,
        body: init.body,
        signal: attempt.signal
      })
    } catch (error) {
      const stop = attempt.interruption()
      if (stop !== null) throw stop
      throw new ProviderError(
        'network',
        'Không nối được tới nhà cung cấp: ' + errorMessage(error, init.apiKey)
      )
    }
  }

  /**
   * An answer that was not a success, as a typed error. The raw body is read **before** it is parsed, so
   * nothing is lost when it is not JSON, and the key is scrubbed from everything that comes out of it.
   */
  private async failure(
    response: Response,
    apiKey: string | null,
    attempt: Attempt
  ): Promise<ProviderError> {
    let body = ''
    try {
      body = await response.text()
    } catch {
      // A body that cannot be read must not hide the status. If the call was stopped, say that instead.
      const stop = attempt.interruption()
      if (stop !== null) return stop
      body = ''
    }
    return toProviderError(
      classifyHttpError({
        status: response.status,
        body,
        headers: response.headers,
        now: this.options.now(),
        secrets: [apiKey]
      })
    )
  }

  private async readJson(
    response: Response,
    attempt: Attempt,
    apiKey: string | null
  ): Promise<unknown> {
    try {
      return await response.json()
    } catch (error) {
      const stop = attempt.interruption()
      if (stop !== null) throw stop
      throw new ProviderError(
        'invalid_response',
        'Phản hồi không phải JSON hợp lệ: ' + errorMessage(error, apiKey),
        {
          status: response.status
        }
      )
    }
  }
}
