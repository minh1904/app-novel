import type { ModelRef } from '../../../shared/contracts/aiPreferences'
import { ProviderError } from '../../infra/providers/types'

/**
 * When Mira moves on to the next model of Settings › Model › Dự phòng (spec `model-defaults`, design D7 of
 * change `hermes-settings-modal`). Only failures another model can fix: the quota of every key is spent, the
 * model is missing or not allowed, or the provider stays unreachable after the gateway's own retries. A
 * refusal, a wrong key (fix the key, not the model), a malformed request or a cancel never does.
 *
 * Kept as a function over `ProviderError` rather than a field on it, so the transport stays unaware of a
 * product rule.
 */
const MODEL_GONE =
  /model[^.]{0,40}(not[ _]?found|does not exist|not exist|not supported|not available|unknown|no access|permission)|no such model|invalid model/i

export function shouldFallback(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false
  switch (error.kind) {
    case 'quota':
    case 'rate_limited':
    case 'network':
    case 'timeout':
    case 'invalid_response':
      return true
    case 'invalid_request':
      return (
        error.requestProblem === undefined &&
        (error.status === 404 ||
          MODEL_GONE.test(error.bodySnippet ?? '') ||
          MODEL_GONE.test(error.message))
      )
    default:
      return false
  }
}

/** Why the model was left, in a few words for the line on the turn. */
export function fallbackReason(error: unknown): string {
  if (!(error instanceof ProviderError)) return 'lỗi không rõ'
  switch (error.kind) {
    case 'quota':
      return 'hết hạn mức'
    case 'rate_limited':
      return 'bị giới hạn tốc độ'
    case 'timeout':
      return 'quá thời gian chờ'
    case 'network':
      return 'không kết nối được'
    case 'invalid_response':
      return 'trả về phản hồi hỏng'
    case 'invalid_request':
      return 'model không tồn tại hoặc không được phép'
    default:
      return error.kind
  }
}

/** The fallbacks to try after `primary`, without the primary itself and without repeats. */
export function fallbackChain(primary: ModelRef, fallbacks: readonly ModelRef[]): ModelRef[] {
  const seen = new Set([primary.entryId])
  return fallbacks.filter((ref) => {
    if (seen.has(ref.entryId)) return false
    seen.add(ref.entryId)
    return true
  })
}

/** "Đã chuyển sang Y vì X hết hạn mức": the line a turn or a batch keeps when it moved on. */
export function fallbackLine(from: string, to: string, error: unknown): string {
  return 'Đã chuyển sang ' + to + ' vì ' + from + ' ' + fallbackReason(error) + '.'
}
