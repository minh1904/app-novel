import { describe, expect, it } from 'vitest'
import { findBlockEvidence, readFilterReason } from './filterReason'

describe('readFilterReason', () => {
  it.each([
    ['content_filter: PROHIBITED_CONTENT', 'prohibited', 'PROHIBITED_CONTENT'],
    ['content_filter: SAFETY', 'safety', 'SAFETY'],
    ['content_filter: RECITATION', 'recitation', 'RECITATION'],
    // A blocklist and personal data are not the content group the product rules forbid moving.
    ['content_filter: SPII', 'other', 'SPII'],
    ['content_filter: BLOCKLIST', 'other', 'BLOCKLIST'],
    ['content_filter: SOMETHING_NEW', 'other', 'SOMETHING_NEW'],
    // OpenAI says no more than this.
    ['content_filter', 'other', '']
  ])('groups %s', (raw, group, word) => {
    expect(readFilterReason(raw)).toEqual({ group, raw: word })
  })

  it('has nothing to say about an answer that did not end on a filter', () => {
    expect(readFilterReason('stop')).toBeUndefined()
    expect(readFilterReason(undefined)).toBeUndefined()
  })
})

describe('findBlockEvidence', () => {
  it('finds nothing in an ordinary request error', () => {
    expect(
      findBlockEvidence('{"error":{"message":"Request contains an invalid argument."}}')
    ).toBeUndefined()
  })

  it('does not take a lower-case parameter name for a safety reason', () => {
    expect(findBlockEvidence('Unknown name "safety_settings"')).toBeUndefined()
  })
})
