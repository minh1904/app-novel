import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderError, type ProviderErrorKind } from '../types'
import { DEFAULT_RETRY, abortableSleep, decideRetry } from './retryPolicy'

const middle = (): number => 0.5 // a jitter of exactly 0

const error = (kind: ProviderErrorKind, retryAfterMs?: number): ProviderError =>
  new ProviderError(kind, 'x', { retryAfterMs })

afterEach(() => {
  vi.useRealTimers()
})

describe('decideRetry', () => {
  it('retries transient trouble on the wire: network and timeout', () => {
    expect(decideRetry(error('network'), 0, DEFAULT_RETRY, middle)).toEqual({
      retry: true,
      delayMs: 500
    })
    expect(decideRetry(error('timeout'), 0, DEFAULT_RETRY, middle)).toEqual({
      retry: true,
      delayMs: 500
    })
  })

  it('waits twice as long each time, up to the ceiling', () => {
    const delays = [0, 1, 2, 3, 4, 5].map((done) => {
      const decision = decideRetry(
        error('network'),
        done,
        { ...DEFAULT_RETRY, maxRetries: 10 },
        middle
      )
      return decision.retry ? decision.delayMs : null
    })
    expect(delays).toEqual([500, 1_000, 2_000, 4_000, 8_000, 10_000])
  })

  it('gives up after the allowed number of retries', () => {
    expect(decideRetry(error('network'), 1, DEFAULT_RETRY, middle).retry).toBe(true)
    expect(decideRetry(error('network'), 2, DEFAULT_RETRY, middle).retry).toBe(false)
  })

  it('spreads the wait by the jitter, in both directions, and never past the ceiling', () => {
    const wait = (random: number): number => {
      const decision = decideRetry(error('network'), 0, DEFAULT_RETRY, () => random)
      return decision.retry ? decision.delayMs : -1
    }
    expect(wait(0)).toBe(400)
    expect(wait(1)).toBe(600)
    const capped = decideRetry(error('network'), 4, { ...DEFAULT_RETRY, maxRetries: 9 }, () => 1)
    expect(capped.retry && capped.delayMs).toBeLessThanOrEqual(DEFAULT_RETRY.maxDelayMs)
  })

  it("does not retry what is the key's trouble or the content's trouble", () => {
    for (const kind of [
      'rate_limited',
      'quota',
      'auth',
      'refused',
      'invalid_request',
      'invalid_response',
      'cancelled'
    ] as const) {
      expect(decideRetry(error(kind), 0, DEFAULT_RETRY, middle).retry).toBe(false)
    }
    expect(decideRetry(new Error('boom'), 0, DEFAULT_RETRY, middle).retry).toBe(false)
  })

  it('lets the provider lengthen the wait but never shorten it', () => {
    expect(decideRetry(error('network', 3_000), 0, DEFAULT_RETRY, middle)).toEqual({
      retry: true,
      delayMs: 3_000
    })
    expect(decideRetry(error('network', 100), 0, DEFAULT_RETRY, middle)).toEqual({
      retry: true,
      delayMs: 500
    })
  })

  it('does not sleep for a provider that asks for longer than the ceiling', () => {
    expect(decideRetry(error('network', 60_000), 0, DEFAULT_RETRY, middle)).toEqual({
      retry: false
    })
  })
})

describe('abortableSleep', () => {
  it('resolves after the time has passed', async () => {
    vi.useFakeTimers()
    let done = false
    const sleeping = abortableSleep(1_000).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await sleeping
    expect(done).toBe(true)
  })

  it('ends at once with `cancelled` when the signal aborts during the wait', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const sleeping = abortableSleep(60_000, controller.signal).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(10)
    controller.abort()
    expect(await sleeping).toMatchObject({ kind: 'cancelled' })
    // The timer was cleared, so nothing is left to fire a minute later.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not even start when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(abortableSleep(1_000, controller.signal)).rejects.toMatchObject({
      kind: 'cancelled'
    })
  })
})
