import * as v from 'valibot'
import type { EventChannel } from '../../shared/channels'
import { fail, ok, type FieldError, type Result } from '../../shared/result'
import { StorageError } from '../infra/storage/errors'

/**
 * Nơi main đẩy sự kiện về: đúng cửa sổ đã gọi, không phải "một cửa sổ nào đó".
 *
 * Khai hẹp lại `webContents` thành ba việc để tầng handler không import Electron — đó là điều kiện
 * để mọi test ở `src/main/ipc/` chạy được mà không cần dựng một cửa sổ thật.
 */
export interface ChunkSink {
  send(channel: EventChannel, payload: unknown): void
  /** Cửa sổ đã đóng; gửi vào đó sẽ ném "object has been destroyed". */
  isDestroyed(): boolean
  /** Gọi `callback` khi cửa sổ biến mất, để chủ nó dọn việc đang chạy. */
  onDestroyed(callback: () => void): void
}

/** Sink rỗng cho các lời gọi không có cửa sổ (test, và mọi kênh không đẩy sự kiện). */
export const noChunkSink: ChunkSink = {
  send: () => {},
  isDestroyed: () => false,
  onDestroyed: () => {}
}

/**
 * Hầu hết handler chỉ cần dữ liệu gửi lên, nên `sink` **tùy chọn ở cả hai đầu**: handler khai một
 * tham số vẫn khớp kiểu này, và chỗ gọi vẫn truyền được một đối số. Bỏ dấu `?` sẽ làm mọi lời gọi
 * một đối số thành lỗi biên dịch — gồm hàng chục chỗ trong test gọi handler trực tiếp.
 */
export type RawHandler<O> = (raw: unknown, sink?: ChunkSink) => Result<O> | Promise<Result<O>>

function failureOf(error: unknown): Result<never> {
  if (error instanceof StorageError) return fail(error.code, error.message)
  console.error('Lỗi không mong đợi trong IPC handler:', error)
  return fail('internal', 'Đã xảy ra lỗi không mong đợi.')
}

/**
 * Like createHandler, for work that has to wait (system dialogs). Input is validated the same way
 * and every failure still comes back as data.
 */
export function createAsyncHandler<S extends v.GenericSchema, O>(
  schema: S | null,
  handler: (input: v.InferOutput<S>) => Promise<O>
): RawHandler<O> {
  return async (raw) => {
    let input: v.InferOutput<S>
    if (schema === null) {
      input = undefined
    } else {
      const parsed = v.safeParse(schema, raw)
      if (!parsed.success) {
        const details: FieldError[] = parsed.issues.map((issue) => ({
          path: v.getDotPath(issue) ?? '',
          message: issue.message
        }))
        return fail('validation', 'Dữ liệu gửi lên không hợp lệ.', details)
      }
      input = parsed.output
    }
    try {
      return ok(await handler(input))
    } catch (error) {
      return failureOf(error)
    }
  }
}

/**
 * Như `createHandler`, cho kênh cần biết **cửa sổ nào đã gọi** — tức kênh bắt đầu một việc rồi đẩy
 * sự kiện về. Chỉ lượt chat dùng tới; tách riêng để mọi handler khác giữ nguyên chữ ký một tham số.
 */
export function createSinkHandler<S extends v.GenericSchema, O>(
  schema: S | null,
  handler: (input: v.InferOutput<S>, sink: ChunkSink) => O
): RawHandler<O> {
  return (raw, sink) => {
    let input: v.InferOutput<S>
    if (schema === null) {
      input = undefined
    } else {
      const parsed = v.safeParse(schema, raw)
      if (!parsed.success) {
        const details: FieldError[] = parsed.issues.map((issue) => ({
          path: v.getDotPath(issue) ?? '',
          message: issue.message
        }))
        return fail('validation', 'Dữ liệu gửi lên không hợp lệ.', details)
      }
      input = parsed.output
    }
    try {
      return ok(handler(input, sink ?? noChunkSink))
    } catch (error) {
      return failureOf(error)
    }
  }
}

/**
 * Wraps a handler so that whatever the renderer sends is validated first and every failure comes
 * back as data. Electron would otherwise flatten thrown errors to a bare message string.
 * Pass `null` as the schema for channels that take no input.
 */
export function createHandler<S extends v.GenericSchema, O>(
  schema: S | null,
  handler: (input: v.InferOutput<S>) => O
): RawHandler<O> {
  return (raw) => {
    let input: v.InferOutput<S>
    if (schema === null) {
      input = undefined
    } else {
      const parsed = v.safeParse(schema, raw)
      if (!parsed.success) {
        const details: FieldError[] = parsed.issues.map((issue) => ({
          path: v.getDotPath(issue) ?? '',
          message: issue.message
        }))
        return fail('validation', 'Dữ liệu gửi lên không hợp lệ.', details)
      }
      input = parsed.output
    }

    try {
      return ok(handler(input))
    } catch (error) {
      if (error instanceof StorageError) return fail(error.code, error.message)
      console.error('Lỗi không mong đợi trong IPC handler:', error)
      return fail('internal', 'Đã xảy ra lỗi không mong đợi.')
    }
  }
}
