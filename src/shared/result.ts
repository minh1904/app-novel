/** Error categories that cross the IPC boundary. Electron drops custom error classes, so failures travel as data. */
export type ErrorCode =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'unsupported_version'
  | 'corrupt'
  | 'io'
  | 'cancelled'
  | 'untrusted_sender'
  | 'internal'

export interface FieldError {
  /** Dot-separated path of the offending input field, e.g. "title" or "patch.status". */
  path: string
  message: string
}

export interface IpcError {
  code: ErrorCode
  message: string
  details?: FieldError[]
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: IpcError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function fail(code: ErrorCode, message: string, details?: FieldError[]): Result<never> {
  return { ok: false, error: details ? { code, message, details } : { code, message } }
}
