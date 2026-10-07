import { describe, expect, it } from 'vitest'
import { startFailure } from './chatStartFailure'

describe('startFailure', () => {
  it('never calls a send main turned down "content refused"', () => {
    expect(startFailure('validation', 'Câu hỏi trống.')).toEqual({
      kind: 'invalid_request',
      message: 'Câu hỏi trống.',
      retryable: false,
      recoverAt: null
    })
    expect(startFailure('not_found', 'Không có chương.').kind).toBe('invalid_request')
  })

  it('lets a storage hiccup be tried again', () => {
    expect(startFailure('io', 'Không đọc được kho.')).toMatchObject({
      kind: 'network',
      retryable: true
    })
  })
})
