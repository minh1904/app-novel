import type { QuotaScope } from '../../storage/connections'
import type { ClassifiedError } from '../classifyError'
import { decideFreeze, earliestRecovery } from '../keyPool'

/**
 * Điều phối lựa chọn khóa cho các cuộc gọi và cập nhật trạng thái khóa an toàn khi có nhiều yêu cầu chạy đồng thời.
 *
 * Sử dụng khái niệm `epoch` trong bộ nhớ cho mỗi khóa để xử lý xung đột đồng thời:
 * - Khi một khóa gặp lỗi (như 429), `epoch` tăng lên.
 * - Một yêu cầu thành công bắt đầu trước thời điểm khóa lỗi sẽ không làm mở đóng băng khóa sai lệch.
 * - Nhiều lỗi đồng thời xảy ra cùng đợt chỉ tính là một lần vi phạm (strike) duy nhất, tránh việc đóng băng bị nhân lũy tiến.
 * - Lớp này chỉ tính toán logic và trả về `KeyEffect`, không trực tiếp thao tác với cơ sở dữ liệu.
 */

/** Dữ liệu trạng thái của một khóa lưu trữ trong cơ sở dữ liệu. */
export interface KeyRecord {
  id: string
  state: 'ok' | 'invalid'
  frozenUntil: number | null
  frozenScope: QuotaScope | null
  /** Số lần bị đóng băng liên tiếp mà chưa có lần gọi thành công nào. */
  freezeStrikes: number
}

/** Lượt cấp phép sử dụng khóa (lease), ghi nhớ `epoch` lúc cấp để đánh giá kết quả sau khi hoàn thành. */
export interface Lease {
  readonly keyId: string
  readonly epoch: number
  /** Đánh dấu cuộc gọi thăm dò đơn lẻ sau khi hết hạn đóng băng để kiểm tra khóa đã phục hồi chưa. */
  readonly probe: boolean
}

export type Pick = { lease: Lease } | { exhausted: true; recoverAt: number | null }

/** Tác vụ cập nhật trạng thái khóa cần ghi vào bộ lưu trữ sau khi có kết quả gọi. */
export type KeyEffect =
  | { kind: 'none' }
  | { kind: 'clear' }
  | { kind: 'freeze'; until: number; scope: QuotaScope | null; strikes: number }
  | { kind: 'invalid' }

/** Kết quả thực thi; `neutral` là trường hợp bị hủy hoặc timeout không làm thay đổi trạng thái khóa. */
export type Outcome = 'ok' | 'neutral' | ClassifiedError

interface Runtime {
  /** Tăng lên mỗi khi khóa gặp một đợt lỗi mới. */
  epoch: number
  /** Đang có một lượt gọi thăm dò đang chạy; không cho phép lượt thăm dò thứ hai cho đến khi có kết quả. */
  probing: boolean
}

export class KeyScheduler {
  private readonly runtime = new Map<string, Runtime>()

  constructor(private readonly now: () => number) {}

  private of(keyId: string): Runtime {
    let state = this.runtime.get(keyId)
    if (state === undefined) {
      state = { epoch: 0, probing: false }
      this.runtime.set(keyId, state)
    }
    return state
  }

  /**
   * Chọn khóa đầu tiên khả dụng theo thứ tự ưu tiên (ưu tiên dùng hết khóa trước rồi mới chuyển sang khóa sau).
   * Khóa vừa hết hạn đóng băng nhưng còn vi phạm sẽ được thử nghiệm bằng một lượt gọi thăm dò duy nhất.
   */
  pick(keys: readonly KeyRecord[]): Pick {
    const at = this.now()
    for (const key of keys) {
      if (key.state === 'invalid') continue
      if (key.frozenUntil !== null && key.frozenUntil > at) continue
      const state = this.of(key.id)
      if (key.freezeStrikes > 0) {
        if (state.probing) continue
        state.probing = true
        return { lease: { keyId: key.id, epoch: state.epoch, probe: true } }
      }
      return { lease: { keyId: key.id, epoch: state.epoch, probe: false } }
    }
    return { exhausted: true, recoverAt: earliestRecovery(keys, at) }
  }

  /** Đánh giá kết quả cuộc gọi để quyết định tác động lên trạng thái khóa (`KeyEffect`). */
  settle(lease: Lease, outcome: Outcome, record: KeyRecord | undefined): KeyEffect {
    const state = this.of(lease.keyId)
    if (lease.probe) state.probing = false
    if (outcome === 'neutral') return { kind: 'none' }

    // Khóa đã gặp lỗi sau khi cuộc gọi này bắt đầu: kết quả của cuộc gọi này đã lỗi thời.
    const stale = lease.epoch < state.epoch

    if (outcome === 'ok') return stale ? { kind: 'none' } : { kind: 'clear' }

    // Yêu cầu muộn cùng đợt lỗi được tính ở mức vi phạm ban đầu, tránh cộng dồn thêm số lần vi phạm.
    const strikes = record?.freezeStrikes ?? 0
    const decision = decideFreeze({
      error: outcome,
      strikes: stale ? Math.max(0, strikes - 1) : strikes,
      now: this.now()
    })
    if (decision.invalid) {
      state.epoch++
      return { kind: 'invalid' }
    }
    // Lỗi không do khóa gây ra (mạng, timeout): giữ nguyên trạng thái khóa.
    if (decision.until === null) return { kind: 'none' }

    if (stale) {
      // Cùng đợt lỗi đã ghi nhận: có thể kéo dài mốc đóng băng nếu cần nhưng không tăng thêm số lần vi phạm.
      const current = record?.frozenUntil ?? 0
      if (decision.until <= current) return { kind: 'none' }
      return {
        kind: 'freeze',
        until: decision.until,
        scope: decision.scope,
        strikes: record?.freezeStrikes ?? decision.strikes
      }
    }

    state.epoch++
    return {
      kind: 'freeze',
      until: decision.until,
      scope: decision.scope,
      strikes: decision.strikes
    }
  }
}
