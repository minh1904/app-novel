import type { SegmentRefusal } from '../../../../../shared/contracts/aiTranslate'
import type { ParagraphBatchResult } from '../../../../../shared/contracts/aiTranslateProposals'

/** What a chapter's translation run has gathered so far, batch by batch. */
export interface RunTally {
  failed: string[]
  /** Segments the provider's filter blocked, newest reason per segment. */
  refusals: SegmentRefusal[]
  /** A batch failed in a way that stops the rest of the run. */
  halted: boolean
}

export const EMPTY_TALLY: RunTally = { failed: [], refusals: [], halted: false }

/**
 * Adds one batch to the run. Whether a failure stops the run is main's call, carried as `haltsRun`
 * (`errorPolicy.ts`): a few segments blocked by the filter do not, so the chapter's other batches still go.
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
