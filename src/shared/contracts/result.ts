/** Các phân loại mã lỗi truyền qua IPC. */
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
  /** Đường dẫn phân cấp trường lỗi (dấu chấm ngăn cách), ví dụ "title" hoặc "patch.status". */
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
