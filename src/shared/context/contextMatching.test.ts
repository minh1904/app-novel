import { describe, expect, it } from 'vitest'
import type { ContextEntryItem } from '../contracts/glossary'
import { isCJK, matchContextEntries } from './contextMatching'

function makeEntry(
  source: string,
  target: string,
  aliases: string[] = [],
  forbidden = false
): ContextEntryItem {
  return {
    id: source,
    kind: 'term',
    source,
    target,
    status: 'approved',
    origin: 'user',
    forbidden,
    fromChapterId: null,
    toChapterId: null,
    notes: null,
    aliases,
    createdAt: 1,
    updatedAt: 1
  }
}

describe('contextMatching', () => {
  it('correctly identifies CJK vs Latin languages', () => {
    expect(isCJK('zh-Hans')).toBe(true)
    expect(isCJK('zh-Hant')).toBe(true)
    expect(isCJK('ja')).toBe(true)
    expect(isCJK('en')).toBe(false)
    expect(isCJK('vi')).toBe(false)
  })

  it('matches CJK text using longest-match first and filters short terms', () => {
    const entries = [
      makeEntry('天蓝', 'Thiên Lam'),
      makeEntry('天蓝宗', 'Thiên Lam Tông'),
      makeEntry('剑', 'Kiếm') // 1 char, filtered by default minLengthCJK = 2
    ]

    const text = '天蓝宗的弟子手握一柄神剑，前往天蓝峰。'
    const matched = matchContextEntries(text, entries, 'zh-Hans')

    expect(matched.map((m) => m.entry.source)).toEqual(['天蓝宗', '天蓝'])
    // '剑' has length 1, so excluded
    expect(matched.find((m) => m.entry.source === '剑')).toBeUndefined()
    // Longest match '天蓝宗' (length 3) is sorted before '天蓝' (length 2)
    expect(matched[0].entry.source).toBe('天蓝宗')
  })

  it('matches CJK terms via alias', () => {
    const entries = [makeEntry('韩立', 'Hàn Lập', ['韩天尊', '厉飞雨'])]

    const text = '厉飞雨冷笑一声，转身离去。'
    const matched = matchContextEntries(text, entries, 'zh-Hans')

    expect(matched).toHaveLength(1)
    expect(matched[0].entry.source).toBe('韩立')
    expect(matched[0].matchedForm).toBe('厉飞雨')
  })

  it('matches Latin/EN terms using word boundaries to avoid false positives', () => {
    const entries = [
      makeEntry('Ash', 'Tro Tàn'),
      makeEntry('Flash', 'Tia Chớp'),
      makeEntry('No', 'Không') // length 2 < 3
    ]

    const text = 'A sudden flash lit up the sky, leaving only ash behind.'
    const matched = matchContextEntries(text, entries, 'en')

    // 'Ash' should match 'ash', but NOT trigger on 'flash'
    const ashMatch = matched.find((m) => m.entry.source === 'Ash')
    expect(ashMatch).toBeDefined()
    expect(ashMatch?.count).toBe(1)

    const flashMatch = matched.find((m) => m.entry.source === 'Flash')
    expect(flashMatch).toBeDefined()
    expect(flashMatch?.count).toBe(1)

    // 'No' excluded because length < 3
    expect(matched.find((m) => m.entry.source === 'No')).toBeUndefined()
  })

  it('respects maxMatches option', () => {
    const entries = [makeEntry('Term1', 'T1'), makeEntry('Term2', 'T2'), makeEntry('Term3', 'T3')]

    const text = 'Term1 Term2 Term3'
    const matched = matchContextEntries(text, entries, 'en', { maxMatches: 2 })
    expect(matched).toHaveLength(2)
  })

  it('handles empty inputs gracefully', () => {
    expect(matchContextEntries('', [], 'zh-Hans')).toEqual([])
    expect(matchContextEntries('Hello', [], 'en')).toEqual([])
  })
})
