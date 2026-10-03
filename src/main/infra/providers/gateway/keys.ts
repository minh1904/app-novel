import type { ClassifiedError } from '../classifyError'

/**
 * What the gateway needs from wherever keys live. The provider knows nothing about a database; the
 * source is built over one (`connectionKeySource.ts`) and handed in.
 */

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

/**
 * Một lần dùng khóa đã kết thúc ra sao. `neutral` là lần dùng chưa chứng minh được gì về khóa — bị
 * hủy, hết thời hạn — nên không phạt khóa và cũng không khôi phục nó.
 */
export type KeyOutcome = 'ok' | 'neutral' | ClassifiedError

/** Nguồn khóa nằm ngoài provider, vì nó cần kho dữ liệu còn provider thì không. */
export interface KeySource {
  acquire(): Promise<KeyLease | KeyExhausted>
  /**
   * Kết quả một lần dùng, để tầng trên đóng băng hoặc gỡ đóng băng khóa. Mỗi lease phải được báo
   * **đúng một lần** (kể cả `neutral`): nguồn khóa dựa vào đó để biết lượt nào còn đang chạy.
   */
  report(lease: KeyLease, outcome: KeyOutcome): Promise<void>
}
