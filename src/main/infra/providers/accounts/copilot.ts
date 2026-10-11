import type { CallOptions } from '../transports/transportShared'
import { ProviderError } from '../types'
import { ReloginError, type DeviceCode, type PollOutcome } from './codex'

/**
 * Đăng nhập GitHub Copilot, đổi token, cấu hình header và danh sách mô hình.
 * Các hằng số tiêu đề được cấu hình tương thích với môi trường biên tập mã nguồn.
 */

export const COPILOT = {
  clientId: 'Iv1.b507a08c87ecfe98',
  scope: 'read:user',
  deviceCodeUrl: 'https://github.com/login/device/code',
  accessTokenUrl: 'https://github.com/login/oauth/access_token',
  tokenUrl: 'https://api.github.com/copilot_internal/v2/token',
  editorVersion: 'vscode/1.104.1',
  pluginUserAgent: 'GitHubCopilotChat/0.26.7',
  integrationId: 'vscode-chat',
  defaultApi: 'https://api.githubcopilot.com',
  /** Thời gian đổi lại token Copilot trước khi hết hạn (ms). */
  refreshSkewMs: 120_000,
  /** Khoảng thời gian cộng thêm vào chu kỳ thăm dò của GitHub (ms). */
  pollPaddingMs: 3_000
} as const

/** Danh sách mô hình dự phòng khi không thể lấy danh sách mô hình từ tài khoản. */
export const COPILOT_FALLBACK_MODELS = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5-mini',
  'gpt-4.1',
  'claude-sonnet-4.6',
  'claude-opus-4.6',
  'gemini-2.5-pro'
]

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
    'Không nối được tới GitHub: ' + (error instanceof Error ? error.message : String(error))
  )
}

function form(fields: Record<string, string>): RequestInit {
  return {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString()
  }
}

/** Bước 1: Yêu cầu mã thiết bị từ GitHub. */
export async function requestCopilotCode(
  fetchImpl: typeof fetch,
  now: number
): Promise<DeviceCode> {
  let response: Response
  try {
    response = await fetchImpl(
      COPILOT.deviceCodeUrl,
      form({ client_id: COPILOT.clientId, scope: COPILOT.scope })
    )
  } catch (error) {
    throw networkError(error)
  }
  const body = await readJson(response)
  if (
    !response.ok ||
    typeof body.device_code !== 'string' ||
    typeof body.user_code !== 'string' ||
    typeof body.verification_uri !== 'string'
  ) {
    throw new ProviderError(
      'invalid_response',
      'GitHub không cấp mã thiết bị (HTTP ' + response.status + ').',
      {
        status: response.status
      }
    )
  }
  const interval = typeof body.interval === 'number' ? body.interval : 5
  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 900
  return {
    userCode: body.user_code,
    verificationUrl: body.verification_uri,
    intervalMs: interval * 1000 + COPILOT.pollPaddingMs,
    expiresAt: now + expiresIn * 1000,
    handle: { deviceCode: body.device_code }
  }
}

/**
 * Bước 2: Thăm dò kết quả xác thực một lần.
 * Trả về `pending` khi đang chờ, hoặc trả về mã token GitHub sau khi người dùng phê duyệt.
 */
export async function pollCopilot(
  fetchImpl: typeof fetch,
  code: DeviceCode,
  now: number
): Promise<PollOutcome<{ githubToken: string }>> {
  if (now >= code.expiresAt) return { status: 'expired', message: 'Mã đã hết hạn.' }
  let response: Response
  try {
    response = await fetchImpl(
      COPILOT.accessTokenUrl,
      form({
        client_id: COPILOT.clientId,
        device_code: code.handle.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    )
  } catch (error) {
    throw networkError(error)
  }
  const body = await readJson(response)
  if (typeof body.access_token === 'string') {
    return { status: 'approved', result: { githubToken: body.access_token } }
  }
  switch (body.error) {
    case 'authorization_pending':
      return { status: 'pending' }
    case 'slow_down':
      return { status: 'pending', slowDown: true }
    case 'expired_token':
      return { status: 'expired', message: 'Mã đã hết hạn.' }
    case 'access_denied':
      return { status: 'denied', message: 'Bạn đã từ chối cho Mira truy cập GitHub.' }
    default:
      return {
        status: 'denied',
        message:
          'GitHub từ chối đăng nhập' + (typeof body.error === 'string' ? ': ' + body.error : '.')
      }
  }
}

/** Thông tin token Copilot tạm thời và endpoint API tương ứng. */
export interface CopilotToken {
  token: string
  expiresAt: number
  apiBase: string
}

/** Lỗi khi tài khoản GitHub không có quyền sử dụng Copilot hoặc bị từ chối vĩnh viễn. */
export class NoCopilotError extends Error {
  constructor(message = 'Tài khoản GitHub này không có Copilot.') {
    super(message)
    this.name = 'NoCopilotError'
  }
}

/**
 * Đổi token GitHub lấy token Copilot.
 * Thử lại tối đa 3 lần với khoảng chờ tăng dần nếu gặp lỗi mạng hoặc lỗi tạm thời.
 */
export async function exchangeCopilotToken(
  fetchImpl: typeof fetch,
  githubToken: string,
  now: () => number,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<CopilotToken> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response | null = null
    try {
      response = await fetchImpl(COPILOT.tokenUrl, {
        method: 'GET',
        headers: {
          authorization: 'token ' + githubToken,
          accept: 'application/json',
          'Editor-Version': COPILOT.editorVersion,
          'User-Agent': COPILOT.pluginUserAgent
        }
      })
    } catch (error) {
      lastError = networkError(error)
    }
    if (response) {
      if (response.status === 401) throw new ReloginError()
      if (response.status === 403 || response.status === 404) throw new NoCopilotError()
      if (response.ok) {
        const body = await readJson(response)
        if (typeof body.token !== 'string') {
          throw new ProviderError(
            'invalid_response',
            'GitHub trả token Copilot thiếu trường cần thiết.'
          )
        }
        const expires =
          typeof body.expires_at === 'number' ? body.expires_at * 1000 : now() + 1_800_000
        const endpoints = (body.endpoints ?? {}) as Record<string, unknown>
        return {
          token: body.token,
          expiresAt: expires,
          apiBase: typeof endpoints.api === 'string' ? endpoints.api : COPILOT.defaultApi
        }
      }
      lastError = new ProviderError(
        'network',
        'GitHub không cấp token Copilot (HTTP ' + response.status + ').',
        {
          status: response.status
        }
      )
    }
    if (attempt < 3) await sleep(1500 * attempt)
  }
  throw lastError instanceof Error
    ? lastError
    : new ProviderError('network', 'Không đổi được token Copilot.')
}

/**
 * Tạo tiêu đề HTTP cho các yêu cầu gửi tới Copilot.
 * Đặt `x-initiator` thành `user` hoặc `agent` tùy theo lượt gọi.
 */
export function copilotHeaders(call: CallOptions, userAgent: string): Record<string, string> {
  return {
    'Editor-Version': COPILOT.editorVersion,
    'Copilot-Integration-Id': COPILOT.integrationId,
    'Openai-Intent': 'conversation-edits',
    'x-initiator': (call.turnRound ?? 0) > 0 ? 'agent' : 'user',
    'User-Agent': userAgent
  }
}

/** Thông tin mô hình Copilot hỗ trợ cùng các mức độ suy luận. */
export interface CopilotModel {
  id: string
  reasoningLevels: string[]
}

/**
 * Phân tích danh sách mô hình trò chuyện được hỗ trợ từ phản hồi của Copilot.
 */
export function parseCopilotModels(body: unknown): CopilotModel[] {
  const data = ((body ?? {}) as { data?: unknown[] }).data
  if (!Array.isArray(data)) return []
  const chat = data
    .map((raw) => raw as Record<string, unknown>)
    .filter((model) => {
      const capabilities = (model.capabilities ?? {}) as Record<string, unknown>
      if (capabilities.type !== 'chat') return false
      const endpoints = model.supported_endpoints
      return (
        !Array.isArray(endpoints) ||
        endpoints.some((endpoint) => endpoint === '/chat/completions' || endpoint === '/responses')
      )
    })
  const picked = chat.filter((model) => model.model_picker_enabled !== false)
  return (picked.length > 0 ? picked : chat)
    .filter((model) => typeof model.id === 'string')
    .map((model) => {
      const supports = (((model.capabilities ?? {}) as Record<string, unknown>).supports ??
        {}) as Record<string, unknown>
      const levels = supports.reasoning_effort
      return {
        id: model.id as string,
        reasoningLevels: Array.isArray(levels)
          ? levels.filter((level): level is string => typeof level === 'string')
          : []
      }
    })
}

/** Kiểm tra mô hình có sử dụng endpoint `/responses` thay vì Chat Completions hay không. */
export function copilotUsesResponses(model: string): boolean {
  const id = model.toLowerCase()
  if (id.startsWith('gpt-5-mini')) return false
  const match = /^gpt-(\d+)/.exec(id)
  return match !== null && Number(match[1]) >= 5
}

/** Dấu hiệu lỗi trong nội dung phản hồi cần thử lại với token Copilot mới (ngoài mã 401). */
export const COPILOT_REFRESH_MARKERS = /model_not_available_for_integrator|model_not_supported/
