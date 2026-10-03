import type { ErrorCode } from '../../../shared/result'

export class StorageError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
    this.code = code
  }
}

/** Maps SQLite failures to categories the UI can act on; everything unknown stays `io`. */
export function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error

  const message = error instanceof Error ? error.message : String(error)
  const sqliteCode = (error as { errcode?: number } | null)?.errcode
  // Primary result codes are the low byte of the extended code.
  const primary = typeof sqliteCode === 'number' ? sqliteCode & 0xff : undefined

  if (primary === 11 || primary === 26)
    return new StorageError('corrupt', message, { cause: error })
  return new StorageError('io', message, { cause: error })
}
