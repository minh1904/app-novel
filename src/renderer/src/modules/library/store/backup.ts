import { describeBackupError } from '../catalog/describeError'

export type BackupOutcome =
  | { kind: 'saved'; path: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string }

/**
 * Backs a work up through the system "save as" dialog. Cancelling is not an error: the user simply
 * changed their mind, so it comes back as its own outcome and nothing is reported.
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
