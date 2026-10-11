import type { IpcError } from '../../../../../shared/contracts/result'

/** Diễn giải lỗi từ tiến trình chính thành câu thông báo rõ ràng cho người dùng. */
export function describe(error: IpcError): string {
  switch (error.code) {
    case 'not_found':
      return 'Không tìm thấy tác phẩm; có thể tệp đã bị xóa hoặc di chuyển.'
    case 'unsupported_version':
      return error.message
    case 'corrupt':
      return 'Dữ liệu bị hỏng. ' + error.message
    case 'io':
      return 'Không đọc hoặc ghi được tệp. ' + error.message
    case 'validation':
      return error.message
    default:
      return error.message
  }
}

/**
 * Các lỗi sao lưu và phục hồi có sẵn thông điệp rõ ràng thì hiển thị nguyên văn;
 * các lỗi hệ thống tệp khác được diễn giải qua hàm describe.
 */
export function describeBackupError(error: IpcError): string {
  return error.code === 'corrupt' ||
    error.code === 'unsupported_version' ||
    error.code === 'validation'
    ? error.message
    : describe(error)
}
