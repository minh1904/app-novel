import * as v from 'valibot'
import { idSchema } from './library'

/**
 * Account logins over IPC (change `subscription-providers`, design D8). Tokens never cross: the renderer
 * gets the code to show, the state of the login, and the account's limits.
 */

export const ACCOUNT_PROVIDERS = ['codex', 'copilot'] as const
export type AccountProvider = (typeof ACCOUNT_PROVIDERS)[number]

/** What the login screen shows once a code was issued. */
export interface LoginStart {
  sessionId: string
  userCode: string
  verificationUrl: string
  /** When the code is given up (ms epoch). */
  expiresAt: number
}

/** Where a login stands. `detail` is the original message with any token taken out. */
export type LoginStatus =
  | { state: 'pending' }
  | { state: 'approved'; connectionId: string }
  | { state: 'denied' | 'expired' | 'cancelled'; message?: string }
  | { state: 'error'; message: string; detail?: string }

/** One window of a Codex account's limits. */
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

/** The chip shows only below this many percent left, and warns below the second. */
export const USAGE_CHIP_BELOW = 20
export const USAGE_WARN_BELOW = 10

/** The window to show on a chip: the one with the least left, if it is under the threshold. */
export function usageChip(windows: UsageWindowView[]): UsageWindowView | null {
  const lowest = [...windows].sort((a, b) => a.remainingPercent - b.remainingPercent)[0]
  return lowest && lowest.remainingPercent < USAGE_CHIP_BELOW ? lowest : null
}
