import { normalizeBaseUrl } from '../../../shared/contracts/endpointUrl'
import type { ApiMode, EndpointProbeResult } from '../../../shared/contracts/aiConnections'
import { anthropicBase, ANTHROPIC_VERSION } from '../../infra/providers/anthropicTransport'
import { guessApiMode, type ResolvedApiMode } from '../../infra/providers/transportFactory'

/**
 * Checks an OpenAI-compatible endpoint the way Hermes Desktop does before saving one
 * (hermes_cli/web_routers/config_env.py:852-1053, change `hermes-settings-modal` design D5):
 *
 *  1. `GET {base}/models`, then the variant with `/v1` added or removed. The variant that answers with a
 *     model list is the base URL to keep, because chat calls append `/chat/completions` to it verbatim.
 *  2. A one-token `POST {base}/chat/completions`. Only 404, 405 and 501 mean "this host does not serve the
 *     chat API"; any other answer (400 for a wrong model, 429, …) means the route is there.
 *
 * A 200 that is a web page, or a JSON list with no models, is reported as a probably wrong address. A
 * network failure says nothing about the key: the caller may still save, with a warning.
 */

export interface ProbeOptions {
  baseUrl: string
  apiKey?: string
  /** The model for the route check; the first listed model when absent. */
  model?: string
  fetchImpl: typeof fetch
  timeoutMs?: number
  /**
   * Which protocol to check (change `subscription-providers`, task 6.5): the route probed is
   * `/chat/completions`, `/responses` or `/v1/messages`. `auto` decides from the address.
   */
  apiMode?: ApiMode
}

/** The route a mode serves, as the messages name it. */
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

/** A one-token request in the mode's own shape. */
function routeBody(mode: ResolvedApiMode, model: string): Record<string, unknown> {
  if (mode === 'responses') return { model, input: 'ping', max_output_tokens: 16, stream: false }
  if (mode === 'anthropic_messages') {
    return { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }
  }
  return { model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, stream: false }
}

/** `http://host` → `http://host/v1`, and `http://host/v1` → `http://host`; the one other place a list may live. */
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
  // Anthropic's routes carry their own `/v1`, so its base is kept without one and has no alternative.
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
    // No list anywhere: the endpoint may still serve chat (some gateways hide /models), so try the route.
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
