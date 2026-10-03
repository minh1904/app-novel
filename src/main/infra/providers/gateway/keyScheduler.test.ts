import { describe, expect, it } from 'vitest'
import { classifyHttpError, type ClassifiedError } from '../classifyError'
import { MAX_SHORT_FREEZE_MS, SHORT_FREEZE_MS, nextDailyReset } from '../keyPool'
import { KeyScheduler, type KeyEffect, type KeyRecord, type Lease } from './keyScheduler'

const NOW = 1_700_000_000_000

const record = (id: string, over: Partial<KeyRecord> = {}): KeyRecord => ({
  id,
  state: 'ok',
  frozenUntil: null,
  frozenScope: null,
  freezeStrikes: 0,
  ...over
})

const BLIND_429 = (): ClassifiedError =>
  classifyHttpError({ status: 429, body: 'Too Many Requests', now: NOW })
const AUTH_401 = (): ClassifiedError => classifyHttpError({ status: 401, body: '', now: NOW })
const SERVER_503 = (): ClassifiedError => classifyHttpError({ status: 503, body: '', now: NOW })

const PER_DAY = JSON.stringify({
  error: {
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }]
      }
    ]
  }
})

function leaseOf(pick: ReturnType<KeyScheduler['pick']>): Lease {
  if (!('lease' in pick)) throw new Error('expected a lease, got ' + JSON.stringify(pick))
  return pick.lease
}

/** A store in miniature: applies the effects the way the real key source does, so tests read like a run. */
class Harness {
  readonly keys: KeyRecord[]
  readonly scheduler: KeyScheduler
  clock = NOW

  constructor(...keys: KeyRecord[]) {
    this.keys = keys
    this.scheduler = new KeyScheduler(() => this.clock)
  }

  pick(): ReturnType<KeyScheduler['pick']> {
    return this.scheduler.pick(this.keys)
  }

  settle(lease: Lease, outcome: Parameters<KeyScheduler['settle']>[1]): KeyEffect {
    const row = this.keys.find((key) => key.id === lease.keyId)
    const effect = this.scheduler.settle(lease, outcome, row)
    if (row === undefined) return effect
    if (effect.kind === 'clear')
      Object.assign(row, { state: 'ok', frozenUntil: null, frozenScope: null, freezeStrikes: 0 })
    if (effect.kind === 'freeze') {
      Object.assign(row, {
        frozenUntil: effect.until,
        frozenScope: effect.scope,
        freezeStrikes: effect.strikes
      })
    }
    if (effect.kind === 'invalid')
      Object.assign(row, { state: 'invalid', frozenUntil: null, frozenScope: null })
    return effect
  }
}

describe('pick (fill-first)', () => {
  it('uses the first key until it stops working, not round-robin', () => {
    const h = new Harness(record('a'), record('b'))
    expect(leaseOf(h.pick()).keyId).toBe('a')
    expect(leaseOf(h.pick()).keyId).toBe('a')
  })

  it('skips an invalid key and a key that is still frozen', () => {
    const h = new Harness(
      record('a', { state: 'invalid' }),
      record('b', { frozenUntil: NOW + 1_000 }),
      record('c')
    )
    expect(leaseOf(h.pick()).keyId).toBe('c')
  })

  it('says when the first key comes back once every key is out', () => {
    const h = new Harness(
      record('a', { frozenUntil: NOW + 5_000 }),
      record('b', { frozenUntil: NOW + 2_000 })
    )
    expect(h.pick()).toEqual({ exhausted: true, recoverAt: NOW + 2_000 })
  })

  it('has nothing to wait for when the only keys are invalid', () => {
    expect(new Harness(record('a', { state: 'invalid' })).pick()).toEqual({
      exhausted: true,
      recoverAt: null
    })
  })
})

describe('a burst of failures on one key (measured: six 429s froze a key for 30 minutes)', () => {
  it('counts six simultaneous 429s as one failure, not six', () => {
    const h = new Harness(record('a'), record('b'))
    const leases = Array.from({ length: 6 }, () => leaseOf(h.pick()))
    expect(new Set(leases.map((lease) => lease.keyId))).toEqual(new Set(['a']))

    for (const lease of leases) h.settle(lease, BLIND_429())

    const a = h.keys[0]!
    expect(a.freezeStrikes).toBe(1)
    // One blind freeze is a minute, not the 30-minute cap that six strikes in a row reach.
    expect(a.frozenUntil).toBe(NOW + SHORT_FREEZE_MS)
    expect(a.frozenUntil).toBeLessThan(NOW + MAX_SHORT_FREEZE_MS)
  })

  it('moves new calls to the next key as soon as the first failure lands, while the others are still out', () => {
    const h = new Harness(record('a'), record('b'))
    const first = leaseOf(h.pick())
    const second = leaseOf(h.pick())
    h.settle(first, BLIND_429())
    expect(leaseOf(h.pick()).keyId).toBe('b')
    h.settle(second, BLIND_429())
    expect(leaseOf(h.pick()).keyId).toBe('b')
  })

  it('lets a later failure of the same wave push the freeze further out, but not count again', () => {
    const h = new Harness(record('a'))
    const early = leaseOf(h.pick())
    const late = leaseOf(h.pick())
    h.settle(early, BLIND_429())
    const firstUntil = h.keys[0]!.frozenUntil as number

    h.clock = NOW + 5_000
    const longer = classifyHttpError({ status: 429, body: PER_DAY, now: h.clock })
    h.settle(late, longer)

    expect(h.keys[0]!.freezeStrikes).toBe(1)
    expect(h.keys[0]!.frozenUntil as number).toBeGreaterThan(firstUntil)
    expect(h.keys[0]!.frozenScope).toBe('day')
  })

  it('does not shorten a freeze because a straggler asked for a shorter wait', () => {
    const h = new Harness(record('a'))
    const early = leaseOf(h.pick())
    const late = leaseOf(h.pick())
    h.settle(early, classifyHttpError({ status: 429, body: PER_DAY, now: NOW }))
    const dayUntil = h.keys[0]!.frozenUntil
    expect(h.settle(late, BLIND_429())).toEqual({ kind: 'none' })
    expect(h.keys[0]!.frozenUntil).toBe(dayUntil)
  })
})

describe('a success that arrives after the key failed (measured: it un-froze the key)', () => {
  it('leaves the freeze in place', () => {
    const h = new Harness(record('a'), record('b'))
    const old = leaseOf(h.pick())
    const unlucky = leaseOf(h.pick())

    h.settle(unlucky, BLIND_429())
    const frozenUntil = h.keys[0]!.frozenUntil
    expect(frozenUntil).toBe(NOW + SHORT_FREEZE_MS)

    expect(h.settle(old, 'ok')).toEqual({ kind: 'none' })
    expect(h.keys[0]).toMatchObject({ frozenUntil, freezeStrikes: 1 })
  })

  it('leaves an invalid key invalid', () => {
    const h = new Harness(record('a'), record('b'))
    const old = leaseOf(h.pick())
    const bad = leaseOf(h.pick())
    h.settle(bad, AUTH_401())
    expect(h.keys[0]!.state).toBe('invalid')
    h.settle(old, 'ok')
    expect(h.keys[0]!.state).toBe('invalid')
  })

  it('still clears a freeze when the success is from a call that began after it', () => {
    const h = new Harness(record('a', { frozenUntil: NOW - 1, freezeStrikes: 2 }))
    const probe = leaseOf(h.pick())
    expect(probe.probe).toBe(true)
    expect(h.settle(probe, 'ok')).toEqual({ kind: 'clear' })
    expect(h.keys[0]).toMatchObject({ frozenUntil: null, freezeStrikes: 0 })
  })
})

describe('probation after a freeze runs out', () => {
  const onProbation = (): Harness =>
    new Harness(record('a', { frozenUntil: NOW - 1, freezeStrikes: 1 }), record('b'))

  it('lets exactly one call through the key, and sends the rest to the next key', () => {
    const h = onProbation()
    const probe = leaseOf(h.pick())
    expect(probe).toMatchObject({ keyId: 'a', probe: true })
    expect(leaseOf(h.pick()).keyId).toBe('b')
    expect(leaseOf(h.pick()).keyId).toBe('b')
  })

  it('restores the key when the probe works', () => {
    const h = onProbation()
    h.settle(leaseOf(h.pick()), 'ok')
    expect(leaseOf(h.pick())).toMatchObject({ keyId: 'a', probe: false })
  })

  it('freezes it again, one level up, when the probe fails', () => {
    const h = new Harness(record('a', { frozenUntil: NOW - 1, freezeStrikes: 1 }), record('b'))
    const probe = leaseOf(h.pick())
    h.settle(probe, BLIND_429())
    expect(h.keys[0]).toMatchObject({ freezeStrikes: 2, frozenUntil: NOW + 2 * SHORT_FREEZE_MS })
    expect(leaseOf(h.pick()).keyId).toBe('b')
  })

  it('offers the probe again when it was cancelled before it proved anything', () => {
    const h = onProbation()
    const probe = leaseOf(h.pick())
    expect(h.settle(probe, 'neutral')).toEqual({ kind: 'none' })
    expect(leaseOf(h.pick())).toMatchObject({ keyId: 'a', probe: true })
  })

  it('treats a key that ran out of quota an hour ago as on probation after a restart, not as healthy', () => {
    // A new scheduler knows nothing about epochs; the strikes in storage are what remembers.
    const h = new Harness(record('a', { frozenUntil: NOW - 3_600_000, freezeStrikes: 3 }))
    expect(leaseOf(h.pick()).probe).toBe(true)
  })
})

describe('what leaves a key alone', () => {
  it('does nothing for a cancelled or timed-out call', () => {
    const h = new Harness(record('a'))
    expect(h.settle(leaseOf(h.pick()), 'neutral')).toEqual({ kind: 'none' })
    expect(h.keys[0]).toMatchObject({ frozenUntil: null, freezeStrikes: 0, state: 'ok' })
  })

  it('does nothing for a server error or a refused request, which are not the key', () => {
    const h = new Harness(record('a'))
    expect(h.settle(leaseOf(h.pick()), SERVER_503())).toEqual({ kind: 'none' })
    expect(h.keys[0]).toMatchObject({ frozenUntil: null, freezeStrikes: 0 })
  })

  it('marks a wrong key invalid with no timer', () => {
    const h = new Harness(record('a'), record('b'))
    h.settle(leaseOf(h.pick()), AUTH_401())
    expect(h.keys[0]).toMatchObject({ state: 'invalid', frozenUntil: null })
    expect(leaseOf(h.pick()).keyId).toBe('b')
  })
})

describe('what a daily limit and an empty account do', () => {
  it('freezes a key until the daily reset for a per-day limit', () => {
    const h = new Harness(record('a'))
    h.settle(leaseOf(h.pick()), classifyHttpError({ status: 429, body: PER_DAY, now: NOW }))
    expect(h.keys[0]).toMatchObject({ frozenScope: 'day', frozenUntil: nextDailyReset(NOW) })
  })

  it('parks an account that is out of credit until the daily reset, without calling the key wrong', () => {
    const h = new Harness(record('a'), record('b'))
    h.settle(leaseOf(h.pick()), classifyHttpError({ status: 402, body: '', now: NOW }))
    expect(h.keys[0]).toMatchObject({
      state: 'ok',
      frozenScope: 'day',
      frozenUntil: nextDailyReset(NOW)
    })
    expect(leaseOf(h.pick()).keyId).toBe('b')
  })
})
