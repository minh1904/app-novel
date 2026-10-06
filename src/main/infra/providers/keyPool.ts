import type { KeyCipher, QuotaScope } from '../storage/connections'
import type { ClassifiedError } from './classifyError'

/**
 * Chọn khóa và quyết định đóng băng bao lâu.
 *
 * Chiến lược **`fill-first` cố định** (D4): dùng cạn khóa đầu rồi mới sang khóa sau — đúng ca hạn
 * mức miễn phí, trong khi round-robin trải mỏng và làm cả bộ khóa cạn cùng lúc. Không cho người
 * dùng chọn chiến lược khác.
 *
 * **Hai mức đóng băng** (D11): chạm giới hạn theo phút thì chờ đúng thời gian nhà cung cấp báo;
 * cạn hạn mức theo ngày thì chờ tới mốc được cấp lại. Không biết là loại nào thì mức ngắn mặc
 * định, **nhân đôi** sau mỗi lần cùng khóa đó lặp lại — để không đóng băng oan một khóa còn tốt,
 * mà cũng không đâm vào tường mãi.
 */

/** Mức đóng băng khi không đọc được gì từ lỗi. */
export const SHORT_FREEZE_MS = 60_000
/** Trần của mức ngắn sau khi nhân đôi nhiều lần. */
export const MAX_SHORT_FREEZE_MS = 30 * 60_000
/** Đệm thêm vào thời gian nhà cung cấp báo, vì đồng hồ hai bên không khớp tuyệt đối. */
const RETRY_PADDING_MS = 1_000

/**
 * Múi giờ mốc hạn mức theo ngày được cấp lại. **Chưa xác minh** — bước kiểm chứng 5.2a phải đọc
 * một lỗi thật rồi chốt; sai thì sửa đúng một hằng số ở đây.
 */
const DAILY_RESET_TIME_ZONE = 'America/Los_Angeles'

export function isUsable(key: Pick<KeyCipher, 'state' | 'frozenUntil'>, now: number): boolean {
  if (key.state === 'invalid') return false
  return key.frozenUntil === null || key.frozenUntil <= now
}

/** Mốc sớm nhất có khóa sống lại, để báo cho người dùng biết chờ tới bao giờ. */
export function earliestRecovery(
  keys: ReadonlyArray<Pick<KeyCipher, 'state' | 'frozenUntil'>>,
  now: number
): number | null {
  const times = keys
    .filter((key) => key.state !== 'invalid' && key.frozenUntil !== null && key.frozenUntil > now)
    .map((key) => key.frozenUntil as number)
  return times.length === 0 ? null : Math.min(...times)
}

/** Nửa đêm kế tiếp ở múi giờ cấp lại hạn mức, tính từ `now`. */
export function nextDailyReset(now: number, timeZone = DAILY_RESET_TIME_ZONE): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(new Date(now))
    const field = (type: string): number => Number(parts.find((p) => p.type === type)?.value)
    // Giờ tường ở múi đó, đọc như thể là UTC; chênh lệch với `now` chính là offset.
    const wall = Date.UTC(
      field('year'),
      field('month') - 1,
      field('day'),
      field('hour') % 24,
      field('minute'),
      field('second')
    )
    const offset = wall - now
    const nextMidnightWall = Date.UTC(field('year'), field('month') - 1, field('day') + 1)
    return nextMidnightWall - offset
  } catch {
    // Múi giờ không đọc được: thà chờ một khoảng dài có hạn còn hơn thử lại liên tục.
    return now + 6 * 60 * 60 * 1000
  }
}

export interface FreezeDecision {
  /** Mốc hết đóng băng. `null` kèm `invalid: false` nghĩa là **không làm gì với khóa này**. */
  until: number | null
  scope: QuotaScope | null
  strikes: number
  invalid: boolean
}

export function decideFreeze(input: {
  error: ClassifiedError
  /** Số lần khóa này đã bị đóng băng liên tiếp mà không có lần dùng thành công nào. */
  strikes: number
  now: number
}): FreezeDecision {
  const { error, strikes, now } = input

  if (error.kind === 'auth') {
    return { until: null, scope: null, strikes, invalid: true }
  }

  // Hết tín dụng: khóa không dùng được cho tới khi người dùng nạp thêm, nhưng không phải khóa sai.
  // Đóng băng tới mốc cấp lại hạn mức theo ngày rồi thăm dò một lượt, thay vì đánh dấu `invalid`
  // (người dùng nạp tiền xong thì khóa tự dùng lại được, không phải dán lại).
  if (error.kind === 'quota') {
    return { until: nextDailyReset(now), scope: 'day', strikes: strikes + 1, invalid: false }
  }

  // Mạng hỏng, hết thời hạn, nội dung bị từ chối, phản hồi hỏng: lỗi không nằm ở khóa, nên đừng
  // phạt khóa.
  if (error.kind !== 'rate_limited') {
    return { until: null, scope: null, strikes, invalid: false }
  }

  if (error.quotaScope === 'day') {
    return { until: nextDailyReset(now), scope: 'day', strikes: strikes + 1, invalid: false }
  }

  if (error.quotaScope === 'minute' && error.retryAfterMs !== undefined) {
    return {
      until: now + error.retryAfterMs + RETRY_PADDING_MS,
      scope: 'minute',
      strikes: strikes + 1,
      invalid: false
    }
  }

  // Không xác định được loại: mức ngắn, nhân đôi theo số lần đã vấp, có trần.
  const backoff = Math.min(SHORT_FREEZE_MS * 2 ** strikes, MAX_SHORT_FREEZE_MS)
  return { until: now + backoff, scope: null, strikes: strikes + 1, invalid: false }
}
