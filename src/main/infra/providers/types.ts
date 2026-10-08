import type { SourceLanguage } from '../../../shared/contracts/library'
import type { QuotaScope } from '../storage/connections'
import type { FilterReason } from './filterReason'
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
  /** The provider's safety filter blocked the content, and the response said so. */
  | 'refused'
  /**
   * The provider rejected the request itself: a parameter it does not accept, a request too large,
   * a malformed body. Nothing about the content or the key; sending it again unchanged cannot help.
   */
  | 'invalid_request'
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
  invalid_request: false,
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
  /** For `invalid_request`: what was wrong with the request, when that could be told. */
  requestProblem?: RequestProblem
  /** For `refused`: the block reason the response gave. */
  filter?: FilterReason
  /** For a request error: the generation parameters this call sent, so the message can name them. */
  sent?: SentParameters
  /** The account login this error is about, so the panel can open its card ("Đăng nhập lại"). */
  account?: 'codex' | 'copilot'
}

export type RequestProblem = 'too_large'

/**
 * The generation parameters of one call, as far as they can be shown to the person: values that are not
 * secret, and only the **names** of the `extra_body` fields (their values may be anything). No headers: a
 * header can carry a token.
 */
export interface SentParameters {
  reasoningEffort?: string
  temperature?: number
  topP?: number
  maxTokens?: number
  extraBodyKeys: string[]
  responseFormat: boolean
}

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly retryable: boolean
  readonly retryAfterMs?: number
  readonly status?: number
  readonly receivedAt?: number
  readonly quotaScope?: QuotaScope
  readonly bodySnippet?: string
  readonly requestProblem?: RequestProblem
  readonly filter?: FilterReason
  readonly sent?: SentParameters
  readonly account?: 'codex' | 'copilot'

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
    this.requestProblem = options.requestProblem
    this.filter = options.filter
    this.sent = options.sent
    this.account = options.account
  }
}
