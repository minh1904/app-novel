import { normalizeBaseUrl } from '../../../../shared/contracts/endpointUrl'
import { FORBIDDEN_HEADERS } from '../../../../shared/contracts/modelSettings'
import type { ClassifiedError } from '../classifyError'
import type { ChatRequest, ChatStreamEvent, CompleteResult } from './openAiChatTransport'
import { redactSecrets } from '../redact'
import { ProviderError, type SentParameters } from '../types'

/**
 * What every transport shares (change `subscription-providers`, design D1): the deadlines and cancel of
 * one call, the header merge that keeps a key on the one path that scrubs it, and turning a classified
 * failure into a `ProviderError`. Each transport — Chat Completions, Responses, Anthropic Messages — builds
 * its own body and reads its own stream; the rest is here so they cannot drift apart.
 */

/** How long a call may take before it is given up as `timeout`. */
export interface TransportTimeouts {
  /** A plain call: the whole of it. */
  totalMs: number
  /** A streamed call: from sending the request until the first event arrives. */
  firstByteMs: number
  /** A streamed call: how long it may then stay silent between two events. */
  idleMs: number
}

export const DEFAULT_TIMEOUTS: TransportTimeouts = {
  totalMs: 180_000,
  firstByteMs: 60_000,
  idleMs: 60_000
}

/**
 * Who the call is made as, beyond a bare key. An API key is just the key. An account login carries what the
 * provider routes by: the ChatGPT account id and residency for Codex, the API base Copilot's token names.
 */
export type Credential =
  | { kind: 'api_key'; key: string }
  | {
      kind: 'oauth'
      provider: 'codex' | 'copilot'
      accessToken: string
      accountId?: string
      residency?: string
      apiBase?: string
    }

/** What differs from call to call. */
export interface CallOptions {
  /** The bearer secret: a key, or an account's access token. `null` for an endpoint that wants none. */
  apiKey: string | null
  signal?: AbortSignal
  /** The credential the key came from, when it is more than a key (an account login). */
  credential?: Credential
  /**
   * Fetches a fresh credential after a 401, once per call. Absent for an API key: a rejected key is
   * rejected, and the key layer retires it.
   */
  refresh?: () => Promise<Credential | null>
  /**
   * Which round of a chat turn this is: 0 is the person's own request, later rounds answer tool calls.
   * Copilot bills the two differently (`x-initiator`). A translation batch is always 0.
   */
  turnRound?: number
  /** A stable id for the conversation, for providers that cache by it (Codex `session_id`). */
  sessionId?: string
}

/** The listing of one model, as a transport can tell it. */
export interface ModelListing {
  id: string
  /** Thinking levels the provider says the model takes, when it says. */
  reasoningLevels?: string[]
}

/** One way of talking to a model. Every transport takes and gives Mira's own shapes. */
export interface ChatTransport {
  listModels(call: CallOptions): Promise<string[]>
  complete(request: ChatRequest, call: CallOptions): Promise<CompleteResult>
  stream(request: ChatRequest, call: CallOptions): AsyncGenerator<ChatStreamEvent>
}

/** The bearer secret of a credential. */
export function bearerOf(credential: Credential): string {
  return credential.kind === 'api_key' ? credential.key : credential.accessToken
}

/** Joins a path to a base without caring about a trailing slash or a pasted endpoint (see `normalizeBaseUrl`). */
export function joinUrl(baseUrl: string, path: string): string {
  return normalizeBaseUrl(baseUrl) + '/' + path.replace(/^\/+/, '')
}

/**
 * The headers of one call: the caller's extras first, then Mira's own on top. Names are compared without
 * regard to case, because header names are not case sensitive: `Authorization` and `authorization` are
 * one header, and the extra one must not survive next to the real one.
 */
export function buildHeaders(
  own: Record<string, string>,
  extra: Record<string, string> | undefined
): Record<string, string> {
  const ownNames = new Set(Object.keys(own).map((name) => name.toLowerCase()))
  const merged: Record<string, string> = {}
  for (const [name, value] of Object.entries(extra ?? {})) {
    const lower = name.toLowerCase()
    if ((FORBIDDEN_HEADERS as readonly string[]).includes(lower) || ownNames.has(lower)) continue
    merged[name] = value
  }
  return { ...merged, ...own }
}

/** A single deadline that can be re-armed; when it fires it aborts the call and remembers that it did. */
export class Deadline {
  fired = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly onFire: () => void) {}

  arm(ms: number): void {
    this.clear()
    this.timer = setTimeout(() => {
      this.fired = true
      this.onFire()
    }, ms)
  }

  clear(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }
}

/**
 * The cancellation of one call: the caller's signal and our own deadline, merged.
 *
 * Both end the call by aborting it, so the *reason* has to be recovered afterwards. **Cancel beats
 * timeout** when both are true: a person who pressed Cancel is told it was cancelled, not that the
 * provider was slow.
 */
export class Attempt {
  readonly signal: AbortSignal
  readonly deadline: Deadline
  private readonly controller = new AbortController()
  private readonly onAbort = (): void => this.controller.abort()

  constructor(private readonly caller: AbortSignal | undefined) {
    this.signal = this.controller.signal
    this.deadline = new Deadline(() => this.controller.abort())
    if (caller?.aborted) this.controller.abort()
    else caller?.addEventListener('abort', this.onAbort, { once: true })
  }

  /** The error that matches why the call stopped, or `null` when it did not stop for either reason. */
  interruption(): ProviderError | null {
    if (this.caller?.aborted) return new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
    if (this.deadline.fired) {
      return new ProviderError('timeout', 'Nhà cung cấp không trả lời trong thời hạn cho phép.')
    }
    return null
  }

  /** Always called when the call is over: it frees the timer, the listener and a connection left open. */
  finish(): void {
    this.deadline.clear()
    this.caller?.removeEventListener('abort', this.onAbort)
    this.controller.abort()
  }
}

export function errorMessage(error: unknown, secret: string | null): string {
  return redactSecrets(error instanceof Error ? error.message : String(error), [secret])
}

export function toProviderError(error: ClassifiedError, sent?: SentParameters): ProviderError {
  return new ProviderError(error.kind, error.message, {
    retryAfterMs: error.retryAfterMs,
    status: error.status,
    receivedAt: error.receivedAt,
    quotaScope: error.quotaScope,
    bodySnippet: error.bodySnippet,
    requestProblem: error.requestProblem,
    filter: error.filter,
    // Only a request error needs them: they are what the person checks when the provider says "invalid".
    sent: error.kind === 'invalid_request' ? sent : undefined
  })
}

/** The address of a call: an account's own API base (Copilot's token names one) over the connection's. */
export function baseFor(baseUrl: string, call: CallOptions): string {
  return call.credential?.kind === 'oauth' && call.credential.apiBase
    ? call.credential.apiBase
    : baseUrl
}

/**
 * Makes a request, and when it is answered 401 and the call can refresh its credential, refreshes once and
 * makes it again with the new one. Returns the response and the key it was made with, so a failure is
 * scrubbed of the key that was really sent. A request that never got an answer is `network` (or the
 * reason the call stopped).
 */
export async function sendWithRefresh(
  call: CallOptions,
  attempt: Attempt,
  send: (call: CallOptions) => Promise<Response>,
  /** Besides 401: an error answer a fresh token fixes (Copilot's `model_not_available_for_integrator`). */
  refreshWhen?: (status: number, body: string) => boolean
): Promise<{ response: Response; apiKey: string | null }> {
  let current = call
  for (let round = 0; ; round++) {
    let response: Response
    try {
      response = await send(current)
    } catch (error) {
      const stop = attempt.interruption()
      if (stop !== null) throw stop
      throw new ProviderError(
        'network',
        'Không nối được tới nhà cung cấp: ' + errorMessage(error, current.apiKey)
      )
    }
    if (round > 0 || current.refresh === undefined || response.ok) {
      return { response, apiKey: current.apiKey }
    }
    if (response.status !== 401) {
      if (refreshWhen === undefined || response.status < 400 || response.status >= 500) {
        return { response, apiKey: current.apiKey }
      }
      // Read a copy: the original stays readable for the error the caller builds from it.
      const text = await response
        .clone()
        .text()
        .catch(() => '')
      if (!refreshWhen(response.status, text)) return { response, apiKey: current.apiKey }
    }
    const fresh = await current.refresh()
    if (fresh === null) return { response, apiKey: current.apiKey }
    // The rejected answer is not read: drop its body so the connection is freed.
    void response.body?.cancel().catch(() => undefined)
    current = { ...current, apiKey: bearerOf(fresh), credential: fresh, refresh: undefined }
  }
}
