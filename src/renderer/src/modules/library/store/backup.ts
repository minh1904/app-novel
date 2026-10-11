import { describeBackupError } from '../catalog/describeError'

export type BackupOutcome =
  | { kind: 'saved'; path: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string }

/**
 * Sao lưu tác phẩm thông qua hộp thoại lưu tệp của hệ thống. Người dùng hủy không tính là lỗi,
 * kết quả sẽ trả về trạng thái cancelled và không thông báo lỗi.
 */
export async function backupWork(workId: string): Promise<BackupOutcome> {
  const result = await window.mira.backup.export(workId)
  if (result.ok) return { kind: 'saved', path: result.value.path }
  if (result.error.code === 'cancelled') return { kind: 'cancelled' }
  return { kind: 'failed', message: describeBackupError(result.error) }
}

export function savedMessage(path: string): string {
  return 'Đã sao lưu tác phẩm vào ' + path
}
