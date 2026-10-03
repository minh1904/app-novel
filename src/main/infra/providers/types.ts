import type { SourceLanguage } from '../../../shared/contracts/library'
import type { QuotaScope } from '../storage/connections'
import type { Usage } from './usage'

/**
 * The contract every translation provider meets: the mock one now, real ones later. Requests and
 * answers are keyed by segment id, never by position, so a provider that drops, repeats or reorders
 * lines cannot put a translation on the wrong segment.
 */

export interface SegmentText {
  id: string
  text: string
}

export interface TranslateRequest {
  sourceLang: SourceLanguage
  /** The target language is always Vietnamese. */
  targetLang: 'vi'
  segments: SegmentText[]
  /** Optional background for the model (genre, glossary, pronouns); the provider decides its use. */
  context?: string
}

export interface TranslateResponse {
  /** Which provider answered, e.g. "mock" or "openrouter". Recorded as provenance. */
  provider: string
  model: string
  items: SegmentText[]
  /**
   * The real token count, when the provider reports one. Kept beside the result so the estimate
   * shown before a run can be compared against what the run cost (D7 of change `ai-connection`).
   */
  usage?: Usage
}

export interface TranslateOptions {
  /** Aborting makes the call fail with a `cancelled` error; no partial result is returned. */
  signal?: AbortSignal
}

export interface TranslationProvider {
  readonly id: string
  translate(request: TranslateRequest, options?: TranslateOptions): Promise<TranslateResponse>
}

export type ProviderErrorKind =
  | 'rate_limited'
  | 'network'
  /** No answer within the call's deadline. Says nothing about the key. */
  | 'timeout'
  | 'auth'
  /** The account is out of credit or billing quota: money, not time, so waiting does not help. */
  | 'quota'
  | 'refused'
  | 'invalid_response'
  | 'cancelled'

/** Whether trying the same request again can succeed, by kind. */
const RETRYABLE: Record<ProviderErrorKind, boolean> = {
  rate_limited: true,
  network: true,
  timeout: true,
  invalid_response: true,
  auth: false,
  quota: false,
  refused: false,
  cancelled: false
}

/** What an error carries besides its kind and message. Every field is optional: only what is known. */
export interface ProviderErrorDetails {
  /** How long the provider asked us to wait, when it said (rate limits). */
  retryAfterMs?: number
  /** HTTP status of the response, when one arrived. */
  status?: number
  /** When the response arrived (ms epoch): the moment a cooldown is counted from. */
  receivedAt?: number
  /** Whether a rate limit is per minute or per day, when the body made that clear. */
  quotaScope?: QuotaScope
  /** A bounded, scrubbed piece of the response body. Never contains a key. */
  bodySnippet?: string
}

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly retryable: boolean
  readonly retryAfterMs?: number
  readonly status?: number
  readonly receivedAt?: number
  readonly quotaScope?: QuotaScope
  readonly bodySnippet?: string

  constructor(kind: ProviderErrorKind, message: string, options: ProviderErrorDetails = {}) {
    super(message)
    this.name = 'ProviderError'
    this.kind = kind
    this.retryable = RETRYABLE[kind]
    this.retryAfterMs = options.retryAfterMs
    this.status = options.status
    this.receivedAt = options.receivedAt
    this.quotaScope = options.quotaScope
    this.bodySnippet = options.bodySnippet
  }
}
