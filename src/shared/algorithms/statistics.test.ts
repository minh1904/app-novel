import { describe, it, expect } from 'vitest'
import { createPrng, computeCohenKappa, bootstrapWinRateCI } from './statistics'

describe('statistics algorithms', () => {
  describe('createPrng', () => {
    it('generates deterministic sequence from a seed', () => {
      const rng1 = createPrng(42)
      const rng2 = createPrng(42)
      const seq1 = [rng1(), rng1(), rng1()]
      const seq2 = [rng2(), rng2(), rng2()]
      expect(seq1).toEqual(seq2)
    })
  })

  describe('computeCohenKappa', () => {
    it('returns 1.0 for perfect agreement', () => {
      const rater1: Array<'A' | 'B' | 'tie'> = ['A', 'B', 'tie', 'A', 'B']
      const rater2: Array<'A' | 'B' | 'tie'> = ['A', 'B', 'tie', 'A', 'B']
      const res = computeCohenKappa(rater1, rater2)
      expect(res.kappa).toBeCloseTo(1.0, 5)
      expect(res.observedAgreement).toBe(1.0)
    })

    it('returns ~0 for random chance agreement', () => {
      // 50 A, 50 B vs 50 A, 50 B uncorrelated
      const rater1: Array<'A' | 'B' | 'tie'> = ['A', 'A', 'B', 'B']
      const rater2: Array<'A' | 'B' | 'tie'> = ['A', 'B', 'A', 'B']
      const res = computeCohenKappa(rater1, rater2)
      expect(res.kappa).toBeCloseTo(0.0, 1)
    })
  })

  describe('bootstrapWinRateCI', () => {
    it('computes confidence intervals deterministically', () => {
      const stats = [
        { aWins: 10, bWins: 2 },
        { aWins: 15, bWins: 5 },
        { aWins: 8, bWins: 3 }
      ]
      const ci1 = bootstrapWinRateCI(stats, { resamples: 500, seed: 42 })
      const ci2 = bootstrapWinRateCI(stats, { resamples: 500, seed: 42 })
      expect(ci1).toEqual(ci2)
      expect(ci1.mean).toBeGreaterThan(0.6)
      expect(ci1.lower).toBeLessThan(ci1.mean)
      expect(ci1.upper).toBeGreaterThan(ci1.mean)
    })
  })
})
