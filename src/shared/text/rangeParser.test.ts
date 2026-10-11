import { describe, expect, it } from 'vitest'
import { parseRangeString } from './rangeParser'

describe('parseRangeString', () => {
  it('parses single numbers, comma-separated lists, and ranges', () => {
    expect(parseRangeString('1, 5, 10-12')).toEqual([1, 5, 10, 11, 12])
  })

  it('handles spaces and dot-dot syntax', () => {
    expect(parseRangeString('1 3..5, 8')).toEqual([1, 3, 4, 5, 8])
  })

  it('deduplicates and sorts', () => {
    expect(parseRangeString('5, 1-3, 2, 4')).toEqual([1, 2, 3, 4, 5])
  })

  it('respects optional max limit', () => {
    expect(parseRangeString('1-10', 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('handles inverted ranges', () => {
    expect(parseRangeString('5-3')).toEqual([3, 4, 5])
  })

  it('ignores invalid tokens and negative/zero numbers', () => {
    expect(parseRangeString('abc, 0, -5, 2')).toEqual([2])
    expect(parseRangeString('')).toEqual([])
  })
})
