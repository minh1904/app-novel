import type { CallOptions } from '../transportShared'
import { ProviderError } from '../types'
import { jwtClaims, jwtExpiry } from './jwt'

/**
 * ChatGPT / Codex login and the facts its calls need (change `subscription-providers`, design D4). Every
 * constant comes from Hermes (`hermes_cli/auth_constants.py`, `web_routers/oauth.py`, `auth_codex.py`,
 * `codex_headers.py`, `account_usage.py`, `codex_models.py`, commit `bf871a5943`, read 2026-10-08). They are
 * the provider's internal endpoints, not a public API: if one changes, this file is the one place to fix.
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
  /** Refresh this long before `exp`. */
  refreshSkewMs: 120_000,
  /** A device code is given up after this long, counted on our side. */
  codeLifetimeMs: 15 * 60_000
} as const

/** What Mira lists when the account's model list cannot be read (`codex_models.py:22-35`). */
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

/** A device code, as the login screen shows it. */
export interface DeviceCode {
  userCode: string
  verificationUrl: string
  /** How long to wait between two polls. */
  intervalMs: number
  /** When the code is given up (ms epoch). */
  expiresAt: number
  /** What the next poll sends back; never shown. */
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

/** The login was refused for good: the refresh token is spent or revoked. */
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

/** Step 1: ask for a device code. */
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
 * Step 2: ask once whether the person has confirmed. 403/404 mean "not yet"; 200 carries an authorization
 * code, which is exchanged for tokens at once (step 3). A network failure is thrown as `network`, so the
 * caller can retry it quietly a few times before saying anything.
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

/** Step 3: the authorization code for an access and a refresh token. */
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
 * A new access token from the refresh token. A refused refresh (`invalid_grant`, `refresh_token_reused`,
 * 401/403…) is a `ReloginError`; 429 is a rate limit, not a reason to log in again.
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

/** What an access token says about its account: where calls go, and who it is. */
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

/**
 * Headers of a call to Codex. Mira names itself (`originator: mira`, its own User-Agent) instead of posing
 * as the Codex CLI, as design D4 decided.
 */
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

/** One window of the account's limits, as the chip shows it. */
export interface UsageWindow {
  kind: 'session' | 'week' | 'other'
  /** Percent still left, 0–100. */
  remainingPercent: number
  /** When the window resets (ms epoch), when known. */
  resetsAt: number | null
}

/** `reset_at` comes as epoch seconds or as an ISO date. */
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
 * `GET /wham/usage` (`account_usage.py:316-493`). A window of 18 000 s is "Phiên", 604 800 s is "Tuần";
 * any other length is kept as `other`.
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
