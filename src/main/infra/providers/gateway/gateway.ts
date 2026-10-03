import type { ClassifiedError } from '../classifyError'
import { ProviderError } from '../types'
import type { KeyLease, KeyOutcome, KeySource } from './keys'
import { KeyScheduler } from './keyScheduler'
import { Limiter } from './limiter'
import { RatePacer } from './ratePacer'
import { DEFAULT_RETRY, abortableSleep, decideRetry, type RetryOptions } from './retryPolicy'

/**
 * Everything about *how* a call gets made that is not the call itself: which key, how many at once,
 * when to try again, and what each result says about the key. One owner for all of it (design D3–D5 of
 * change `ai-gateway`), so the layers around it do not each retry on their own and multiply the tries.
 *
 * It does not know what is being asked. The caller gives it a function that makes one attempt with a key;
 * the gateway decides when that function runs, with which key, and how often.
 *
 * The rules, in the order a call meets them:
 *  1. Take a place from the entry's limiter. A call that is cancelled while it waits is never sent.
 *  2. Wait for its turn by the entry's RPM, if one is set; and again before every later attempt, because
 *     each attempt is a real request. Cancel ends the wait. Done before taking a key, so a call that is
 *     only waiting for its turn holds no key (and no probe).
 *  3. Take a key. If every key is frozen, say so with the earliest time one comes back (or, for a caller
 *     that opted in with `waitForKeys`, wait for it).
 *  4. Make the call. Its result is reported against the key **exactly once**, whatever happens.
 *  4. On failure: trouble that belongs to the key (rate limit, empty account, wrong key) moves to the
 *     next key **at once, without waiting**; transient trouble on the wire (network, timeout) is retried
 *     with a backoff that Cancel can interrupt; anything else goes straight to the caller.
 *  5. A stream is never retried or moved once it has produced anything: the reader already has that
 *     text, and starting over would repeat it.
 */

/** How many calls one connection runs at the same time. Callers work one at a time today, so this is a guard, not a throttle. */
export const DEFAULT_CONCURRENCY = 4

/** Safety stop on key switching. Each failure freezes or retires a key, so the loop ends on its own; this covers a bug. */
const MAX_KEY_SWITCHES = 16

export interface GatewayOptions {
  keys: KeySource
  limiter: Limiter
  /** Spaces the attempts by the entry's RPM. Without one, attempts are not paced. */
  pacer?: RatePacer
  now: () => number
  retry?: Partial<RetryOptions>
  /** Tests replace these two so a backoff takes no real time and the jitter is exact. */
  random?: () => number
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
  /**
   * When every key is frozen: wait until one comes back (`true`) or fail at once (`false`, the default).
   * Failing is what the interactive features want. A long job will want to wait; it passes `true`.
   */
  waitForKeys?: boolean
}

/**
 * An error as the key layer reads it. Cancel and timeout are **neutral**: a call that did not finish
 * proves nothing about the key, so blaming it is unfair and calling it good is untrue (D4 of `ai-chat`).
 */
export function outcomeFor(error: ProviderError): KeyOutcome {
  if (error.kind === 'cancelled' || error.kind === 'timeout') return 'neutral'
  const classified: ClassifiedError = { kind: error.kind, message: error.message }
  if (error.retryAfterMs !== undefined) classified.retryAfterMs = error.retryAfterMs
  if (error.quotaScope !== undefined) classified.quotaScope = error.quotaScope
  if (error.status !== undefined) classified.status = error.status
  if (error.receivedAt !== undefined) classified.receivedAt = error.receivedAt
  if (error.bodySnippet !== undefined) classified.bodySnippet = error.bodySnippet
  return classified
}

/**
 * Holds a lease until it is reported once. A lease that ends without anyone reporting it (the reader
 * walked away from a stream, something unexpected was thrown) is reported `neutral` in a `finally` —
 * otherwise an abandoned probe would leave its key "being probed" for good.
 */
class LeaseGuard {
  private settled = false

  constructor(
    private readonly keys: KeySource,
    private readonly lease: KeyLease
  ) {}

  async settle(outcome: KeyOutcome): Promise<void> {
    if (this.settled) return
    this.settled = true
    if (this.lease.id !== null) await this.keys.report(this.lease, outcome)
  }

  async settleFailure(error: unknown): Promise<void> {
    if (error instanceof ProviderError) await this.settle(outcomeFor(error))
  }
}

/** Trouble that is about the key and not about the request: another key may well succeed. */
function isKeyTrouble(error: ProviderError): boolean {
  return error.kind === 'rate_limited' || error.kind === 'quota' || error.kind === 'auth'
}

interface Progress {
  retries: number
  switches: number
}

export class Gateway {
  private readonly retry: RetryOptions
  private readonly random: () => number
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>

  constructor(private readonly options: GatewayOptions) {
    this.retry = { ...DEFAULT_RETRY, ...options.retry }
    this.random = options.random ?? Math.random
    this.sleep = options.sleep ?? abortableSleep
  }

  /** One call with a key, retried and moved between keys as the rules say. */
  async call<T>(attempt: (lease: KeyLease) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const release = await this.options.limiter.acquire(signal)
    try {
      let lease = await this.acquireKey(signal)
      const progress: Progress = { retries: 0, switches: 0 }
      for (;;) {
        const guard = new LeaseGuard(this.options.keys, lease)
        try {
          const result = await attempt(lease)
          await guard.settle('ok')
          return result
        } catch (error) {
          await guard.settleFailure(error)
          lease = await this.next(error, lease, progress, signal)
        } finally {
          await guard.settle('neutral')
        }
      }
    } finally {
      release()
    }
  }

  /**
   * A streamed call. `isFinal` names the event that proves the answer finished cleanly, so the key is
   * reported good *before* that last event is handed over; without it the key is reported when the
   * stream ends. Once any event has gone out, nothing is retried or moved.
   */
  async *stream<E>(
    attempt: (lease: KeyLease) => AsyncGenerator<E>,
    signal?: AbortSignal,
    isFinal?: (event: E) => boolean
  ): AsyncGenerator<E> {
    const release = await this.options.limiter.acquire(signal)
    try {
      let lease = await this.acquireKey(signal)
      const progress: Progress = { retries: 0, switches: 0 }
      for (;;) {
        const guard = new LeaseGuard(this.options.keys, lease)
        let started = false
        try {
          for await (const event of attempt(lease)) {
            started = true
            if (isFinal?.(event) === true) await guard.settle('ok')
            yield event
          }
          await guard.settle('ok')
          return
        } catch (error) {
          await guard.settleFailure(error)
          // The reader already has text from this attempt. Trying again would send it twice.
          if (started) throw error
          lease = await this.next(error, lease, progress, signal)
        } finally {
          await guard.settle('neutral')
        }
      }
    } finally {
      release()
    }
  }

  /**
   * After a failed attempt: the lease for the next attempt, or throw. Throwing is the default; the only
   * ways out of it are moving to another key and waiting out a transient failure.
   */
  private async next(
    error: unknown,
    lease: KeyLease,
    progress: Progress,
    signal: AbortSignal | undefined
  ): Promise<KeyLease> {
    if (!(error instanceof ProviderError)) throw error

    // Trouble about the key: another key at once, no waiting. A connection with no key at all has nothing
    // to switch to, and the same call would just fail the same way.
    if (isKeyTrouble(error) && lease.id !== null && progress.switches < MAX_KEY_SWITCHES) {
      progress.switches++
      try {
        return await this.acquireKey(signal)
      } catch (exhausted) {
        // Something other than "no key is left" (a store that failed): that is the real news, not the old error.
        if (!(exhausted instanceof ProviderError)) throw exhausted
        // No other key. A rate limit is reported as "every key is out of quota, until …": that tells the
        // person when to come back. A wrong key or an empty account has nothing to wait for, so the
        // real error is the useful one.
        if (error.kind === 'rate_limited' && exhausted.kind === 'rate_limited') throw exhausted
        throw exhausted.kind === 'cancelled' ? exhausted : error
      }
    }

    const decision = decideRetry(error, progress.retries, this.retry, this.random, {
      keyless: lease.id === null
    })
    if (!decision.retry) throw error
    progress.retries++
    await this.sleep(decision.delayMs, signal)
    return this.acquireKey(signal)
  }

  /**
   * A key for a call, or the error that says every key is frozen and when the first comes back. For a
   * caller that chose `waitForKeys` this waits instead, and Cancel interrupts the wait.
   */
  private async acquireKey(signal: AbortSignal | undefined): Promise<KeyLease> {
    // Once per attempt, and before the key: the wait is for a turn, not for a key.
    await this.options.pacer?.wait(signal)
    for (;;) {
      const lease = await this.options.keys.acquire()
      if (!('exhausted' in lease)) return lease
      if (this.options.waitForKeys === true && lease.recoverAt !== null) {
        await this.sleep(Math.max(0, lease.recoverAt - this.options.now()), signal)
        continue
      }
      const wait = lease.recoverAt === null ? '' : ' Thử lại sau.'
      throw new ProviderError(
        'rate_limited',
        'Mọi khóa của kết nối này đều đang hết hạn mức.' + wait,
        lease.recoverAt === null
          ? {}
          : { retryAfterMs: Math.max(0, lease.recoverAt - this.options.now()) }
      )
    }
  }
}

/** What one connection keeps between calls: what each of its keys has been through. The quota is the key's. */
export class ConnectionRuntime {
  constructor(readonly scheduler: KeyScheduler) {}
}

/**
 * What one model entry keeps between calls: who is in flight and when the next call may start. These belong
 * to the entry, not to the connection, because a person sets concurrency and RPM per entry (design D9 of
 * change `ai-model-settings`) — and the translation and the chat that use the same entry must share them.
 */
export class EntryRuntime {
  constructor(
    readonly limiter: Limiter,
    readonly pacer: RatePacer
  ) {}
}

/** What a person set on an entry for the two things this registry applies. `0` or absent is "the default". */
export interface EntryLimits {
  concurrency?: number
  rpm?: number
}

/**
 * The state that has to outlive a single call: one key scheduler per connection, one limiter and pacer per
 * model entry.
 *
 * Providers are built fresh for each call, which is fine for what they hold (the address, the model) but
 * not for this: a limiter, a pacer and a key scheduler only mean something if every call that should
 * share them meets the same one. Settings are read from the store on every call, so editing a connection
 * or an entry still takes effect at once; only this runtime state is kept, and each call hands the current
 * limits to it.
 */
export class GatewayRegistry {
  private readonly runtimes = new Map<string, ConnectionRuntime>()
  private readonly entries = new Map<string, { connectionId: string; runtime: EntryRuntime }>()

  constructor(
    private readonly now: () => number,
    private readonly concurrency: number = DEFAULT_CONCURRENCY,
    private readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
  ) {}

  runtimeFor(connectionId: string): ConnectionRuntime {
    let runtime = this.runtimes.get(connectionId)
    if (runtime === undefined) {
      runtime = new ConnectionRuntime(new KeyScheduler(this.now))
      this.runtimes.set(connectionId, runtime)
    }
    return runtime
  }

  /**
   * The limiter and pacer of an entry, with `limits` applied. Called on every call with what the entry says
   * now, so a change takes effect on the next call without anything being restarted; calls already running
   * are not cut (see `Limiter.setLimit`).
   */
  entryRuntimeFor(connectionId: string, entryId: string, limits: EntryLimits = {}): EntryRuntime {
    const concurrency =
      limits.concurrency === undefined || limits.concurrency === 0
        ? this.concurrency
        : limits.concurrency
    const rpm = limits.rpm ?? 0

    let held = this.entries.get(entryId)
    if (held === undefined) {
      held = {
        connectionId,
        runtime: new EntryRuntime(
          new Limiter(concurrency),
          new RatePacer(rpm, this.now, this.sleep)
        )
      }
      this.entries.set(entryId, held)
    }
    held.runtime.limiter.setLimit(concurrency)
    held.runtime.pacer.setRpm(rpm)
    return held.runtime
  }

  /** A deleted entry takes its limiter and pacer with it. */
  forgetEntry(entryId: string): void {
    this.entries.delete(entryId)
  }

  /** A deleted connection takes its runtime state with it, and that of every entry it had. */
  forget(connectionId: string): void {
    this.runtimes.delete(connectionId)
    for (const [entryId, held] of this.entries) {
      if (held.connectionId === connectionId) this.entries.delete(entryId)
    }
  }
}
