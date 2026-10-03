import { describe, expect, it } from 'vitest'
import { ProviderError, type ProviderErrorKind } from './types'

describe('ProviderError', () => {
  it('says which kinds are worth trying again', () => {
    const retryable = (kind: ProviderErrorKind): boolean => new ProviderError(kind, 'x').retryable
    expect(
      ['rate_limited', 'network', 'timeout', 'invalid_response'].map((k) =>
        retryable(k as ProviderErrorKind)
      )
    ).toEqual([true, true, true, true])
    expect(
      ['auth', 'quota', 'refused', 'cancelled'].map((k) => retryable(k as ProviderErrorKind))
    ).toEqual([false, false, false, false])
  })

  it('carries what was known about the response and nothing it was not', () => {
    const error = new ProviderError('rate_limited', 'slow down', {
      retryAfterMs: 5_000,
      status: 429,
      receivedAt: 123,
      quotaScope: 'minute',
      bodySnippet: '{"error":{}}'
    })
    expect(error).toMatchObject({
      kind: 'rate_limited',
      retryAfterMs: 5_000,
      status: 429,
      receivedAt: 123,
      quotaScope: 'minute',
      bodySnippet: '{"error":{}}'
    })
    const bare = new ProviderError('cancelled', 'stopped')
    expect(bare.status).toBeUndefined()
    expect(bare.bodySnippet).toBeUndefined()
  })
})
