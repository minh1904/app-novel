import type { ModelRef } from '../../../shared/contracts/aiPreferences'
import { ProviderError } from '../../infra/providers/types'

/**
 * Xác định khi nào cần chuyển sang model tiếp theo trong danh sách dự phòng.
 * Chỉ áp dụng cho các lỗi mà model khác có thể khắc phục: hết hạn mức mọi khóa API,
 * model không tồn tại hoặc không có quyền truy cập, hoặc nhà cung cấp mất kết nối sau khi đã thử lại.
 * Không dự phòng đối với khóa sai (cần sửa khóa), yêu cầu sai định dạng hoặc bị hủy.
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

/** Lý do chuyển sang model khác, dùng hiển thị ngắn gọn trên lượt AI hoặc tiến trình. */
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

/** Danh sách model dự phòng thử tiếp theo sau model chính, loại bỏ chính nó và các mục trùng lặp. */
export function fallbackChain(primary: ModelRef, fallbacks: readonly ModelRef[]): ModelRef[] {
  const seen = new Set([primary.entryId])
  return fallbacks.filter((ref) => {
    if (seen.has(ref.entryId)) return false
    seen.add(ref.entryId)
    return true
  })
}

/** Tạo câu thông báo khi chuyển đổi model: 'Đã chuyển sang Y vì X hết hạn mức.'. */
export function fallbackLine(from: string, to: string, error: unknown): string {
  return 'Đã chuyển sang ' + to + ' vì ' + from + ' ' + fallbackReason(error) + '.'
}
