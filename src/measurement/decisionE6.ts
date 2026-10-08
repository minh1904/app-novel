/**
 * Historical E6 advisory algorithm (spec measure-runs).
 * Pure function with no Node/DOM dependencies.
 *
 * Kept to reproduce older benchmark reports. Callers must select it explicitly
 * and must not treat its output as an automatic product decision.
 */

export type E6Decision = 'keep' | 'no-keep' | 'insufficient'

export interface T0Metrics {
  omissions: number // 1-0
  additions: number // 0-1
  merges: number // 2-1
  splits: number // 1-2
  strictGlossaryRate: number // 0..100
}

export interface ComparisonMetrics {
  baselineT0: T0Metrics
  candidateT0: T0Metrics
  nonTieCount?: number
  winRateCI?: {
    mean: number
    lower: number
    upper: number
  }
  humanWinRateCI?: {
    mean: number
    lower: number
    upper: number
  }
}

export interface E6Result {
  decision: E6Decision
  reason: string
  t0Worsened: boolean
  details: {
    baselineStructureIssues: number
    candidateStructureIssues: number
    strictGlossaryDiff: number
  }
}

/**
 * Evaluates the E6 decision rule:
 * - keep: T0 not worse, winRate CI lower > 0.50, human does not contradict.
 * - no-keep: T0 worsened OR winRate CI upper < 0.50.
 * - insufficient: otherwise, or < 50 non-tie pairs.
 */
export function evaluateE6Decision(metrics: ComparisonMetrics): E6Result {
  const { baselineT0, candidateT0, winRateCI, humanWinRateCI, nonTieCount } = metrics

  const baseStruct =
    baselineT0.omissions + baselineT0.additions + baselineT0.merges + baselineT0.splits
  const candStruct =
    candidateT0.omissions + candidateT0.additions + candidateT0.merges + candidateT0.splits
  const glossDiff = candidateT0.strictGlossaryRate - baselineT0.strictGlossaryRate

  // T0 worsened if structural issues increased or strict glossary dropped by more than 1.0%
  const t0Worsened = candStruct > baseStruct || glossDiff < -1.0

  const details = {
    baselineStructureIssues: baseStruct,
    candidateStructureIssues: candStruct,
    strictGlossaryDiff: Number(glossDiff.toFixed(2))
  }

  // Check 1: no-keep
  if (t0Worsened) {
    let reason = 'Kiểm tất định T0 xấu đi: '
    if (candStruct > baseStruct) {
      reason += `lỗi cấu trúc tăng từ ${baseStruct} lên ${candStruct}.`
    } else {
      reason += `tuân thủ glossary chặt giảm ${Math.abs(glossDiff).toFixed(1)}%.`
    }
    return { decision: 'no-keep', reason, t0Worsened: true, details }
  }

  if (winRateCI && winRateCI.upper < 0.5) {
    return {
      decision: 'no-keep',
      reason: `Cận trên khoảng tin cậy của tỷ lệ thắng dưới 50% (${(winRateCI.upper * 100).toFixed(1)}%).`,
      t0Worsened: false,
      details
    }
  }

  // Check 2: insufficient data
  if (nonTieCount !== undefined && nonTieCount < 50) {
    return {
      decision: 'insufficient',
      reason: `Chưa đủ 50 đoạn không ngang để kết luận (hiện có ${nonTieCount} đoạn).`,
      t0Worsened: false,
      details
    }
  }

  // Check 3: keep
  if (winRateCI && winRateCI.lower > 0.5) {
    if (humanWinRateCI && humanWinRateCI.upper < 0.5) {
      return {
        decision: 'insufficient',
        reason: 'Kết quả người chấm ngược chiều với giám khảo LLM.',
        t0Worsened: false,
        details
      }
    }

    return {
      decision: 'keep',
      reason: `Kiểm tất định không xấu đi và cận dưới khoảng tin cậy tỷ lệ thắng trên 50% (${(winRateCI.lower * 100).toFixed(1)}%).`,
      t0Worsened: false,
      details
    }
  }

  return {
    decision: 'insufficient',
    reason: `Khoảng tin cậy tỷ lệ thắng bao gồm 50% ([${((winRateCI?.lower ?? 0.5) * 100).toFixed(1)}%, ${((winRateCI?.upper ?? 0.5) * 100).toFixed(1)}%]), chưa đủ bằng chứng kết luận.`,
    t0Worsened: false,
    details
  }
}
