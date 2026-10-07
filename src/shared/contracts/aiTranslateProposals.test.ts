import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { paragraphBatchSchema } from './aiTranslateProposals'

const ID = '11111111-2222-4333-8444-555555555555'
const input = {
  workId: ID,
  chapterId: ID,
  runId: ID,
  connectionId: ID,
  entryId: ID,
  settingsKey: 'a'.repeat(64),
  sourceRev: 0,
  targetRev: 0,
  targetBaseContent: '',
  policy: 'review',
  sourceIds: [ID]
}

describe('paragraphBatchSchema', () => {
  it('takes a batch with or without the retry flag', () => {
    expect(v.safeParse(paragraphBatchSchema, input).success).toBe(true)
    expect(v.safeParse(paragraphBatchSchema, { ...input, retry: true }).success).toBe(true)
  })

  it('refuses a retry flag that is not a boolean', () => {
    expect(v.safeParse(paragraphBatchSchema, { ...input, retry: 'yes' }).success).toBe(false)
  })
})
