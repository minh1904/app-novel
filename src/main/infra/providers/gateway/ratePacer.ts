import { ProviderError } from '../types'
import { abortableSleep } from './retryPolicy'

/**
 * Spaces requests so that no two start closer together than a minute divided by the RPM the person set
 * (design D9 of change `ai-model-settings`). It answers a provider's requests-per-minute limit *before* the
 * provider does, which is kinder than a 429: the key is not frozen for a limit that was always going to be
 * hit.
 *
 * It works by **reserving the time slot** of each call: a call takes the later of "now" and "when the last
 * reserved slot ends", pushes that end forward by one interval, and sleeps until its own slot. Two calls
 * made at once therefore queue one interval apart without anyone coordinating, and nothing is checked in a
 * loop. The reservation outlives a single run of translation, so a chat sent right after a translation
 * batch waits its turn too.
 *
 * `0` means no pacing at all: `wait` returns at once and keeps no state.
 *
 * One per model entry. The key scheduler (per connection) still reacts to a real 429; this only keeps the
 * app from provoking one by being impatient.
 */
export class RatePacer {
  /** The earliest time the next call may start, in ms. Meaningful only while `rpm` is above 0. */
  private nextAt = 0

  constructor(
    private rpm: number,
    private readonly now: () => number,
    private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void> = abortableSleep
  ) {
    RatePacer.check(rpm)
  }

  private static check(rpm: number): void {
    if (!Number.isFinite(rpm) || rpm < 0) {
      throw new RangeError('The RPM must be a number of at least 0.')
    }
  }

  /**
   * Changes the pace. It applies to the **next** call: slots already reserved keep their time, so lowering
   * the rate never makes a call that was promised a turn wait longer, and raising it does not let calls
   * overtake the ones already waiting.
   */
  setRpm(rpm: number): void {
    RatePacer.check(rpm)
    this.rpm = rpm
  }

  /** The pace in force now. For tests and for showing; not for decisions. */
  get current(): number {
    return this.rpm
  }

  /**
   * Resolves when it is this call's turn. Rejects with `cancelled` — and then the call must not be sent —
   * if the signal aborts first.
   *
   * A call cancelled while it waits gives its slot back **if it was the last one reserved**, so cancelling
   * does not leave a gap that makes the next call wait for nobody. If another call reserved after it, the gap
   * stays: the spacing between calls only ever gets wider than asked, never narrower.
   */
  async wait(signal?: AbortSignal): Promise<void> {
    if (this.rpm === 0) return
    // Checked here and not left to the sleep: a pacer that has to wait for nothing must still not start a
    // call that was cancelled before its turn came.
    if (signal?.aborted === true) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')

    const interval = 60_000 / this.rpm
    const now = this.now()
    const previous = this.nextAt
    const slot = Math.max(now, previous)
    this.nextAt = slot + interval

    const delay = slot - now
    if (delay <= 0) return
    try {
      await this.sleep(delay, signal)
    } catch (error) {
      if (this.nextAt === slot + interval) this.nextAt = previous
      throw error
    }
  }
}
