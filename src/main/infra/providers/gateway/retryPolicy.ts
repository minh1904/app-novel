import { ProviderError } from '../types'

/**
 * When to try a call again, and after how long. Pure decisions, no I/O: the only waiting in here is
 * `abortableSleep`, and tests replace that.
 *
 * Only **transient trouble on the wire** is retried here: `network` (which already covers HTTP 408 and
 * 5xx) and `timeout`. Trouble that belongs to the *key* — a rate limit, an empty account, a wrong key —
 * is not retried by waiting at all: the gateway moves to another key at once. Trouble in the *content* —
 * an answer that does not parse, ids missing — is the translation code's to retry, with its own count.
 * One owner per kind is the point (design D4 of change `ai-gateway`); the numbers are opencode's
 * (2 retries, 0.5 s doubling, 10 s ceiling), and pi-ai's reason for writing this by hand is the reason
 * here too: a retry timer buried in a library ignores the caller's AbortSignal, so Cancel would hang.
 */

export interface RetryOptions {
  /** Tries after the first one. */
  maxRetries: number
  baseDelayMs: number
  /** No single wait is longer than this, and a provider that asks for more is not obeyed (see `decideRetry`). */
  maxDelayMs: number
  /** Spread applied to the backoff, as a fraction: 0.2 is ±20%, so a crowd of retries does not arrive together. */
  jitter: number
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  jitter: 0.2
}

export type RetryDecision = { retry: true; delayMs: number } | { retry: false }

/**
 * Should this failure be tried again, and how long to wait first?
 *
 * `retriesDone` is how many retries already happened (0 after the first failure).
 *
 * A provider that says how long to wait (`Retry-After`) can only **lengthen** the wait. If it asks for
 * longer than the ceiling, the answer is "do not retry": sleeping that long inside a call would freeze a
 * button for minutes, so the error goes up carrying the wait, and the layer above decides what to do.
 */
export function decideRetry(
  error: unknown,
  retriesDone: number,
  options: RetryOptions,
  random: () => number,
  { keyless = false }: { keyless?: boolean } = {}
): RetryDecision {
  if (!(error instanceof ProviderError)) return { retry: false }
  // A rate limit is normally the *key's* trouble and is answered by moving to another key. A connection
  // with no key at all (a local runtime, or a gateway of the user's own that rotates its keys itself) has
  // nothing to move to, so for it a rate limit is waited out like any other transient trouble.
  const transient =
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (keyless && error.kind === 'rate_limited')
  if (!transient) return { retry: false }
  if (retriesDone >= options.maxRetries) return { retry: false }

  const asked = error.retryAfterMs
  if (asked !== undefined && asked > options.maxDelayMs) return { retry: false }

  const backoff = Math.min(options.baseDelayMs * 2 ** retriesDone, options.maxDelayMs)
  const spread = 1 + options.jitter * (2 * random() - 1)
  const delayMs = Math.min(options.maxDelayMs, Math.max(Math.round(backoff * spread), asked ?? 0))
  return { retry: true, delayMs }
}

/** Waits `ms`, or ends at once with `cancelled` if the signal aborts first. */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancelled = (): ProviderError => new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')
    if (signal?.aborted) {
      reject(cancelled())
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(cancelled())
    }
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      },
      Math.max(0, ms)
    )
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
