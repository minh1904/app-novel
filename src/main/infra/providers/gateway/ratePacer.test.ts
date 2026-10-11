import { describe, expect, it } from 'vitest'
import { ProviderError } from '../types'
import { RatePacer } from './ratePacer'

const NOW = 1_700_000_000_000

/**
 * Đồng hồ giả lập chỉ trôi thời gian khi có lệnh chờ, giúp kiểm thử khoảng cách thời gian giữa các cuộc gọi mà không cần chờ thật.
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
 * Hàm sleep ghi nhận thời gian chờ và kết thúc bằng lỗi `cancelled` khi signal bị hủy, giữ nguyên mốc thời gian để mô phỏng gọi đồng thời.
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
    // 6 yêu cầu/phút tương ứng 10 giây mỗi yêu cầu.
    expect(startedAt[1]! - startedAt[0]!).toBe(10_000)
    expect(startedAt[2]! - startedAt[1]!).toBe(10_000)
    expect(sleeps).toEqual([10_000, 10_000])
  })

  it('does not make a call wait for time that has already passed', async () => {
    const { clock, sleeps, sleep } = fakeClock()
    const pacer = new RatePacer(6, () => clock.now, sleep)
    await pacer.wait()
    clock.now += 25_000 // thời gian đã trôi qua; cuộc gọi tiếp theo không cần phải chờ
    await pacer.wait()
    expect(sleeps).toEqual([])
  })

  it('spaces calls made at the same moment one interval apart, in the order they asked', async () => {
    const waits: number[] = []
    const pacer = new RatePacer(12, () => NOW, waitingSleep(waits))
    void [pacer.wait(), pacer.wait(), pacer.wait()]
    // 12 yêu cầu/phút tương ứng 5 giây mỗi yêu cầu: cuộc gọi 1 chạy ngay, cuộc gọi 2 chờ 5s, cuộc gọi 3 chờ 10s.
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
      await pacer.wait() // chạy ngay; lượt tiếp theo cách 10s
      pacer.setRpm(12)
      await pacer.wait() // giữ nguyên lượt đã hứa theo tốc độ cũ: 10s
      await pacer.wait() // lượt sau đó được giãn cách theo tốc độ mới: 5s
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
      await pacer.wait() // cuộc gọi đầu tiên: không phải chờ
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
      await pacer.wait() // lấy slot tại NOW; slot tiếp theo tại NOW + 10s
      const controller = new AbortController()
      const cancelled = pacer.wait(controller.signal) // đặt chỗ từ NOW + 10s đến NOW + 20s
      controller.abort()
      await expect(cancelled).rejects.toMatchObject({ kind: 'cancelled' })

      // Cuộc gọi tiếp theo chỉ cần chờ khoảng cách của cuộc gọi đầu tiên (10s), không bị chờ thêm 20s.
      void pacer.wait()
      expect(waits).toEqual([10_000, 10_000])
    })

    it('leaves the gap when another call reserved after the cancelled one, so spacing never narrows', async () => {
      const waits: number[] = []
      const pacer = new RatePacer(6, () => NOW, waitingSleep(waits))
      await pacer.wait() // slot tại NOW
      const controller = new AbortController()
      const middle = pacer.wait(controller.signal) // slot tại NOW + 10s
      void pacer.wait() // slot tại NOW + 20s
      controller.abort()
      await expect(middle).rejects.toMatchObject({ kind: 'cancelled' })

      // Cuộc gọi sau đó vẫn giữ slot của mình, cuộc gọi mới sẽ đặt sau cuộc gọi đó: mốc 30s.
      void pacer.wait()
      expect(waits).toEqual([10_000, 20_000, 30_000])
    })
  })
})
