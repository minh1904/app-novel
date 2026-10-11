import { describe, expect, it } from 'vitest'
import { aggregateReportedUsage, toWireUsage } from './usage'

describe('provider-reported usage aggregation', () => {
  it('keeps provider provenance and total input without double-counting details', () => {
    expect(
      toWireUsage({
        inputTokens: 60,
        outputTokens: 20,
        cacheReadTokens: 40,
        cacheWriteTokens: 10,
        reasoningTokens: 5
      })
    ).toEqual({
      inputTokens: 110,
      uncachedInputTokens: 60,
      outputTokens: 20,
      cacheReadTokens: 40,
      cacheWriteTokens: 10,
      reasoningTokens: 5,
      source: 'provider',
      complete: true
    })
  })

  it('marks a reported subtotal incomplete when any executed call omitted usage', () => {
    const fallback = aggregateReportedUsage([
      { inputTokens: 10, outputTokens: 4 },
      null,
      {
        inputTokens: 2,
        outputTokens: 3,
        cacheReadTokens: 8,
        reasoningTokens: 1
      }
    ])
    expect(fallback).toEqual({
      inputTokens: 20,
      uncachedInputTokens: 12,
      outputTokens: 7,
      cacheReadTokens: 8,
      reasoningTokens: 1,
      source: 'provider',
      complete: false
    })
  })

  it('returns no fake usage when every executed call omitted it', () => {
    expect(aggregateReportedUsage([null, null])).toBeNull()
  })
})
