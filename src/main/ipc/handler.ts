import * as v from 'valibot'
import { fail, ok, type FieldError, type Result } from '../../shared/result'
import { StorageError } from '../storage/errors'

export type RawHandler<O> = (raw: unknown) => Result<O> | Promise<Result<O>>

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
