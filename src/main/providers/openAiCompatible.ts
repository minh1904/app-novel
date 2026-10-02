import { classifyHttpError, type ClassifiedError } from './classifyError'
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
    const response = await this.send('models', { method: 'GET' }, signal)
    if (!response.ok) {
      const error = await this.classify(response)
      // Khóa sai hay không nối được là lỗi kết nối thật; còn lại chỉ là endpoint không liệt kê.
      if (error.kind === 'auth' || error.kind === 'network') throw toProviderError(error)
      return { models: [], listed: false }
    }
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

  /** Một lần gọi tới nhà cung cấp, kể cả việc chọn khóa và báo kết quả cho tầng khóa. */
  private async callOnce(
    segments: SegmentText[],
    signal?: AbortSignal
  ): Promise<{ items: SegmentText[]; usage: TranslateUsage | null }> {
    const lease = await this.options.keys.acquire()
    if ('exhausted' in lease) {
      const wait = lease.recoverAt === null ? '' : ' Thử lại sau.'
      throw new ProviderError(
        'rate_limited',
        'Mọi khóa của kết nối này đều đang hết hạn mức.' + wait,
        lease.recoverAt === null ? {} : { retryAfterMs: Math.max(0, lease.recoverAt - this.now()) }
      )
    }

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
