import { describe, expect, it } from 'vitest'
import { ProviderError } from '../types'
import { RatePacer } from './ratePacer'

const NOW = 1_700_000_000_000

/**
 * A clock that only moves when somebody sleeps, so a test can say "this call started 10 seconds after
 * that one" without waiting for it. `sleeps` is what each call was told to wait.
 */
function fakeClock(): {
  clock: { now: number }
  sleeps: number[]
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>
} {
  const clock = { now: NOW }
  const sleeps: number[] = []
  return {
    clock,
    sleeps,
    sleep: async (ms) => {
      sleeps.push(ms)
      clock.now += ms
    }
  }
}

/**
 * A sleep that never finishes by itself and ends with `cancelled` when its signal aborts, and records how
 * long each call was told to wait. The clock does not move, so every call looks like it was made at the
 * same moment, the way concurrent callers are.
 */
function waitingSleep(waits: number[]): (ms: number, signal?: AbortSignal) => Promise<void> {
  return (ms, signal) => {
    waits.push(ms)
    return new Promise<void>((_resolve, reject) =>
      signal?.addEventListener('abort', () => reject(new ProviderError('cancelled', 'x')), {
        once: true
      })
    )
  }
}

describe('RatePacer', () => {
  it('lets the first call go at once', async () => {
    const { clock, sleeps, sleep } = fakeClock()
    const pacer = new RatePacer(6, () => clock.now, sleep)
    await pacer.wait()
    expect(sleeps).toEqual([])
  })

  it('starts a second call at least a minute divided by the RPM after the first', async () => {
    const { clock, sleeps, sleep } = fakeClock()
    const pacer = new RatePacer(6, () => clock.now, sleep)
    const startedAt: number[] = []
    for (let call = 0; call < 3; call++) {
      await pacer.wait()
      startedAt.push(clock.now)
    }
    // 6 per minute is one every 10 seconds.
    expect(startedAt[1]! - startedAt[0]!).toBe(10_000)
    expect(startedAt[2]! - startedAt[1]!).toBe(10_000)
    expect(sleeps).toEqual([10_000, 10_000])
  })

  it('does not make a call wait for time that has already passed', async () => {
    const { clock, sleeps, sleep } = fakeClock()
    const pacer = new RatePacer(6, () => clock.now, sleep)
    await pacer.wait()
    clock.now += 25_000 // the person was away; the next call has nothing to wait for
    await pacer.wait()
    expect(sleeps).toEqual([])
  })

  it('spaces calls made at the same moment one interval apart, in the order they asked', async () => {
    const waits: number[] = []
    const pacer = new RatePacer(12, () => NOW, waitingSleep(waits))
    void [pacer.wait(), pacer.wait(), pacer.wait()]
    // 12 per minute is one every 5 seconds: the first goes at once, the second waits 5, the third 10.
    expect(waits).toEqual([5_000, 10_000])
  })

  it('does nothing at all for an RPM of 0, however many calls', async () => {
    const { clock, sleeps, sleep } = fakeClock()
    const pacer = new RatePacer(0, () => clock.now, sleep)
    for (let call = 0; call < 50; call++) await pacer.wait()
    expect(sleeps).toEqual([])
  })

  it('does not look at the signal for an RPM of 0, so an unpaced call behaves as it did before pacing existed', async () => {
    const pacer = new RatePacer(0, () => NOW)
    const controller = new AbortController()
    controller.abort()
    await expect(pacer.wait(controller.signal)).resolves.toBeUndefined()
  })

  it('refuses a negative or non-numeric RPM', () => {
    expect(() => new RatePacer(-1, () => NOW)).toThrow(RangeError)
    expect(() => new RatePacer(Number.NaN, () => NOW)).toThrow(RangeError)
    expect(() => new RatePacer(6, () => NOW).setRpm(-5)).toThrow(RangeError)
  })

  describe('changing the pace', () => {
    it('applies a new RPM from the next call on, and keeps the turn already promised', async () => {
      const { clock, sleeps, sleep } = fakeClock()
      const pacer = new RatePacer(6, () => clock.now, sleep)
      await pacer.wait() // goes at once; the next turn is 10 s out
      pacer.setRpm(12)
      await pacer.wait() // keeps the turn it was promised under the old pace: 10 s
      await pacer.wait() // and the one after it is spaced at the new pace: 5 s
      expect(sleeps).toEqual([10_000, 5_000])
    })

    it('stops pacing when set to 0, and starts again when set back', async () => {
      const { clock, sleeps, sleep } = fakeClock()
      const pacer = new RatePacer(6, () => clock.now, sleep)
      pacer.setRpm(0)
      await pacer.wait()
      await pacer.wait()
      expect(sleeps).toEqual([])
      pacer.setRpm(6)
      await pacer.wait()
      await pacer.wait()
      expect(sleeps).toEqual([10_000])
    })
  })

  describe('cancel', () => {
    it('ends a call that is waiting for its turn with `cancelled`, and it is never sent', async () => {
      const pacer = new RatePacer(6, () => NOW, waitingSleep([]))
      await pacer.wait() // the first call: no wait
      const controller = new AbortController()
      let sent = false
      const second = pacer.wait(controller.signal).then(() => {
        sent = true
      })
      controller.abort()
      await expect(second).rejects.toMatchObject({ kind: 'cancelled' })
      expect(sent).toBe(false)
    })

    it('does not start a call that was cancelled before its turn came', async () => {
      const { clock, sleep } = fakeClock()
      const pacer = new RatePacer(6, () => clock.now, sleep)
      const controller = new AbortController()
      controller.abort()
      await expect(pacer.wait(controller.signal)).rejects.toMatchObject({ kind: 'cancelled' })
    })

    it('hands the slot back when the cancelled call was the last one, so nobody waits for nothing', async () => {
      const waits: number[] = []
      const pacer = new RatePacer(6, () => NOW, waitingSleep(waits))
      await pacer.wait() // takes the slot at NOW; the next is at NOW + 10 s
      const controller = new AbortController()
      const cancelled = pacer.wait(controller.signal) // reserves NOW + 10 s ... NOW + 20 s
      controller.abort()
      await expect(cancelled).rejects.toMatchObject({ kind: 'cancelled' })

      // The next call must wait for the first call's interval and for nothing more. Without the slot being
      // returned it would wait 20 s, for a call that never happened.
      void pacer.wait()
      expect(waits).toEqual([10_000, 10_000])
    })

    it('leaves the gap when another call reserved after the cancelled one, so spacing never narrows', async () => {
      const waits: number[] = []
      const pacer = new RatePacer(6, () => NOW, waitingSleep(waits))
      await pacer.wait() // slot at NOW
      const controller = new AbortController()
      const middle = pacer.wait(controller.signal) // slot at NOW + 10 s
      void pacer.wait() // slot at NOW + 20 s
      controller.abort()
      await expect(middle).rejects.toMatchObject({ kind: 'cancelled' })

      // The call after it keeps its slot, and a new call goes after that one: 30 s out, not 20.
      void pacer.wait()
      expect(waits).toEqual([10_000, 20_000, 30_000])
    })
  })
})
