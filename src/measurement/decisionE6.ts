/**
 * Thuật toán khuyến nghị E6 lịch sử.
 * Hàm thuần túy không phụ thuộc Node/DOM.
 *
 * Giữ lại để tái lập các báo cáo đo đạc trước đây. Nơi gọi phải chọn hàm này
 * một cách tường minh và không được coi kết quả trả về là quyết định tự động.
 */

export type E6Decision = 'keep' | 'no-keep' | 'insufficient'

export interface T0Metrics {
  omissions: number // Bỏ sót (1->0)
  additions: number // Thêm mới (0->1)
  merges: number // Gộp (2->1)
  splits: number // Tách (1->2)
  strictGlossaryRate: number // Tỷ lệ tuân thủ thuật ngữ nghiêm ngặt (0..100)
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
 * Đánh giá quy tắc quyết định E6:
 * - keep: T0 không tệ hơn, cận dưới CI của tỷ lệ thắng > 0.50, đánh giá của con người không mâu thuẫn.
 * - no-keep: T0 tệ hơn HOẶC cận trên CI của tỷ lệ thắng < 0.50.
 * - insufficient: trường hợp khác, hoặc < 50 cặp đoạn không hòa.
 */
export function evaluateE6Decision(metrics: ComparisonMetrics): E6Result {
  const { baselineT0, candidateT0, winRateCI, humanWinRateCI, nonTieCount } = metrics

  const baseStruct =
    baselineT0.omissions + baselineT0.additions + baselineT0.merges + baselineT0.splits
  const candStruct =
    candidateT0.omissions + candidateT0.additions + candidateT0.merges + candidateT0.splits
  const glossDiff = candidateT0.strictGlossaryRate - baselineT0.strictGlossaryRate

  // T0 tệ hơn nếu lỗi cấu trúc tăng hoặc tỷ lệ tuân thủ thuật ngữ nghiêm ngặt giảm hơn 1.0%
  const t0Worsened = candStruct > baseStruct || glossDiff < -1.0

  const details = {
    baselineStructureIssues: baseStruct,
    candidateStructureIssues: candStruct,
    strictGlossaryDiff: Number(glossDiff.toFixed(2))
  }

  // Bước 1: kiểm tra điều kiện không giữ (no-keep)
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

  // Bước 2: kiểm tra dữ liệu chưa đủ (insufficient)
  if (nonTieCount !== undefined && nonTieCount < 50) {
    return {
      decision: 'insufficient',
      reason: `Chưa đủ 50 đoạn không ngang để kết luận (hiện có ${nonTieCount} đoạn).`,
      t0Worsened: false,
      details
    }
  }

  // Bước 3: kiểm tra điều kiện giữ lại (keep)
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
