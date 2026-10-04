import { describe, it, expect } from 'vitest'
import { evaluateE6Decision } from './decisionE6'

describe('decisionE6', () => {
  const baseT0 = {
    omissions: 1,
    additions: 0,
    merges: 0,
    splits: 1,
    strictGlossaryRate: 85.0
  }

  it('concludes no-keep when T0 structural errors increase', () => {
    const candidateT0 = {
      ...baseT0,
      omissions: 3 // increased from 1 to 3!
    }
    const res = evaluateE6Decision({
      baselineT0: baseT0,
      candidateT0
    })
    expect(res.decision).toBe('no-keep')
    expect(res.t0Worsened).toBe(true)
    expect(res.reason).toContain('lỗi cấu trúc tăng')
  })

  it('concludes no-keep when strict glossary rate drops significantly', () => {
    const candidateT0 = {
      ...baseT0,
      strictGlossaryRate: 80.0 // dropped by 5%
    }
    const res = evaluateE6Decision({
      baselineT0: baseT0,
      candidateT0
    })
    expect(res.decision).toBe('no-keep')
    expect(res.t0Worsened).toBe(true)
  })

  it('concludes keep when T0 is not worse and win rate lower CI > 50%', () => {
    const candidateT0 = {
      ...baseT0,
      strictGlossaryRate: 86.0
    }
    const res = evaluateE6Decision({
      baselineT0: baseT0,
      candidateT0,
      nonTieCount: 80,
      winRateCI: {
        mean: 0.65,
        lower: 0.55,
        upper: 0.75
      }
    })
    expect(res.decision).toBe('keep')
    expect(res.reason).toContain('cận dưới khoảng tin cậy tỷ lệ thắng trên 50%')
  })

  it('concludes insufficient when non-tie pairs are fewer than 50', () => {
    const candidateT0 = {
      ...baseT0,
      strictGlossaryRate: 86.0
    }
    const res = evaluateE6Decision({
      baselineT0: baseT0,
      candidateT0,
      nonTieCount: 30, // < 50
      winRateCI: {
        mean: 0.7,
        lower: 0.6,
        upper: 0.8
      }
    })
    expect(res.decision).toBe('insufficient')
    expect(res.reason).toContain('Chưa đủ 50 đoạn')
  })

  it('concludes insufficient when CI overlaps 50%', () => {
    const candidateT0 = {
      ...baseT0,
      strictGlossaryRate: 85.0
    }
    const res = evaluateE6Decision({
      baselineT0: baseT0,
      candidateT0,
      nonTieCount: 100,
      winRateCI: {
        mean: 0.52,
        lower: 0.44, // overlaps 50%
        upper: 0.6
      }
    })
    expect(res.decision).toBe('insufficient')
  })
})
