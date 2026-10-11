import * as v from 'valibot'
import { idSchema } from './library'

/**
 * Đăng nhập tài khoản qua IPC. Token không bao giờ gửi qua IPC: renderer
 * chỉ nhận mã hiển thị, trạng thái đăng nhập và hạn mức tài khoản.
 */

export const ACCOUNT_PROVIDERS = ['codex', 'copilot'] as const
export type AccountProvider = (typeof ACCOUNT_PROVIDERS)[number]

/** Thông tin màn hình đăng nhập hiển thị khi mã xác thực được cấp. */
export interface LoginStart {
  sessionId: string
  userCode: string
  verificationUrl: string
  /** Thời điểm mã hết hạn (tính bằng mili-giây epoch). */
  expiresAt: number
}

/** Trạng thái tiến trình đăng nhập. `detail` là thông điệp gốc sau khi đã loại bỏ token. */
export type LoginStatus =
  | { state: 'pending' }
  | { state: 'approved'; connectionId: string }
  | { state: 'denied' | 'expired' | 'cancelled'; message?: string }
  | { state: 'error'; message: string; detail?: string }

/** Một khung thời gian giới hạn mức sử dụng của tài khoản. */
export interface UsageWindowView {
  kind: 'session' | 'week' | 'other'
  remainingPercent: number
  resetsAt: number | null
}

export const startLoginSchema = v.strictObject({
  provider: v.picklist(ACCOUNT_PROVIDERS, 'Nhà cung cấp tài khoản không hợp lệ.')
})
export const loginRefSchema = v.strictObject({ sessionId: idSchema })
export const accountRefSchema = v.strictObject({ connectionId: idSchema })

/** Huy hiệu chỉ hiển thị khi dung lượng còn lại dưới mức phần trăm này, và cảnh báo dưới mức thứ hai. */
export const USAGE_CHIP_BELOW = 20
export const USAGE_WARN_BELOW = 10

/** Khung thời gian hiển thị trên huy hiệu: khung có mức còn lại thấp nhất nếu dưới ngưỡng quy định. */
export function usageChip(windows: UsageWindowView[]): UsageWindowView | null {
  const lowest = [...windows].sort((a, b) => a.remainingPercent - b.remainingPercent)[0]
  return lowest && lowest.remainingPercent < USAGE_CHIP_BELOW ? lowest : null
}
