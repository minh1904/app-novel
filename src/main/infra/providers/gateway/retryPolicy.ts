import { ProviderError } from '../types'

/**
 * Chính sách quyết định khi nào cần thử lại và khoảng thời gian chờ (delay) trước khi thử lại.
 *
 * Chỉ thử lại đối với các sự cố tạm thời trên đường truyền: `network` (gồm HTTP 408, 5xx) và `timeout`.
 * Lỗi liên quan đến khóa (hết hạn mức, sai khóa) sẽ chuyển khóa ngay lập tức thay vì chờ thử lại.
 * Hỗ trợ `AbortSignal` để có thể hủy bỏ thời gian chờ bất cứ lúc nào.
 */

export interface RetryOptions {
  /** Số lần thử lại tối đa sau lần gọi đầu tiên thất bại. */
  maxRetries: number
  baseDelayMs: number
  /** Thời gian chờ tối đa cho mỗi lần thử lại (ms). */
  maxDelayMs: number
  /** Tỷ lệ dao động ngẫu nhiên (jitter) áp dụng vào thời gian chờ (ví dụ: 0.2 là ±20%). */
  jitter: number
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  jitter: 0.2
}

export type RetryDecision = { retry: true; delayMs: number } | { retry: false }

/**
 * Quyết định xem có nên thử lại yêu cầu hay không và tính toán thời gian chờ.
 *
 * `retriesDone` là số lần thử lại đã thực hiện trước đó.
 * Nếu nhà cung cấp yêu cầu thời gian chờ (`Retry-After`) vượt quá mức trần `maxDelayMs`, hệ thống sẽ từ chối thử lại.
 */
export function decideRetry(
  error: unknown,
  retriesDone: number,
  options: RetryOptions,
  random: () => number,
  { keyless = false }: { keyless?: boolean } = {}
): RetryDecision {
  if (!(error instanceof ProviderError)) return { retry: false }
  // Kết nối không dùng khóa (máy chủ cục bộ hoặc gateway riêng) không thể đổi khóa nên rate limit được xử lý như lỗi tạm thời.
  const transient =
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (keyless && error.kind === 'rate_limited')
  if (!transient) return { retry: false }
  if (retriesDone >= options.maxRetries) return { retry: false }

  const asked = error.retryAfterMs
  if (asked !== undefined && asked > options.maxDelayMs) return { retry: false }

  const backoff = Math.min(options.baseDelayMs * 2 ** retriesDone, options.maxDelayMs)
  const spread = 1 + options.jitter * (2 * random() - 1)
  const delayMs = Math.min(options.maxDelayMs, Math.max(Math.round(backoff * spread), asked ?? 0))
  return { retry: true, delayMs }
}

/** Chờ `ms` mili-giây, hoặc dừng ngay lập tức với lỗi `cancelled` nếu signal bị hủy trước. */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancelled = (): ProviderError => new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
    if (signal?.aborted) {
      reject(cancelled())
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(cancelled())
    }
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      },
      Math.max(0, ms)
    )
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
