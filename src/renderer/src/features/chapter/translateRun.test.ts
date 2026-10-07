import { describe, expect, it } from 'vitest'
import type { TranslateFailure } from '../../../../shared/contracts/aiTranslate'
import { EMPTY_TALLY, tallyBatch } from './translateRun'

const failure = (kind: TranslateFailure['kind'], haltsRun: boolean): TranslateFailure => ({
  kind,
  message: kind,
  recoverAt: null,
  haltsRun
})

describe('tallyBatch', () => {
  it('goes on to the next batch after a few segments the filter blocked', () => {
    const first = tallyBatch(EMPTY_TALLY, {
      failed: ['s2'],
      refusals: [{ id: 's2', group: 'prohibited', raw: 'PROHIBITED_CONTENT' }],
      error: failure('refused', false)
    })
    expect(first.halted).toBe(false)
    const second = tallyBatch(first, { failed: [], refusals: [], error: null })
    expect(second).toEqual({
      failed: ['s2'],
      refusals: [{ id: 's2', group: 'prohibited', raw: 'PROHIBITED_CONTENT' }],
      halted: false
    })
  })

  it('stops on a request error', () => {
    const tally = tallyBatch(EMPTY_TALLY, {
      failed: ['s1', 's2'],
      refusals: [],
      error: failure('invalid_request', true)
    })
    expect(tally.halted).toBe(true)
  })

  it('keeps the newest reason for a segment retried in a later batch', () => {
    const first = tallyBatch(EMPTY_TALLY, {
      failed: ['s1'],
      refusals: [{ id: 's1', group: 'other', raw: '' }],
      error: failure('refused', false)
    })
    const again = tallyBatch(first, {
      failed: ['s1'],
      refusals: [{ id: 's1', group: 'safety', raw: 'SAFETY' }],
      error: failure('refused', false)
    })
    expect(again.refusals).toEqual([{ id: 's1', group: 'safety', raw: 'SAFETY' }])
    expect(again.failed).toEqual(['s1'])
  })
})
