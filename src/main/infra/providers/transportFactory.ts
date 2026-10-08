import type { ApiMode, OAuthProvider } from '../storage/connections'
import { AnthropicMessagesTransport } from './anthropicTransport'
import { codexHeaders, CODEX } from './accounts/codex'
import {
  COPILOT,
  copilotHeaders,
  copilotUsesResponses,
  COPILOT_REFRESH_MARKERS
} from './accounts/copilot'
import type { Compat } from './compat'
import { OpenAiChatTransport } from './openAiChatTransport'
import { ResponsesTransport } from './responsesTransport'
import type { ChatTransport, TransportTimeouts } from './transportShared'

/**
 * Which transport a connection talks to a model through (change `subscription-providers`, spec
 * `provider-transports`, "Chọn transport"):
 *
 * | Connection | Mode |
 * | --- | --- |
 * | Codex | always `responses` |
 * | Anthropic | always `anthropic_messages` |
 * | Copilot | `responses` for `gpt-N` with N ≥ 5 (not `gpt-5-mini`), else `chat_completions` |
 * | Anything else | its own mode; `auto` is `anthropic_messages` for `api.anthropic.com` or a path ending in `/anthropic`, else `chat_completions` |
 */

export type ResolvedApiMode = Exclude<ApiMode, 'auto'>

export interface TransportTarget {
  baseUrl: string
  providerId: string | null
  oauthProvider: OAuthProvider | null
  apiMode: ApiMode
}

/** `auto` for an address: Anthropic's own host, or a gateway route that ends in `/anthropic`. */
export function guessApiMode(baseUrl: string): ResolvedApiMode {
  try {
    const url = new URL(baseUrl)
    if (url.host === 'api.anthropic.com') return 'anthropic_messages'
    if (/\/anthropic\/?$/.test(url.pathname.replace(/\/v1\/?$/, ''))) return 'anthropic_messages'
  } catch {
    // An address that does not parse is left to Chat Completions, which reports the real error.
  }
  return 'chat_completions'
}

export function selectApiMode(target: TransportTarget, model: string): ResolvedApiMode {
  if (target.oauthProvider === 'codex') return 'responses'
  if (target.oauthProvider === 'copilot') {
    return copilotUsesResponses(model) ? 'responses' : 'chat_completions'
  }
  if (target.providerId === 'anthropic') return 'anthropic_messages'
  return target.apiMode === 'auto' ? guessApiMode(target.baseUrl) : target.apiMode
}

/** The address calls go to: an account's own, or the connection's. */
export function baseUrlFor(target: TransportTarget): string {
  if (target.oauthProvider === 'codex') return CODEX.base
  if (target.oauthProvider === 'copilot') return COPILOT.defaultApi
  return target.baseUrl
}

export interface TransportDeps {
  fetchImpl: typeof fetch
  now: () => number
  compat: Compat
  timeouts?: Partial<TransportTimeouts>
  /** `Mira/<version>`: how Mira names itself wherever a header is not forced. */
  userAgent: string
  /** The connection id, so a Codex prompt cache is never shared between two accounts. */
  cacheScope?: string
}

export function createTransport(
  target: TransportTarget,
  model: string,
  deps: TransportDeps
): ChatTransport {
  const mode = selectApiMode(target, model)
  const baseUrl = baseUrlFor(target)
  const headers =
    target.oauthProvider === 'codex'
      ? (call: Parameters<typeof codexHeaders>[0]) => codexHeaders(call, deps.userAgent)
      : target.oauthProvider === 'copilot'
        ? (call: Parameters<typeof copilotHeaders>[0]) => copilotHeaders(call, deps.userAgent)
        : undefined
  const common = { fetchImpl: deps.fetchImpl, now: deps.now, timeouts: deps.timeouts }
  const refreshWhen =
    target.oauthProvider === 'copilot'
      ? (_status: number, body: string) => COPILOT_REFRESH_MARKERS.test(body)
      : undefined
  if (mode === 'anthropic_messages') return new AnthropicMessagesTransport({ baseUrl, ...common })
  if (mode === 'responses') {
    return new ResponsesTransport({
      baseUrl,
      ...common,
      flavor: target.oauthProvider === 'codex' ? 'codex' : 'standard',
      cacheScope: deps.cacheScope,
      headers,
      refreshWhen
    })
  }
  return new OpenAiChatTransport({ baseUrl, compat: deps.compat, ...common, headers, refreshWhen })
}
