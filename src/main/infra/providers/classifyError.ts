import type { QuotaScope } from '../storage/connections'
import { findBlockEvidence, type FilterReason } from './filterReason'
import { bodyExcerpt, redactSecrets } from './redact'
import type { ProviderErrorKind, RequestProblem } from './types'

/**
 * Đọc một phản hồi lỗi của nhà cung cấp thành thứ Mira hành động được.
 *
 * Bốn lớp, suy giảm êm (D10 của change `ai-connection`) — vì hai đường của lát cắt đầu trả lỗi
 * khác hình dạng, và **Gemini không gửi header `Retry-After`**: thời gian chờ nằm trong thân JSON.
 * Một gateway ở giữa có thể đổi dạng lỗi và làm mất phần đó, nên không lớp nào được coi là chắc có.
 *
 *   1. Thân kiểu Google: `error.details[]` → `RetryInfo.retryDelay`, `QuotaFailure…quotaId`
 *   2. Thân kiểu OpenAI: `error.message` / `error.code`
 *   3. Quét chuỗi thô: `retryDelay`, `PerDay`
 *   4. Chỉ còn mã HTTP
 *
 * `quotaScope` **không được đoán**: thiếu bằng chứng thì để trống, và bên gọi dùng mức đóng băng
 * ngắn mặc định (D11).
 */

export interface ClassifiedError {
  kind: ProviderErrorKind
  message: string
  /** HTTP status of the response this was read from. */
  status?: number
  /** When the response arrived (ms epoch), the moment a cooldown is counted from. */
  receivedAt?: number
  /** A bounded, scrubbed piece of the response body. */
  bodySnippet?: string
  /** Chỉ có khi nhà cung cấp nói; không tự bịa. */
  retryAfterMs?: number
  /** Chỉ có khi đọc được bằng chứng rõ ràng. */
  quotaScope?: QuotaScope
  /** Với `invalid_request`: điều gì sai ở request, khi nhận ra được. */
  requestProblem?: RequestProblem
  /** Với `refused`: lý do chặn đọc từ thân lỗi. */
  filter?: FilterReason
}

interface GoogleDetail {
  '@type'?: string
  retryDelay?: string
  /** `ErrorInfo.reason`, e.g. `API_KEY_INVALID`. */
  reason?: string
  violations?: Array<{ quotaId?: string; quotaMetric?: string }>
}

/**
 * Gemini answers a wrong or expired key with **HTTP 400** (`INVALID_ARGUMENT`), not 401 or 403 — seen in a
 * real call on 2026-10-03 (`__fixtures__/live/bad-key.json`: "Please pass a valid API key"). By status alone
 * that is `invalid_request`, a request nothing can fix, so the key would never be marked wrong and every call
 * would keep trying it. The message and the `reason` are what say it is the key.
 */
const BAD_KEY_MESSAGE = /api key (not valid|expired)|valid api key/i

/**
 * A request over the model's input limit. Gemini answers it with 400 "The input token count (…) exceeds the
 * maximum number of tokens allowed"; others say "too long" or "context length". 413 needs no message.
 */
const TOO_LARGE_MESSAGE =
  /exceeds the maximum number of tokens|input token count|context[_ ]length|too (large|long)|maximum context/i

/** `"34.4s"` → 34400. Trả `undefined` cho mọi thứ không đọc được. */
export function parseDuration(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const match = /^([\d.]+)s$/.exec(value.trim())
  if (!match) return undefined
  const seconds = Number(match[1])
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : undefined
}

/** `Retry-After` theo RFC: số giây, hoặc một mốc thời gian HTTP. */
function parseRetryAfterHeader(value: string | null, now: number): number | undefined {
  if (!value) return undefined
  const seconds = Number(value.trim())
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000)
  const at = Date.parse(value)
  return Number.isNaN(at) ? undefined : Math.max(0, at - now)
}

/** Dấu hiệu hạn mức tính theo ngày, ví dụ `GenerateRequestsPerDayPerProjectPerModel-FreeTier`. */
function looksDaily(text: string): boolean {
  return /per\s*-?\s*day/i.test(text) || /requestsperday/i.test(text)
}

function kindForStatus(status: number): ProviderErrorKind {
  if (status === 401 || status === 403) return 'auth'
  // 402 Payment Required: OpenRouter's answer to an account without credit.
  if (status === 402) return 'quota'
  if (status === 429) return 'rate_limited'
  if (status === 408 || status >= 500) return 'network'
  // Một 4xx còn lại là request sai: tham số không nhận, request quá lớn, thân hỏng. Không thử lại, không
  // phải lỗi của khóa. Chỉ thành `refused` khi thân lỗi có bằng chứng bộ lọc chặn (`findBlockEvidence`):
  // gọi nhầm một tác phẩm là "nội dung bị chặn" là lỗi nặng hơn.
  return 'invalid_request'
}

export interface ClassifyInput {
  status: number
  /** Thân phản hồi dạng thô; phải đọc trước khi parse để không mất gì khi JSON hỏng. */
  body: string
  headers?: { get(name: string): string | null }
  now: number
  /** The keys this call sent. They are scrubbed out of the message and the body excerpt. */
  secrets?: readonly (string | null | undefined)[]
}

export function classifyHttpError(input: ClassifyInput): ClassifiedError {
  const { status, body, headers, now, secrets = [] } = input
  let kind = kindForStatus(status)

  let message = ''
  let retryAfterMs = parseRetryAfterHeader(headers?.get('retry-after') ?? null, now)
  let quotaScope: QuotaScope | undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    parsed = undefined
  }
  // Google wraps some error bodies in an array: `[{ "error": { … } }]` (the bad-key answer above is one).
  // Reading only an object would miss the message, the delay and the quota markers in all of them.
  if (Array.isArray(parsed)) parsed = parsed[0]

  const error = (parsed as { error?: Record<string, unknown> } | undefined)?.error
  if (error && typeof error === 'object') {
    // Lớp 1 — thân kiểu Google.
    const details = error.details
    if (Array.isArray(details)) {
      for (const detail of details as GoogleDetail[]) {
        const delay = parseDuration(detail?.retryDelay)
        if (delay !== undefined && retryAfterMs === undefined) retryAfterMs = delay
        for (const violation of detail?.violations ?? []) {
          const marker = (violation?.quotaId ?? '') + ' ' + (violation?.quotaMetric ?? '')
          if (looksDaily(marker)) quotaScope = 'day'
        }
      }
    }
    // Lớp 2 — thân kiểu OpenAI (và phần message dùng chung với lớp 1).
    if (typeof error.message === 'string') message = error.message

    if (kind === 'invalid_request' && status === 400) {
      const reasons = Array.isArray(details)
        ? (details as GoogleDetail[]).map((d) => d?.reason)
        : []
      if (reasons.includes('API_KEY_INVALID') || BAD_KEY_MESSAGE.test(message)) kind = 'auth'
    }
  }

  // Lớp 3 — quét chuỗi thô: dùng cho cả hai hình dạng khi một lớp trung gian đã làm méo chúng.
  if (retryAfterMs === undefined) {
    const match = /"?retryDelay"?\s*:\s*"?([\d.]+)s/i.exec(body)
    const delay = parseDuration(match ? match[1] + 's' : undefined)
    if (delay !== undefined) retryAfterMs = delay
  }
  if (quotaScope === undefined && kind === 'rate_limited' && looksDaily(body)) quotaScope = 'day'

  // Hết tín dụng không phải giới hạn theo thời gian: chờ không giúp gì. Chỉ nhận khi **không có**
  // bằng chứng phạm vi phút/ngày, vì Gemini hết hạn mức ngày cũng viết "exceeded your current quota…
  // billing" mà vẫn là giới hạn theo ngày, nơi đổi sang khóa khác là đúng (D8 của change `ai-gateway`).
  if (
    kind === 'rate_limited' &&
    quotaScope === undefined &&
    error &&
    typeof error === 'object' &&
    (error.code === 'insufficient_quota' || error.type === 'insufficient_quota')
  ) {
    kind = 'quota'
  }

  // Lỗi riêng của nhà cung cấp tài khoản và Anthropic (change `subscription-providers`, design D9).
  const errorType = error && typeof error === 'object' ? error.type : undefined
  const errorCode = error && typeof error === 'object' ? error.code : undefined
  // Codex: gói ChatGPT đã dùng hết hạn mức của cửa sổ. Chờ tới mốc đặt lại mới gọi được, đổi khóa không giúp.
  if (
    status === 429 &&
    (errorCode === 'usage_limit_reached' ||
      errorType === 'usage_limit_reached' ||
      /usage_limit_reached/.test(body))
  ) {
    kind = 'quota'
    const resetsIn = error && typeof error === 'object' ? Number(error.resets_in_seconds) : NaN
    const resetsAt = error && typeof error === 'object' ? Number(error.resets_at) : NaN
    if (Number.isFinite(resetsIn) && resetsIn > 0) retryAfterMs = resetsIn * 1000
    else if (Number.isFinite(resetsAt) && resetsAt * 1000 > now)
      retryAfterMs = resetsAt * 1000 - now
  }
  // Copilot: hết lượt premium request của gói cũng là hết hạn mức, dù trạng thái có thể là 403 hay 429.
  if (
    /premium request|premium_request|quota_exceeded/i.test(message) &&
    (status === 403 || status === 429)
  ) {
    kind = 'quota'
  }
  // Anthropic: máy chủ quá tải (529) là chuyện tạm thời của nhà cung cấp, đáng thử lại sau một lúc.
  if (status === 529 || errorType === 'overloaded_error') kind = 'rate_limited'

  // Có thời gian chờ ngắn mà không có dấu hiệu theo ngày: đủ để gọi là theo phút.
  if (quotaScope === undefined && kind === 'rate_limited' && retryAfterMs !== undefined) {
    quotaScope = 'minute'
  }

  let requestProblem: RequestProblem | undefined
  let filter: FilterReason | undefined
  if (kind === 'invalid_request') {
    filter = findBlockEvidence(body)
    if (filter !== undefined) kind = 'refused'
    else if (status === 413 || TOO_LARGE_MESSAGE.test(message) || TOO_LARGE_MESSAGE.test(body)) {
      requestProblem = 'too_large'
    }
  }

  // Lớp 4 — không đọc được gì thì vẫn phải có một câu cho người dùng.
  if (message === '') message = body.trim().slice(0, 300) || 'Nhà cung cấp trả lỗi ' + status + '.'

  // Thông điệp đi qua IPC và vào log: một endpoint lặp lại khóa trong lỗi không được mang nó theo.
  const result: ClassifiedError = {
    kind,
    message: redactSecrets(message, secrets),
    status,
    receivedAt: now
  }
  const snippet = bodyExcerpt(body, secrets)
  if (snippet !== '') result.bodySnippet = snippet
  if (retryAfterMs !== undefined) result.retryAfterMs = retryAfterMs
  if (quotaScope !== undefined) result.quotaScope = quotaScope
  if (requestProblem !== undefined) result.requestProblem = requestProblem
  if (filter !== undefined) result.filter = filter
  return result
}
