import type { SegmentRefusal } from '../../../../../shared/contracts/aiTranslate'
import type { ParagraphBatchResult } from '../../../../../shared/contracts/aiTranslateProposals'

/** Thống kê tiến trình dịch của chương theo từng lô đoạn văn. */
export interface RunTally {
  failed: string[]
  /** Danh sách các đoạn bị bộ lọc của nhà cung cấp chặn nội dung. */
  refusals: SegmentRefusal[]
  /** Đánh dấu tiến trình dịch bị dừng do lỗi nghiêm trọng ở một lô. */
  halted: boolean
}

export const EMPTY_TALLY: RunTally = { failed: [], refusals: [], halted: false }

/**
 * Cập nhật kết quả của một lô đoạn vào thống kê chung của lượt dịch.
 * Nếu gặp lỗi dừng toàn bộ lượt chạy (`haltsRun`), cờ `halted` sẽ được kích hoạt.
 */
export function tallyBatch(
  tally: RunTally,
  batch: Pick<ParagraphBatchResult, 'failed' | 'refusals' | 'error'>
): RunTally {
  const seen = new Set(batch.refusals.map((item) => item.id))
  return {
    failed: [...new Set([...tally.failed, ...batch.failed])],
    refusals: [...tally.refusals.filter((item) => !seen.has(item.id)), ...batch.refusals],
    halted: tally.halted || batch.error?.haltsRun === true
  }
}
