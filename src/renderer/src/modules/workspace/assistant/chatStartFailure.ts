import type { ChatError } from '../../../../../shared/contracts/aiChat'
import type { ErrorCode } from '../../../../../shared/contracts/result'

/**
 * Xử lý lỗi khi yêu cầu gửi câu hỏi bị từ chối từ tiến trình chính trước khi gọi nhà cung cấp AI.
 * Phân loại các lỗi kết nối/hệ thống có thể thử lại hoặc lỗi yêu cầu không hợp lệ.
 */
export function startFailure(code: ErrorCode, message: string): ChatError {
  if (code === 'io' || code === 'internal') {
    return { kind: 'network', message, retryable: true, recoverAt: null }
  }
  if (code === 'cancelled') return { kind: 'cancelled', message, retryable: false, recoverAt: null }
  return { kind: 'invalid_request', message, retryable: false, recoverAt: null }
}
