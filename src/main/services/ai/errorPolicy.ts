import type { TranslateErrorKind, TranslateFailure } from '../../../shared/contracts/aiTranslate'
import type { ProviderError, RequestProblem, SentParameters } from '../../infra/providers/types'

/**
 * Quy định xử lý tập trung cho từng loại lỗi phát sinh trong các tác vụ AI (dịch thuật, chat, probe).
 *
 * Phân loại của nhà cung cấp xác định chuyện gì đã xảy ra; bảng này quy định tác vụ phản ứng thế nào.
 * Giao diện tuân thủ các cờ `haltsRun` và `retryable` do chính sách trả về mà không tự xét theo `kind`.
 */

export type ErrorTask = 'translate' | 'chat' | 'probe'

/**
 * Các loại lỗi từ nhà cung cấp hoặc tiến trình dịch thuật, bao gồm cả các kết quả phân đoạn bị chặn hoặc bị thiếu sau sửa lỗi.
 */
export type PolicyKind = TranslateErrorKind | 'refused_segments' | 'missing_segments'

export interface ErrorPolicy {
  /** Dịch thuật: dừng toàn bộ các lô còn lại của chương. */
  haltsRun: boolean
  /** Chat: có thể thử lại với cùng nội dung câu hỏi. */
  retryable: boolean
  /** Kiểm tra kết nối: mã lỗi lưu trữ tương ứng; `null` nếu không liên quan. */
  probeCode: 'validation' | 'io' | null
  /**
   * Có thể khắc phục bằng model dự phòng: hiển thị gợi ý tiếp tục bằng model khác.
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
  // Toàn bộ lệnh gọi bị chặn: thử lại cùng nội dung sẽ vô ích, nhưng các lô khác vẫn có thể tiếp tục.
  refused: { haltsRun: false, retryable: false, probeCode: 'validation', fallback: false },
  // Một vài phân đoạn trong lô bị từ chối: phần còn lại của chương vẫn tiếp tục dịch.
  refused_segments: { haltsRun: false, retryable: false, probeCode: null, fallback: false },
  missing_segments: { haltsRun: false, retryable: true, probeCode: null, fallback: false },
  conflict: { haltsRun: true, retryable: false, probeCode: null, fallback: false },
  // Hết ngân sách lượt gọi: các lô khác vẫn giữ lượt gọi chính đã cấp trước, cho phép thử lại phân đoạn lỗi.
  budget_exhausted: { haltsRun: false, retryable: true, probeCode: null, fallback: false },
  cancelled: { haltsRun: true, retryable: false, probeCode: null, fallback: false }
}

/** Lấy chính sách xử lý lỗi cho từng loại sự cố. */
export function taskErrorPolicy(_task: ErrorTask, kind: PolicyKind): ErrorPolicy {
  return TABLE[kind]
}

/** Gắn chính sách tương ứng vào thông tin lỗi của lô dịch thuật. */
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
 * Tạo câu thông báo thân thiện cho lỗi yêu cầu bị từ chối: hiển thị phản hồi từ nhà cung cấp và tham số đã gửi (không chứa dữ liệu nhạy cảm).
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

/** Chuỗi mô tả lỗi từ nhà cung cấp; chuẩn hóa lại thông báo đối với lỗi invalid_request. */
export function describeProviderError(error: ProviderError): string {
  if (error.kind !== 'invalid_request') return error.message
  return describeInvalidRequest(error.message, error.sent, error.requestProblem)
}
