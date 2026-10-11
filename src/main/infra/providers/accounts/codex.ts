import type { CallOptions } from '../transports/transportShared'
import { ProviderError } from '../types'
import { jwtClaims, jwtExpiry } from './jwt'

/**
 * Đăng nhập ChatGPT / Codex và các cấu hình cần thiết cho phiên gọi.
 * Các hằng số endpoint nội bộ phục vụ xác thực và kiểm tra mức sử dụng.
 */

export const CODEX = {
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
  issuer: 'https://auth.openai.com',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  userCodeUrl: 'https://auth.openai.com/api/accounts/deviceauth/usercode',
  deviceTokenUrl: 'https://auth.openai.com/api/accounts/deviceauth/token',
  verificationUrl: 'https://auth.openai.com/codex/device',
  redirectUri: 'https://auth.openai.com/deviceauth/callback',
  base: 'https://chatgpt.com/backend-api/codex',
  usageUrl: 'https://chatgpt.com/backend-api/wham/usage',
  /** Thời gian làm mới trước khi `exp` hết hạn (ms). */
  refreshSkewMs: 120_000,
  /** Thời hạn tối đa của mã thiết bị tính từ phía ứng dụng (ms). */
  codeLifetimeMs: 15 * 60_000
} as const

/** Danh sách mô hình dự phòng khi không thể lấy danh sách mô hình từ tài khoản. */
export const CODEX_FALLBACK_MODELS = [
  'gpt-6-sol',
  'gpt-6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-5.4-mini',
  'gpt-5.4',
  'gpt-5.3-codex-spark'
]

/** Thông tin mã thiết bị hiển thị cho màn hình đăng nhập. */
export interface DeviceCode {
  userCode: string
  verificationUrl: string
  /** Khoảng thời gian chờ giữa hai lần thăm dò (ms). */
  intervalMs: number
  /** Thời điểm mã hết hạn (epoch ms). */
  expiresAt: number
  /** Dữ liệu nội bộ gửi kèm trong các lần thăm dò tiếp theo. */
  handle: Record<string, string>
}

export interface CodexTokens {
  access: string
  refresh: string
}

export type PollOutcome<T> =
  | { status: 'pending'; slowDown?: boolean }
  | { status: 'approved'; result: T }
  | { status: 'denied' | 'expired'; message: string }

/** Lỗi khi phiên đăng nhập bị từ chối vĩnh viễn (token làm mới đã hết hạn hoặc bị thu hồi). */
export class ReloginError extends Error {
  constructor(message = 'Cần đăng nhập lại.') {
    super(message)
    this.name = 'ReloginError'
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json()
    return body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function networkError(error: unknown): ProviderError {
  return new ProviderError(
    'network',
    'Không nối được tới máy chủ đăng nhập: ' +
      (error instanceof Error ? error.message : String(error))
  )
}

/** Bước 1: Yêu cầu cấp mã thiết bị. */
export async function requestCodexCode(fetchImpl: typeof fetch, now: number): Promise<DeviceCode> {
  let response: Response
  try {
    response = await fetchImpl(CODEX.userCodeUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ client_id: CODEX.clientId })
    })
  } catch (error) {
    throw networkError(error)
  }
  const body = await readJson(response)
  const userCode = body.user_code ?? body.usercode
  const deviceAuthId = body.device_auth_id
  if (!response.ok || typeof userCode !== 'string' || typeof deviceAuthId !== 'string') {
    throw new ProviderError(
      'invalid_response',
      'Máy chủ OpenAI không cấp mã thiết bị (HTTP ' + response.status + ').',
      { status: response.status }
    )
  }
  const interval = Math.max(3, Math.floor(Number(body.interval ?? 5)) || 5)
  return {
    userCode,
    verificationUrl: CODEX.verificationUrl,
    intervalMs: interval * 1000,
    expiresAt: now + CODEX.codeLifetimeMs,
    handle: { deviceAuthId, userCode }
  }
}

/**
 * Bước 2: Thăm dò xem người dùng đã xác nhận đăng nhập chưa.
 * Trả về `pending` nếu chưa xác nhận, hoặc trả về mã xác thực để đổi lấy token.
 */
export async function pollCodex(
  fetchImpl: typeof fetch,
  code: DeviceCode,
  now: number
): Promise<PollOutcome<CodexTokens>> {
  if (now >= code.expiresAt) return { status: 'expired', message: 'Mã đã hết hạn.' }
  let response: Response
  try {
    response = await fetchImpl(CODEX.deviceTokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        device_auth_id: code.handle.deviceAuthId,
        user_code: code.handle.userCode
      })
    })
  } catch (error) {
    throw networkError(error)
  }
  if (response.status === 403 || response.status === 404) return { status: 'pending' }
  const body = await readJson(response)
  if (!response.ok) {
    return {
      status: 'denied',
      message: 'OpenAI từ chối đăng nhập (HTTP ' + response.status + ').'
    }
  }
  const authorizationCode = body.authorization_code
  const verifier = body.code_verifier
  if (typeof authorizationCode !== 'string' || typeof verifier !== 'string') {
    throw new ProviderError('invalid_response', 'OpenAI trả xác nhận thiếu mã đăng nhập.')
  }
  return {
    status: 'approved',
    result: await exchangeCodexCode(fetchImpl, authorizationCode, verifier)
  }
}

async function tokenRequest(
  fetchImpl: typeof fetch,
  form: Record<string, string>
): Promise<{ response: Response; body: Record<string, unknown> }> {
  let response: Response
  try {
    response = await fetchImpl(CODEX.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams(form).toString()
    })
  } catch (error) {
    throw networkError(error)
  }
  return { response, body: await readJson(response) }
}

function tokensOf(body: Record<string, unknown>, previousRefresh?: string): CodexTokens {
  const access = body.access_token
  const refresh = typeof body.refresh_token === 'string' ? body.refresh_token : previousRefresh
  if (typeof access !== 'string' || typeof refresh !== 'string') {
    throw new ProviderError('invalid_response', 'OpenAI trả token thiếu trường cần thiết.')
  }
  return { access, refresh }
}

/** Bước 3: Đổi mã xác thực lấy access token và refresh token. */
export async function exchangeCodexCode(
  fetchImpl: typeof fetch,
  authorizationCode: string,
  codeVerifier: string
): Promise<CodexTokens> {
  const { response, body } = await tokenRequest(fetchImpl, {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: CODEX.redirectUri,
    client_id: CODEX.clientId,
    code_verifier: codeVerifier
  })
  if (!response.ok) {
    throw new ProviderError(
      'auth',
      'OpenAI không đổi được mã lấy token (HTTP ' + response.status + ').',
      {
        status: response.status
      }
    )
  }
  return tokensOf(body)
}

const RELOGIN_ERRORS = new Set([
  'invalid_grant',
  'invalid_token',
  'invalid_request',
  'refresh_token_reused'
])

/**
 * Lấy access token mới từ refresh token.
 * Ném `ReloginError` nếu token không hợp lệ hoặc bị thu hồi.
 */
export async function refreshCodex(
  fetchImpl: typeof fetch,
  refreshToken: string
): Promise<CodexTokens> {
  const { response, body } = await tokenRequest(fetchImpl, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CODEX.clientId
  })
  if (response.ok) return tokensOf(body, refreshToken)
  const code =
    typeof body.error === 'string'
      ? body.error
      : typeof (body.error as Record<string, unknown> | undefined)?.code === 'string'
        ? String((body.error as Record<string, unknown>).code)
        : ''
  if (response.status === 429) {
    throw new ProviderError('rate_limited', 'OpenAI đang giới hạn việc làm mới token.', {
      status: 429
    })
  }
  if (RELOGIN_ERRORS.has(code) || response.status === 401 || response.status === 403) {
    throw new ReloginError()
  }
  throw new ProviderError(
    'network',
    'Không làm mới được token ChatGPT (HTTP ' + response.status + ').',
    {
      status: response.status
    }
  )
}

/** Thông tin tài khoản trích xuất từ access token. */
export interface CodexAccount {
  accountId?: string
  residency?: string
  email?: string
  expiresAt: number | null
}

export function codexAccount(accessToken: string): CodexAccount {
  const claims = jwtClaims(accessToken) ?? {}
  const auth = (claims['https://api.openai.com/auth'] ?? {}) as Record<string, unknown>
  const profile = (claims['https://api.openai.com/profile'] ?? {}) as Record<string, unknown>
  const residency = auth.chatgpt_data_residency ?? auth.chatgpt_compute_residency
  const email = profile.email ?? claims.email
  return {
    ...(typeof auth.chatgpt_account_id === 'string' ? { accountId: auth.chatgpt_account_id } : {}),
    ...(typeof residency === 'string' ? { residency } : {}),
    ...(typeof email === 'string' ? { email } : {}),
    expiresAt: jwtExpiry(accessToken)
  }
}

/** Tạo tiêu đề HTTP cho yêu cầu gửi tới Codex. */
export function codexHeaders(call: CallOptions, userAgent: string): Record<string, string> {
  const credential = call.credential
  const headers: Record<string, string> = { originator: 'mira', 'User-Agent': userAgent }
  if (credential?.kind === 'oauth') {
    if (credential.accountId) headers['ChatGPT-Account-ID'] = credential.accountId
    if (credential.residency) headers['x-openai-internal-codex-residency'] = credential.residency
  }
  if (call.sessionId) headers.session_id = call.sessionId
  return headers
}

/** Cửa sổ giới hạn mức sử dụng của tài khoản. */
export interface UsageWindow {
  kind: 'session' | 'week' | 'other'
  /** Phần trăm hạn mức còn lại (0–100). */
  remainingPercent: number
  /** Thời điểm đặt lại hạn mức (epoch ms), nếu có. */
  resetsAt: number | null
}

/** Chuyển đổi thời gian đặt lại hạn mức từ giây epoch hoặc chuỗi ngày ISO. */
function resetTime(raw: unknown, now: number, seconds: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw > 1e12 ? raw : raw * 1000
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  if (typeof seconds === 'number' && Number.isFinite(seconds)) return now + seconds * 1000
  return null
}

/**
 * Phân tích dữ liệu hạn mức sử dụng từ phản hồi của máy chủ.
 * Cửa sổ 18 000 giây tương ứng phiên ngắn hạn, 604 800 giây tương ứng chu kỳ tuần.
 */
export function parseCodexUsage(body: unknown, now: number): UsageWindow[] {
  const limits = ((body ?? {}) as Record<string, unknown>).rate_limit as
    | Record<string, unknown>
    | undefined
  if (!limits) return []
  const windows: UsageWindow[] = []
  for (const name of ['primary_window', 'secondary_window']) {
    const window = limits[name] as Record<string, unknown> | undefined
    if (!window || typeof window.used_percent !== 'number') continue
    const length = window.limit_window_seconds
    windows.push({
      kind: length === 18_000 ? 'session' : length === 604_800 ? 'week' : 'other',
      remainingPercent: Math.max(0, Math.min(100, 100 - window.used_percent)),
      resetsAt: resetTime(window.reset_at, now, window.reset_after_seconds)
    })
  }
  return windows
}
