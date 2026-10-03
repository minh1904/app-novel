import { classifyHttpError, type ClassifiedError } from './classifyError'
import { parseSseStream } from './chatStream'
import { normalizeModelId } from './modelCatalog'
import { reconcile } from './reconcile'
import {
  ProviderError,
  type SegmentText,
  type TranslateOptions,
  type TranslateRequest,
  type TranslateResponse,
  type TranslateUsage,
  type TranslationProvider
} from './types'

/**
 * Provider duy nhất gọi ra ngoài: một endpoint **tương thích OpenAI**.
 *
 * Cùng một đoạn mã phục vụ cả hai hướng của lát cắt đầu — gateway người dùng tự dựng và API key
 * Google qua lớp tương thích — vì khác biệt giữa chúng nằm hết trong dữ liệu kết nối (D13 của
 * change `ai-connection`). Không dùng SDK nhà cung cấp: SDK làm mất `error.details`, đúng thứ
 * `classifyError` cần (D15).
 */

const BATCH_TARGET_TOKENS = 1500
/** Phỏng đoán, chưa đo: dùng để ước lượng token của một segment khi chia lô. */
const CHARS_PER_TOKEN = 2
const MAX_RETRIES_PER_BATCH = 3

/** Một lời gọi công cụ đã gom đủ mảnh. */
export interface AssembledToolCall {
  id: string
  name: string
  arguments: string
}

/** Một lượt trong hội thoại, đúng hình dạng endpoint tương thích OpenAI nhận. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** Lượt `assistant` đã yêu cầu gọi công cụ; phải gửi lại nguyên dạng ở vòng sau. */
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  /** Lượt `tool` trả kết quả cho đúng lời gọi này. */
  tool_call_id?: string
}

/**
 * Những gì một lượt hội thoại trả ra: nhiều `delta`, rồi **đúng một** kết thúc — `done` khi model đã
 * trả lời xong, hoặc `tool-calls` khi nó muốn đọc thêm trước khi trả lời.
 *
 * Lỗi **không** nằm trong kiểu này mà được ném: người tiêu thụ đã nhận các `delta` trước đó rồi, nên
 * ném vẫn đúng nghĩa "phần đã có cộng một lỗi" mà không cần một kiểu thứ ba. Hủy ném `cancelled`.
 */
export type ChatStreamEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'tool-calls'; calls: AssembledToolCall[]; usage: TranslateUsage | null }
  | { kind: 'done'; usage: TranslateUsage | null }

export const SYSTEM_PROMPT = [
  'Bạn là người dịch truyện sang tiếng Việt.',
  'Đầu vào là một mảng JSON các đối tượng {"id","src"}.',
  'Trả về đúng một mảng JSON các đối tượng {"id","dst"}, không kèm giải thích hay dấu ```.',
  'Giữ nguyên mọi id đã nhận, đủ số lượng, không thêm id mới.',
  'Dịch tự nhiên, giữ xuống dòng và dấu câu của bản gốc.'
].join(' ')

export interface KeyLease {
  /** `null` khi kết nối không có khóa — endpoint chạy trên máy người dùng. */
  id: string | null
  secret: string | null
}

export interface KeyExhausted {
  exhausted: true
  /** Mốc sớm nhất có khóa sống lại, nếu biết. */
  recoverAt: number | null
}

/** Nguồn khóa nằm ngoài provider, vì nó cần kho dữ liệu còn provider thì không. */
export interface KeySource {
  acquire(): Promise<KeyLease | KeyExhausted>
  /** Kết quả một lần dùng, để tầng trên đóng băng hoặc gỡ đóng băng khóa. */
  report(keyId: string, outcome: 'ok' | ClassifiedError): Promise<void>
}

export interface OpenAiCompatibleOptions {
  /** Địa chỉ gốc, ví dụ `http://127.0.0.1:8317/v1` hoặc endpoint tương thích của Gemini. */
  baseUrl: string
  model: string
  keys: KeySource
  /** Tiêm vào để test; mặc định là `fetch` của Node. */
  fetchImpl?: typeof fetch
  now?: () => number
}

/** Nối đường dẫn mà không phụ thuộc vào việc người dùng có gõ dấu `/` ở cuối hay không. */
export function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '')
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN))
}

/**
 * Chia segment thành lô. Cắt ở **ranh giới segment**, không bao giờ cắt giữa một segment; một
 * segment dài hơn cả lô vẫn đi riêng một lô thay vì bị chia đôi.
 */
export function splitIntoBatches(
  segments: SegmentText[],
  targetTokens = BATCH_TARGET_TOKENS
): SegmentText[][] {
  const batches: SegmentText[][] = []
  let current: SegmentText[] = []
  let tokens = 0
  for (const segment of segments) {
    const cost = estimateTokens(segment.text)
    if (current.length > 0 && tokens + cost > targetTokens) {
      batches.push(current)
      current = []
      tokens = 0
    }
    current.push(segment)
    tokens += cost
  }
  if (current.length > 0) batches.push(current)
  return batches
}

/** Tách mảng JSON ra khỏi phản hồi, chịu được rào ```json và chữ thừa quanh nó. */
export function parseItems(content: string): SegmentText[] {
  const withoutFence = content.replace(/```(?:json)?/gi, '').trim()
  const start = withoutFence.indexOf('[')
  const end = withoutFence.lastIndexOf(']')
  if (start === -1 || end <= start) {
    throw new ProviderError('invalid_response', 'Phản hồi không chứa mảng JSON nào.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(withoutFence.slice(start, end + 1))
  } catch {
    throw new ProviderError('invalid_response', 'Phản hồi không phải JSON hợp lệ.')
  }
  if (!Array.isArray(parsed)) {
    throw new ProviderError('invalid_response', 'Phản hồi không phải một mảng.')
  }
  const items: SegmentText[] = []
  for (const entry of parsed) {
    const id = (entry as { id?: unknown })?.id
    const dst = (entry as { dst?: unknown })?.dst
    if (typeof id === 'string' && typeof dst === 'string') items.push({ id, text: dst })
  }
  return items
}

/** `usage` theo quy ước OpenAI. Thiếu hay sai kiểu thì coi như không có, không đoán. */
function readUsage(usage: {
  prompt_tokens?: unknown
  completion_tokens?: unknown
} | undefined): TranslateUsage | null {
  const input = usage?.prompt_tokens
  const output = usage?.completion_tokens
  if (typeof input !== 'number' || typeof output !== 'number') return null
  return { inputTokens: input, outputTokens: output }
}

/** Một mảnh lời gọi công cụ. Tên tới một lần, tham số về dần qua nhiều khung. */
export interface ToolCallFragment {
  index: number
  id?: string
  name?: string
  arguments?: string
}

/** Một khung của lượt hội thoại, đã bóc khỏi JSON. */
export interface ChatFrame {
  /** Phần chữ mới của khung này; rỗng là bình thường (khung mở đầu chỉ có `role`). */
  text: string
  usage: TranslateUsage | null
  /** Mảnh lời gọi công cụ của khung này, nếu có. */
  toolCalls: ToolCallFragment[]
  /** Thân lỗi khi nhà cung cấp báo lỗi **giữa dòng** thay vì bằng mã HTTP. */
  error?: Record<string, unknown>
}

/** Mảnh `tool_calls` của một khung, bỏ qua mọi thứ không đọc được. */
function readToolFragments(raw: unknown): ToolCallFragment[] {
  if (!Array.isArray(raw)) return []
  const fragments: ToolCallFragment[] = []
  for (const entry of raw) {
    const item = entry as {
      index?: unknown
      id?: unknown
      function?: { name?: unknown; arguments?: unknown }
    }
    // Thiếu `index` thì coi là lời gọi đầu tiên: một số endpoint bỏ nó khi chỉ có một lời gọi.
    const index = typeof item?.index === 'number' ? item.index : 0
    const fragment: ToolCallFragment = { index }
    if (typeof item?.id === 'string') fragment.id = item.id
    if (typeof item?.function?.name === 'string') fragment.name = item.function.name
    if (typeof item?.function?.arguments === 'string') {
      fragment.arguments = item.function.arguments
    }
    fragments.push(fragment)
  }
  return fragments
}

/**
 * Đọc một khung `data:` của lượt hội thoại.
 *
 * Trả `null` cho khung không đọc được, và **không ném**: một dòng lạ của nhà cung cấp không đáng
 * giết cả lượt khi phần còn lại vẫn dùng được. Khung lỗi thì khác — nó là tin thật, nên đi ra để
 * bên gọi phân loại.
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
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }
    choices?: Array<{ delta?: { content?: unknown; tool_calls?: unknown } }>
  }

  if (payload.error !== null && typeof payload.error === 'object') {
    return { text: '', usage: null, toolCalls: [], error: payload.error as Record<string, unknown> }
  }

  const delta = payload.choices?.[0]?.delta
  const content = delta?.content
  return {
    text: typeof content === 'string' ? content : '',
    usage: readUsage(payload.usage),
    toolCalls: readToolFragments(delta?.tool_calls)
  }
}

function toProviderError(error: ClassifiedError): ProviderError {
  return new ProviderError(error.kind, error.message, { retryAfterMs: error.retryAfterMs })
}

export class OpenAiCompatibleProvider implements TranslationProvider {
  readonly id = 'openai-compatible'
  private readonly fetchImpl: typeof fetch
  private readonly now: () => number

  constructor(private readonly options: OpenAiCompatibleOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.now = options.now ?? Date.now
  }

  /**
   * Kiểm tra kết nối bằng `GET {base}/models` — rẻ, hầu hết nhà cung cấp không tính tiền, và trả
   * luôn danh sách model để người dùng chọn. Endpoint không có `/models` **không phải lỗi kết
   * nối**: báo nối được nhưng chưa liệt kê được, để người dùng khai model bằng tay.
   */
  async listModels(signal?: AbortSignal): Promise<{ models: string[]; listed: boolean }> {
    // Phải gửi khóa như mọi lời gọi khác. Thiếu nó, Gemini trả **404 "Requested entity was not
    // found."** cho `GET /v1beta/openai/models` — mà 404 không phải `auth` cũng không phải `network`,
    // nên nó rơi đúng vào nhánh "endpoint không liệt kê model" bên dưới và kết nối hiện ra là nối
    // được nhưng không có model nào. Một lỗi xác thực đội lốt một endpoint thiếu tính năng.
    const lease = await this.acquireKey()
    const response = await this.send('models', { method: 'GET', secret: lease.secret }, signal)
    if (!response.ok) {
      const error = await this.classify(response)
      // Báo như mọi lần dùng khác: `auth` đánh dấu khóa hỏng, `rate_limited` đóng băng, còn lại để
      // khóa yên (`decideFreeze`), nên một endpoint thật sự không có `/models` không phạt khóa.
      if (lease.id !== null) await this.options.keys.report(lease.id, error)
      // Khóa sai hay không nối được là lỗi kết nối thật; còn lại chỉ là endpoint không liệt kê.
      if (error.kind === 'auth' || error.kind === 'network') throw toProviderError(error)
      return { models: [], listed: false }
    }
    if (lease.id !== null) await this.options.keys.report(lease.id, 'ok')
    const body = (await response.json()) as { data?: Array<{ id?: unknown }> }
    const models = (body.data ?? [])
      .map((entry) => entry?.id)
      .filter((id): id is string => typeof id === 'string')
      .map(normalizeModelId)
    return { models, listed: true }
  }

  async translate(
    request: TranslateRequest,
    { signal }: TranslateOptions = {}
  ): Promise<TranslateResponse> {
    const matched: SegmentText[] = []
    const spent: TranslateUsage = { inputTokens: 0, outputTokens: 0 }
    let reported = false
    for (const batch of splitIntoBatches(request.segments)) {
      const result = await this.translateBatch(request, batch, signal)
      matched.push(...result.items)
      if (result.usage) {
        reported = true
        spent.inputTokens += result.usage.inputTokens
        spent.outputTokens += result.usage.outputTokens
      }
    }
    const response: TranslateResponse = {
      provider: this.id,
      model: this.options.model,
      items: matched
    }
    if (reported) response.usage = spent
    return response
  }

  /**
   * Dịch một lô, chỉ gửi lại các ID còn thiếu khi phản hồi không khớp tập ID.
   *
   * Thử lại tới trần mà vẫn thiếu vài câu thì **trả về phần đã có**, không ném: tầng trên ghi phần
   * đó vào bản dịch và liệt kê phần còn thiếu để chạy lại. Chỉ khi không có câu nào dùng được thì
   * lô mới coi là lỗi.
   */
  private async translateBatch(
    request: TranslateRequest,
    batch: SegmentText[],
    signal?: AbortSignal
  ): Promise<{ items: SegmentText[]; usage: TranslateUsage | null }> {
    const done: SegmentText[] = []
    const spent: TranslateUsage = { inputTokens: 0, outputTokens: 0 }
    let reported = false
    let pending = batch
    let lastError: ProviderError | undefined

    for (let attempt = 0; attempt < MAX_RETRIES_PER_BATCH && pending.length > 0; attempt++) {
      let items: SegmentText[]
      try {
        const call = await this.callOnce(pending, signal)
        items = call.items
        // Every attempt costs, including the ones whose answer was unusable.
        if (call.usage) {
          reported = true
          spent.inputTokens += call.usage.inputTokens
          spent.outputTokens += call.usage.outputTokens
        }
      } catch (error) {
        if (error instanceof ProviderError && error.retryable) {
          lastError = error
          continue
        }
        throw error
      }
      const result = reconcile(
        { ...request, segments: pending },
        {
          provider: this.id,
          model: this.options.model,
          items
        }
      )
      done.push(...result.matched)
      pending = pending.filter((segment) => result.missing.includes(segment.id))
      if (pending.length > 0) {
        lastError = new ProviderError(
          'invalid_response',
          'Phản hồi thiếu ' + pending.length + ' segment.'
        )
      }
    }

    if (done.length === 0) {
      throw lastError ?? new ProviderError('invalid_response', 'Lô không dịch được.')
    }
    return { items: done, usage: reported ? spent : null }
  }

  /**
   * Một lượt hội thoại, trả về theo dòng.
   *
   * Khác `translate()` ở mọi điểm đáng kể, nên nó **không** nằm trong `TranslationProvider`: không
   * chia lô, không khớp theo ID, không `reconcile`, không thử lại. Dùng chung đúng những thứ đáng
   * dùng chung — chọn khóa, gắn `Authorization`, phân loại lỗi.
   *
   * Báo cho tầng khóa **đúng một lần, ở cuối**: `ok` khi xong êm, lỗi đã phân loại khi hỏng, và
   * **không báo gì khi bị hủy** — một lần dùng chưa xong không kết luận được gì, nên nói `ok` là nói
   * dối còn nói lỗi sẽ đóng băng một khóa hoàn toàn lành (D4 của change `ai-chat`).
   */
  async *chat(
    messages: ChatMessage[],
    { signal, tools }: TranslateOptions & { tools?: readonly unknown[] } = {}
  ): AsyncGenerator<ChatStreamEvent> {
    const lease = await this.acquireKey()

    const body = {
      model: this.options.model,
      messages,
      stream: true,
      // Khai tường minh dù có nguồn nói Gemini vẫn trả `usage` khi thiếu: đó là nguồn diễn đàn, và
      // lối gọi này cũng chạy trên gateway tự dựng — khai rõ thì đúng ở cả hai.
      stream_options: { include_usage: true },
      ...(tools && tools.length > 0 ? { tools } : {})
    }

    const response = await this.send(
      'chat/completions',
      { method: 'POST', body: JSON.stringify(body), secret: lease.secret },
      signal
    )

    if (!response.ok) {
      const classified = await this.classify(response)
      if (lease.id !== null) await this.options.keys.report(lease.id, classified)
      throw toProviderError(classified)
    }
    if (response.body === null) {
      throw new ProviderError('invalid_response', 'Phản hồi không có thân để đọc.')
    }

    let usage: TranslateUsage | null = null
    // Mảnh lời gọi công cụ gom theo `index`, vì tên tới một lần còn tham số về dần qua nhiều khung.
    const pending = new Map<number, { id: string; name: string; arguments: string }>()
    try {
      for await (const event of parseSseStream(response.body)) {
        // Kiểm `aborted` ngay trong vòng lặp, không chỉ dựa vào việc thân stream tự lỗi: `fetch` thật
        // có hủy thân khi signal tắt, nhưng để việc hủy **phụ thuộc** vào điều đó nghĩa là một
        // endpoint hay một lớp trung gian cư xử khác sẽ làm nút Hủy không có tác dụng.
        if (signal?.aborted) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
        const frame = parseChatFrame(event.data)
        if (frame === null) continue
        if (frame.error !== undefined) {
          // Lỗi giữa dòng: thân không có mã HTTP riêng, nên lấy `error.code` của chính nó và hạ về
          // 500 khi thiếu — "trục trặc đường truyền, thử lại được" là mặc định an toàn hơn là
          // `refused`, thứ sẽ chặn người dùng thử lại một lỗi tạm thời.
          const classified = classifyHttpError({
            status: typeof frame.error.code === 'number' ? frame.error.code : 500,
            body: JSON.stringify({ error: frame.error }),
            now: this.now()
          })
          if (lease.id !== null) await this.options.keys.report(lease.id, classified)
          throw toProviderError(classified)
        }
        if (frame.usage !== null) usage = frame.usage
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
      if (signal?.aborted) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
      if (error instanceof ProviderError) throw error
      const message = error instanceof Error ? error.message : String(error)
      const classified: ClassifiedError = { kind: 'network', message: 'Mất kết nối: ' + message }
      if (lease.id !== null) await this.options.keys.report(lease.id, classified)
      throw toProviderError(classified)
    }

    if (lease.id !== null) await this.options.keys.report(lease.id, 'ok')

    // Lời gọi thiếu tên là mảnh hỏng, không phải một lời gọi: bỏ, đừng đẩy sang tầng thi hành.
    const calls = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, call]) => call)
      .filter((call) => call.name !== '')
    if (calls.length > 0) {
      yield { kind: 'tool-calls', calls, usage }
      return
    }
    yield { kind: 'done', usage }
  }

  /**
   * Khóa cho một lời gọi, hoặc một lỗi hết hạn mức nói rõ **mọi** khóa đang bị đóng băng. Dùng chung
   * cho cả lối dịch và lối hội thoại, nên hai lối nói cùng một câu khi cạn khóa.
   */
  private async acquireKey(): Promise<KeyLease> {
    const lease = await this.options.keys.acquire()
    if ('exhausted' in lease) {
      const wait = lease.recoverAt === null ? '' : ' Thử lại sau.'
      throw new ProviderError(
        'rate_limited',
        'Mọi khóa của kết nối này đều đang hết hạn mức.' + wait,
        lease.recoverAt === null ? {} : { retryAfterMs: Math.max(0, lease.recoverAt - this.now()) }
      )
    }
    return lease
  }

  /** Một lần gọi tới nhà cung cấp, kể cả việc chọn khóa và báo kết quả cho tầng khóa. */
  private async callOnce(
    segments: SegmentText[],
    signal?: AbortSignal
  ): Promise<{ items: SegmentText[]; usage: TranslateUsage | null }> {
    const lease = await this.acquireKey()

    const body = {
      model: this.options.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(segments.map((s) => ({ id: s.id, src: s.text })))
        }
      ]
    }

    const response = await this.send(
      'chat/completions',
      { method: 'POST', body: JSON.stringify(body), secret: lease.secret },
      signal
    )

    if (!response.ok) {
      const classified = await this.classify(response)
      if (lease.id !== null) await this.options.keys.report(lease.id, classified)
      throw toProviderError(classified)
    }
    if (lease.id !== null) await this.options.keys.report(lease.id, 'ok')

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }
    }
    const content = payload.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new ProviderError('invalid_response', 'Phản hồi không có nội dung văn bản.')
    }
    return { items: parseItems(content), usage: readUsage(payload.usage) }
  }

  private async send(
    path: string,
    init: { method: string; body?: string; secret?: string | null },
    signal?: AbortSignal
  ): Promise<Response> {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (init.body !== undefined) headers['content-type'] = 'application/json'
    if (init.secret) headers.authorization = 'Bearer ' + init.secret

    try {
      return await this.fetchImpl(joinUrl(this.options.baseUrl, path), {
        method: init.method,
        headers,
        body: init.body,
        signal
      })
    } catch (error) {
      if (signal?.aborted) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
      const message = error instanceof Error ? error.message : String(error)
      throw new ProviderError('network', 'Không nối được tới nhà cung cấp: ' + message)
    }
  }

  /** Đọc thân thô **trước** khi parse, để không mất chi tiết khi JSON hỏng (D10). */
  private async classify(response: Response): Promise<ClassifiedError> {
    let body = ''
    try {
      body = await response.text()
    } catch {
      body = ''
    }
    return classifyHttpError({
      status: response.status,
      body,
      headers: response.headers,
      now: this.now()
    })
  }
}
