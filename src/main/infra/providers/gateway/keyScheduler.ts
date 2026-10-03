import type { QuotaScope } from '../../storage/connections'
import type { ClassifiedError } from '../classifyError'
import { decideFreeze, earliestRecovery } from '../keyPool'

/**
 * Which key a call may use, and what an outcome does to a key — safe when calls overlap.
 *
 * `keyPool.ts` decides *how long* a key is frozen. This decides *when a result may change a key at
 * all*, which is what goes wrong once more than one call is in flight (design D5 of change
 * `ai-gateway`). Two bugs were measured before any code was written:
 *
 *  - six simultaneous 429s on one key froze it for 30 minutes, because every report counted as a
 *    fresh strike and the freeze doubles with each one;
 *  - a call that started *before* the key failed and finished `ok` *afterwards* un-froze it.
 *
 * LinguaGacha's request scheduler answers both with four per-key states (`ready`, `draining`,
 * `cooling`, `probing`) and a version stamp. The same effect here comes from one idea: an **epoch**.
 * Each key has a counter that goes up when the key fails. A lease remembers the epoch it was given out
 * in, so any later result can ask "did this key fail since my call began?":
 *
 *  - an `ok` from before the failure says nothing about the key now, so it changes nothing;
 *  - a failure from before the failure is the same wave: it may lengthen the freeze, never count again.
 *
 * The epoch lives in memory and starts over with the process, which is correct: no call survives a
 * restart, so there is nothing left to be stale. The freeze itself (`frozen_until`, strikes) stays in
 * the database, so a restart does not forget a key that ran out of quota an hour ago.
 *
 * Pure on purpose: it holds counters and decides, it does not touch storage. The caller applies the
 * `KeyEffect` it returns.
 */

/** What storage knows about a key. */
export interface KeyRecord {
  id: string
  state: 'ok' | 'invalid'
  frozenUntil: number | null
  frozenScope: QuotaScope | null
  /** Freezes in a row without a success. More than 0 means the key was frozen and is on probation. */
  freezeStrikes: number
}

/** One permission to use a key, remembered so the result can be judged against when it was given. */
export interface Lease {
  readonly keyId: string
  readonly epoch: number
  /** The single call allowed through a key whose freeze has run out, to find out if it works again. */
  readonly probe: boolean
}

export type Pick = { lease: Lease } | { exhausted: true; recoverAt: number | null }

/** The one thing to write to storage after a result, if anything. */
export type KeyEffect =
  | { kind: 'none' }
  | { kind: 'clear' }
  | { kind: 'freeze'; until: number; scope: QuotaScope | null; strikes: number }
  | { kind: 'invalid' }

/** `neutral` is a call that ended without proving anything about the key: cancelled, timed out. */
export type Outcome = 'ok' | 'neutral' | ClassifiedError

interface Runtime {
  /** Goes up each time the key fails in a new wave. */
  epoch: number
  /** A probe is out; no second one is let through until it comes back. */
  probing: boolean
}

export class KeyScheduler {
  private readonly runtime = new Map<string, Runtime>()

  constructor(private readonly now: () => number) {}

  private of(keyId: string): Runtime {
    let state = this.runtime.get(keyId)
    if (state === undefined) {
      state = { epoch: 0, probing: false }
      this.runtime.set(keyId, state)
    }
    return state
  }

  /**
   * The first key that may be used, **in the order the person listed them** (fill-first: use one up,
   * then the next — what a free tier needs, where spreading evenly would wear every key out together).
   *
   * A key whose freeze has run out but that has strikes is on probation: it gets exactly one call. While
   * that call is out, the next key serves everything else.
   */
  pick(keys: readonly KeyRecord[]): Pick {
    const at = this.now()
    for (const key of keys) {
      if (key.state === 'invalid') continue
      if (key.frozenUntil !== null && key.frozenUntil > at) continue
      const state = this.of(key.id)
      if (key.freezeStrikes > 0) {
        if (state.probing) continue
        state.probing = true
        return { lease: { keyId: key.id, epoch: state.epoch, probe: true } }
      }
      return { lease: { keyId: key.id, epoch: state.epoch, probe: false } }
    }
    return { exhausted: true, recoverAt: earliestRecovery(keys, at) }
  }

  /** What a finished call means for its key. `record` is the key as storage has it right now. */
  settle(lease: Lease, outcome: Outcome, record: KeyRecord | undefined): KeyEffect {
    const state = this.of(lease.keyId)
    if (lease.probe) state.probing = false
    if (outcome === 'neutral') return { kind: 'none' }

    // The key failed after this call began: this call's result is about a key that no longer exists.
    const stale = lease.epoch < state.epoch

    if (outcome === 'ok') return stale ? { kind: 'none' } : { kind: 'clear' }

    // A straggler of a wave already counted is judged at the level that wave started from. Using the
    // strikes as they stand now would price it one notch higher and stretch a freeze that is already right.
    const strikes = record?.freezeStrikes ?? 0
    const decision = decideFreeze({
      error: outcome,
      strikes: stale ? Math.max(0, strikes - 1) : strikes,
      now: this.now()
    })
    if (decision.invalid) {
      state.epoch++
      return { kind: 'invalid' }
    }
    // Not the key's doing (network, timeout, a refused request): leave it alone.
    if (decision.until === null) return { kind: 'none' }

    if (stale) {
      // Same wave as a failure already recorded. It may push the end of the freeze further out, but it
      // must not count as another strike — that is what turned six errors into thirty minutes.
      const current = record?.frozenUntil ?? 0
      if (decision.until <= current) return { kind: 'none' }
      return {
        kind: 'freeze',
        until: decision.until,
        scope: decision.scope,
        strikes: record?.freezeStrikes ?? decision.strikes
      }
    }

    state.epoch++
    return {
      kind: 'freeze',
      until: decision.until,
      scope: decision.scope,
      strikes: decision.strikes
    }
  }
}
