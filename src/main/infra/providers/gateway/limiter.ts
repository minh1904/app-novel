import { ProviderError } from '../types'

/**
 * At most `limit` calls in flight; the rest wait their turn, in the order they came.
 *
 * There is one per **model entry** (design D9 of change `ai-model-settings`), shared by the translation and
 * the chat that use that entry. The key quota behind it is a different thing, kept per connection by the
 * key scheduler, so two entries of one connection queue separately but still see each other's 429s.
 *
 * Today every caller works one call at a time, so the limit is rarely reached. It exists so that the
 * job runner, which will run several at once, cannot overrun a free tier by accident, and so that the
 * guarantee is already tested when it arrives (design D6 of change `ai-gateway`). The person can set it
 * per entry, and change it while calls are running: see `setLimit`.
 */
export class Limiter {
  private active = 0
  private limit: number
  private readonly waiting: Array<{
    grant: () => void
    onAbort: () => void
  }> = []

  constructor(limit: number) {
    Limiter.check(limit)
    this.limit = limit
  }

  private static check(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('The limit must be a whole number of at least 1.')
    }
  }

  /**
   * Changes the limit while calls may be running or waiting. Lowering it **never cuts a call that is already
   * running**: nothing new is let in until the number running falls below the new limit. Raising it lets
   * the ones waiting in at once, in the order they came.
   */
  setLimit(limit: number): void {
    Limiter.check(limit)
    this.limit = limit
    this.drain()
  }

  /** The limit in force now. For tests and for showing; not for decisions. */
  get current(): number {
    return this.limit
  }

  private drain(): void {
    while (this.active < this.limit && this.waiting.length > 0) this.waiting.shift()?.grant()
  }

  /** Calls running right now. For tests and for showing progress; not for decisions. */
  get inFlight(): number {
    return this.active
  }

  /** Calls waiting for a place. */
  get queued(): number {
    return this.waiting.length
  }

  /**
   * Resolves with the function that gives the place back, once there is one. Rejects with `cancelled` if
   * the signal aborts **while waiting**: such a call is taken out of the line and never sent. Once the
   * place is granted, aborting is the caller's business (its own request is what gets aborted).
   */
  acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new ProviderError('cancelled', 'Yêu cầu đã bị hủy.'))
    if (this.active < this.limit) {
      this.active++
      return Promise.resolve(this.releaser())
    }
    return new Promise((resolve, reject) => {
      const entry = {
        grant: () => {
          signal?.removeEventListener('abort', entry.onAbort)
          this.active++
          resolve(this.releaser())
        },
        onAbort: () => {
          const at = this.waiting.indexOf(entry)
          if (at >= 0) this.waiting.splice(at, 1)
          reject(new ProviderError('cancelled', 'Yêu cầu đã bị hủy.'))
        }
      }
      signal?.addEventListener('abort', entry.onAbort, { once: true })
      this.waiting.push(entry)
    })
  }

  /** A release that can be called twice without giving away two places. */
  private releaser(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.active--
      this.drain()
    }
  }
}
