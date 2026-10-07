import type { ChatError } from '../../../../shared/contracts/aiChat'
import type { ErrorCode } from '../../../../shared/contracts/result'

/**
 * A send that main turned down before any provider was asked. It is never "content refused": nothing was
 * sent. A storage or line trouble may pass on a second try; anything else (bad input, a missing chapter)
 * will not until something changes.
 */
export function startFailure(code: ErrorCode, message: string): ChatError {
  if (code === 'io' || code === 'internal') {
    return { kind: 'network', message, retryable: true, recoverAt: null }
  }
  if (code === 'cancelled') return { kind: 'cancelled', message, retryable: false, recoverAt: null }
  return { kind: 'invalid_request', message, retryable: false, recoverAt: null }
}
