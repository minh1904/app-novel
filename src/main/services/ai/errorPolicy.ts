import type { TranslateErrorKind, TranslateFailure } from '../../../shared/contracts/aiTranslate'
import type { ProviderError, RequestProblem, SentParameters } from '../../infra/providers/types'

/**
 * What each task does with each kind of failure, decided in one place in main (D5 of change
 * `provider-error-reasons`).
 *
 * The provider's classification says **what happened**; this table says **what the task may do about it**.
 * The renderer follows `haltsRun` and `retryable` as given and does not judge by `kind` itself, so the
 * policy can change without touching the screens, and it is tested here.
 */

export type ErrorTask = 'translate' | 'chat' | 'probe'

/**
 * A provider or translation failure kind, plus the two batch outcomes that are not a thrown error: some
 * segments blocked by the filter, some segments missing after the repair round.
 */
export type PolicyKind = TranslateErrorKind | 'refused_segments' | 'missing_segments'

export interface ErrorPolicy {
  /** Translation: stop the rest of the chapter's batches. */
  haltsRun: boolean
  /** Chat: asking the same thing again can succeed. */
  retryable: boolean
  /** Connection check: which storage error code the failure becomes; `null` when it never reaches there. */
  probeCode: 'validation' | 'io' | null
  /**
   * Another model could get past it: the dialog offers "Dịch tiếp bằng …" with the first fallback of
   * Settings (change `hermes-settings-modal`, task 4.6). The chapter is not switched on its own.
   */
  fallback: boolean
}

const TABLE: Record<PolicyKind, ErrorPolicy> = {
  invalid_request: { haltsRun: true, retryable: false, probeCode: 'validation', fallback: false },
  auth: { haltsRun: true, retryable: false, probeCode: 'validation', fallback: false },
  quota: { haltsRun: true, retryable: true, probeCode: 'io', fallback: true },
  rate_limited: { haltsRun: true, retryable: true, probeCode: 'io', fallback: true },
  network: { haltsRun: false, retryable: true, probeCode: 'io', fallback: true },
  timeout: { haltsRun: false, retryable: true, probeCode: 'io', fallback: true },
  invalid_response: { haltsRun: false, retryable: true, probeCode: 'io', fallback: true },
  // The whole call blocked: retrying the same content is pointless, but other batches may pass.
  refused: { haltsRun: false, retryable: false, probeCode: 'validation', fallback: false },
  // A few segments of a batch blocked: the rest of the chapter goes on.
  refused_segments: { haltsRun: false, retryable: false, probeCode: null, fallback: false },
  missing_segments: { haltsRun: false, retryable: true, probeCode: null, fallback: false },
  conflict: { haltsRun: true, retryable: false, probeCode: null, fallback: false },
  // The run's call budget is spent: the other batches keep their reserved main call, and a retry of the
  // failed segments is granted a fresh share, so neither stopping nor "no use retrying" is right.
  budget_exhausted: { haltsRun: false, retryable: true, probeCode: null, fallback: false },
  cancelled: { haltsRun: true, retryable: false, probeCode: null, fallback: false }
}

/** The policy for one failure in one task. The table is the same for every task; the task picks its field. */
export function taskErrorPolicy(_task: ErrorTask, kind: PolicyKind): ErrorPolicy {
  return TABLE[kind]
}

/** A translation batch failure with main's decision on whether it stops the chapter's run. */
export function withPolicy(
  core: Omit<TranslateFailure, 'haltsRun' | 'fallback'>
): TranslateFailure {
  const policy = taskErrorPolicy('translate', core.kind)
  return { ...core, haltsRun: policy.haltsRun, fallback: policy.fallback }
}

function describeSent(sent: SentParameters): string[] {
  const parts: string[] = []
  if (sent.reasoningEffort !== undefined) parts.push('reasoning_effort: ' + sent.reasoningEffort)
  if (sent.temperature !== undefined) parts.push('temperature: ' + sent.temperature)
  if (sent.topP !== undefined) parts.push('top_p: ' + sent.topP)
  if (sent.maxTokens !== undefined) parts.push('giới hạn đầu ra: ' + sent.maxTokens)
  if (sent.extraBodyKeys.length > 0) parts.push('extra_body: ' + sent.extraBodyKeys.join(', '))
  if (sent.responseFormat) parts.push('response_format')
  return parts
}

/**
 * The person-facing sentence for a request the provider would not take: its own words, what Mira sent, and
 * where to look. Names only what is not secret (`SentParameters` carries no values of `extra_body` and no
 * headers).
 */
export function describeInvalidRequest(
  providerMessage: string,
  sent?: SentParameters,
  problem?: RequestProblem
): string {
  const said = providerMessage.trim().replace(/[.。]$/, '')
  if (problem === 'too_large') {
    return (
      'Yêu cầu quá lớn so với giới hạn đầu vào của model: ' +
      said +
      '. Thử lô nhỏ hơn hoặc model có ngữ cảnh dài hơn.'
    )
  }
  const parts = sent === undefined ? [] : describeSent(sent)
  return (
    'Nhà cung cấp không nhận yêu cầu: ' +
    said +
    '.' +
    (parts.length > 0 ? ' Mira đã gửi ' + parts.join('; ') + '.' : '') +
    ' Kiểm tra cài đặt model.'
  )
}

/** The message a provider error is shown with. Only a request error is reworded. */
export function describeProviderError(error: ProviderError): string {
  if (error.kind !== 'invalid_request') return error.message
  return describeInvalidRequest(error.message, error.sent, error.requestProblem)
}
