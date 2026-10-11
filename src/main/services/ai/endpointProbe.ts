import { normalizeBaseUrl } from '../../../shared/contracts/endpointUrl'
import type { ApiMode, EndpointProbeResult } from '../../../shared/contracts/aiConnections'
import {
  anthropicBase,
  ANTHROPIC_VERSION
} from '../../infra/providers/transports/anthropicTransport'
import {
  guessApiMode,
  type ResolvedApiMode
} from '../../infra/providers/transports/transportFactory'

/**
 * Kiểm tra tính khả dụng của endpoint tương thích API trước khi lưu:
 *
 *  1. Gửi `GET {base}/models`, sau đó thử biến thể có hoặc không có `/v1`. Biến thể trả về
 *     danh sách model sẽ được giữ lại làm URL cơ sở, vì các lệnh gọi chat sẽ nối tiếp đường dẫn API vào sau.
 *  2. Gửi thử yêu cầu 1 token tới endpoint chat. Chỉ các mã lỗi 404, 405 và 501 biểu thị máy chủ
 *     không cung cấp route API này; các mã khác (kể cả 400 hoặc 429) cho thấy route API tồn tại.
 *
 * Phản hồi 200 trả về trang web HTML hoặc danh sách rỗng được xem là sai địa chỉ.
 * Lỗi kết nối mạng không khẳng định khóa sai: người dùng vẫn có thể lưu kèm cảnh báo.
 */

export interface ProbeOptions {
  baseUrl: string
  apiKey?: string
  /** Model dùng để kiểm tra route; dùng model đầu tiên nếu để trống. */
  model?: string
  fetchImpl: typeof fetch
  timeoutMs?: number
  /**
   * Giao thức API cần kiểm tra (`/chat/completions`, `/responses` hoặc `/v1/messages`). Giá trị `auto` tự suy đoán từ địa chỉ.
   */
  apiMode?: ApiMode
}

/** Tên route tương ứng với từng chế độ API. */
const ROUTE_NAME: Record<ResolvedApiMode, string> = {
  chat_completions: '/chat/completions',
  responses: '/responses',
  anthropic_messages: '/v1/messages'
}

function modeOf(options: ProbeOptions, base: string): ResolvedApiMode {
  const mode = options.apiMode ?? 'auto'
  return mode === 'auto' ? guessApiMode(base) : mode
}

type ListOutcome =
  | { kind: 'models'; ids: string[] }
  | { kind: 'empty' }
  | { kind: 'html' }
  | { kind: 'rejected'; status: number }
  | { kind: 'status'; status: number }
  | { kind: 'network'; message: string }

const ROUTE_ABSENT = new Set([404, 405, 501])

function withTimeout(ms: number): { signal: AbortSignal; done(): void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, done: () => clearTimeout(timer) }
}

function headers(
  apiKey: string | undefined,
  mode: ResolvedApiMode = 'chat_completions'
): Record<string, string> {
  if (mode === 'anthropic_messages') {
    return { 'anthropic-version': ANTHROPIC_VERSION, ...(apiKey ? { 'x-api-key': apiKey } : {}) }
  }
  return apiKey ? { Authorization: 'Bearer ' + apiKey } : {}
}

/** Tạo payload yêu cầu 1 token theo định dạng riêng của từng chế độ. */
function routeBody(mode: ResolvedApiMode, model: string): Record<string, unknown> {
  if (mode === 'responses') return { model, input: 'ping', max_output_tokens: 16, stream: false }
  if (mode === 'anthropic_messages') {
    return { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }
  }
  return { model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, stream: false }
}

/** Đổi giữa `http://host` và `http://host/v1` để tìm đường dẫn thay thế khả dụng. */
export function alternateBase(baseUrl: string): string | null {
  const base = baseUrl.replace(/\/+$/, '')
  if (/\/v1$/i.test(base)) {
    const stripped = base.replace(/\/v1$/i, '')
    return /^https?:\/\/[^/]+/i.test(stripped) ? stripped : null
  }
  return base + '/v1'
}

async function listAt(base: string, options: ProbeOptions): Promise<ListOutcome> {
  const timer = withTimeout(options.timeoutMs ?? 10_000)
  try {
    const mode = modeOf(options, base)
    const response = await options.fetchImpl(
      base + (mode === 'anthropic_messages' ? '/v1/models' : '/models'),
      { method: 'GET', headers: headers(options.apiKey, mode), signal: timer.signal }
    )
    if (response.status === 401 || response.status === 403) {
      return { kind: 'rejected', status: response.status }
    }
    if (!response.ok) return { kind: 'status', status: response.status }
    const text = await response.text()
    const type = response.headers.get('content-type') ?? ''
    if (type.includes('html') || /^\s*</.test(text)) return { kind: 'html' }
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return { kind: 'html' }
    }
    const data =
      (body as { data?: unknown; models?: unknown }).data ?? (body as { models?: unknown }).models
    const ids = Array.isArray(data)
      ? data
          .map((item) =>
            typeof item === 'string'
              ? item
              : typeof (item as { id?: unknown })?.id === 'string'
                ? (item as { id: string }).id
                : typeof (item as { name?: unknown })?.name === 'string'
                  ? (item as { name: string }).name
                  : null
          )
          .filter((id): id is string => id !== null)
          .map((id) => id.replace(/^models\//, ''))
      : []
    return ids.length > 0 ? { kind: 'models', ids } : { kind: 'empty' }
  } catch (error) {
    return { kind: 'network', message: error instanceof Error ? error.message : String(error) }
  } finally {
    timer.done()
  }
}

async function routeServed(
  base: string,
  model: string,
  options: ProbeOptions
): Promise<{ served: boolean | null; status: number | null }> {
  const timer = withTimeout(options.timeoutMs ?? 15_000)
  try {
    const mode = modeOf(options, base)
    const response = await options.fetchImpl(base + ROUTE_NAME[mode], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers(options.apiKey, mode) },
      body: JSON.stringify(routeBody(mode, model)),
      signal: timer.signal
    })
    void response.body?.cancel().catch(() => undefined)
    return { served: !ROUTE_ABSENT.has(response.status), status: response.status }
  } catch {
    return { served: null, status: null }
  } finally {
    timer.done()
  }
}

export async function probeEndpoint(options: ProbeOptions): Promise<EndpointProbeResult> {
  const normalized = normalizeBaseUrl(options.baseUrl).replace(/\/+$/, '')
  const mode = modeOf(options, normalized)
  // Anthropic tự mang tiền tố `/v1` trong route, nên giữ nguyên base không có `/v1`.
  const base = mode === 'anthropic_messages' ? anthropicBase(normalized) : normalized
  const candidates =
    mode === 'anthropic_messages'
      ? [base]
      : [base, alternateBase(base)].filter((url): url is string => url !== null)

  let found: { base: string; ids: string[] } | null = null
  let first: ListOutcome | null = null
  for (const candidate of candidates) {
    const outcome = await listAt(candidate, options)
    first ??= outcome
    if (outcome.kind === 'rejected') {
      return {
        ok: false,
        reachable: true,
        keyRejected: true,
        resolvedBaseUrl: null,
        models: [],
        routeChecked: false,
        message: 'Khóa bị từ chối (HTTP ' + outcome.status + '). Kiểm lại khóa API.'
      }
    }
    if (outcome.kind === 'models') {
      found = { base: candidate, ids: outcome.ids }
      break
    }
  }

  if (!found) {
    if (first?.kind === 'network') {
      return {
        ok: false,
        reachable: false,
        keyRejected: false,
        resolvedBaseUrl: null,
        models: [],
        routeChecked: false,
        message:
          'Không kết nối được tới ' + base + '. Kiểm lại địa chỉ, mạng, hoặc endpoint đã chạy chưa.'
      }
    }
    if (first?.kind === 'html') {
      return {
        ok: false,
        reachable: true,
        keyRejected: false,
        resolvedBaseUrl: null,
        models: [],
        routeChecked: false,
        message: 'Địa chỉ trả về trang web chứ không phải danh sách model; kiểm lại URL.'
      }
    }
    // Không tìm thấy danh sách model: endpoint có thể vẫn hỗ trợ chat (một số gateway ẩn /models), nên thử route trực tiếp.
    const model = options.model?.trim()
    if (model) {
      const route = await routeServed(base, model, options)
      if (route.served) {
        return {
          ok: true,
          reachable: true,
          keyRejected: false,
          resolvedBaseUrl: base,
          models: [],
          routeChecked: true,
          message: 'Endpoint phục vụ ' + ROUTE_NAME[mode] + ' nhưng không liệt kê model.'
        }
      }
    }
    return {
      ok: false,
      reachable: true,
      keyRejected: false,
      resolvedBaseUrl: null,
      models: [],
      routeChecked: false,
      message:
        first?.kind === 'empty'
          ? 'Địa chỉ không trả về model nào; kiểm lại URL (thường kết thúc bằng /v1).'
          : 'Không tìm thấy danh sách model ở ' +
            base +
            ' (HTTP ' +
            (first?.kind === 'status' ? first.status : '?') +
            ').'
    }
  }

  const model = options.model?.trim() || found.ids[0]!
  const route = await routeServed(found.base, model, options)
  if (route.served === false) {
    return {
      ok: false,
      reachable: true,
      keyRejected: false,
      resolvedBaseUrl: found.base,
      models: found.ids,
      routeChecked: true,
      message:
        'Endpoint liệt kê model nhưng không phục vụ ' +
        ROUTE_NAME[mode] +
        ' (HTTP ' +
        route.status +
        ').'
    }
  }
  return {
    ok: true,
    reachable: true,
    keyRejected: false,
    resolvedBaseUrl: found.base,
    models: found.ids,
    routeChecked: route.served === true,
    message:
      found.base === base
        ? 'Kết nối được, có ' + found.ids.length + ' model.'
        : 'Kết nối được ở ' + found.base + ', có ' + found.ids.length + ' model.'
  }
}
