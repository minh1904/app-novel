import type { QuotaScope } from '../storage/connections'
import type { ProviderErrorKind } from './types'

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
  /** Chỉ có khi nhà cung cấp nói; không tự bịa. */
  retryAfterMs?: number
  /** Chỉ có khi đọc được bằng chứng rõ ràng. */
  quotaScope?: QuotaScope
}

interface GoogleDetail {
  '@type'?: string
  retryDelay?: string
  violations?: Array<{ quotaId?: string; quotaMetric?: string }>
}

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
  if (status === 429) return 'rate_limited'
  if (status === 408 || status >= 500) return 'network'
  // Hợp đồng chỉ có sáu loại; một 4xx còn lại là "nhà cung cấp từ chối yêu cầu này" và **không**
  // nên thử lại — đúng ngữ nghĩa của `refused`, và quan trọng hơn là đúng hành vi thử lại.
  return 'refused'
}

export interface ClassifyInput {
  status: number
  /** Thân phản hồi dạng thô; phải đọc trước khi parse để không mất gì khi JSON hỏng. */
  body: string
  headers?: { get(name: string): string | null }
  now: number
}

export function classifyHttpError(input: ClassifyInput): ClassifiedError {
  const { status, body, headers, now } = input
  const kind = kindForStatus(status)

  let message = ''
  let retryAfterMs = parseRetryAfterHeader(headers?.get('retry-after') ?? null, now)
  let quotaScope: QuotaScope | undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    parsed = undefined
  }

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
  }

  // Lớp 3 — quét chuỗi thô: dùng cho cả hai hình dạng khi một lớp trung gian đã làm méo chúng.
  if (retryAfterMs === undefined) {
    const match = /"?retryDelay"?\s*:\s*"?([\d.]+)s/i.exec(body)
    const delay = parseDuration(match ? match[1] + 's' : undefined)
    if (delay !== undefined) retryAfterMs = delay
  }
  if (quotaScope === undefined && kind === 'rate_limited' && looksDaily(body)) quotaScope = 'day'

  // Có thời gian chờ ngắn mà không có dấu hiệu theo ngày: đủ để gọi là theo phút.
  if (quotaScope === undefined && kind === 'rate_limited' && retryAfterMs !== undefined) {
    quotaScope = 'minute'
  }

  // Lớp 4 — không đọc được gì thì vẫn phải có một câu cho người dùng.
  if (message === '') message = body.trim().slice(0, 300) || 'Nhà cung cấp trả lỗi ' + status + '.'

  const result: ClassifiedError = { kind, message }
  if (retryAfterMs !== undefined) result.retryAfterMs = retryAfterMs
  if (quotaScope !== undefined) result.quotaScope = quotaScope
  return result
}
