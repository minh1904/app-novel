import type { IpcError } from '../../../../shared/result'

/** An error from the main process in words a user can act on. */
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
 * Backup and restore errors already carry a full sentence written for the user ("not a Mira backup",
 * "made by a newer version"), so those are shown as they are; file system errors still get context.
 */
export function describeBackupError(error: IpcError): string {
  return error.code === 'corrupt' ||
    error.code === 'unsupported_version' ||
    error.code === 'validation'
    ? error.message
    : describe(error)
}
