import type { SourceLanguage } from '../../shared/library'

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
  | 'auth'
  | 'refused'
  | 'invalid_response'
  | 'cancelled'

/** Whether trying the same request again can succeed, by kind. */
const RETRYABLE: Record<ProviderErrorKind, boolean> = {
  rate_limited: true,
  network: true,
  invalid_response: true,
  auth: false,
  refused: false,
  cancelled: false
}

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly retryable: boolean
  /** How long the provider asked us to wait, when it said (rate limits). */
  readonly retryAfterMs?: number

  constructor(kind: ProviderErrorKind, message: string, options: { retryAfterMs?: number } = {}) {
    super(message)
    this.name = 'ProviderError'
    this.kind = kind
    this.retryable = RETRYABLE[kind]
    this.retryAfterMs = options.retryAfterMs
  }
}
