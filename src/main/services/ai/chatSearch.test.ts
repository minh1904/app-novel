import { describe, expect, it } from 'vitest'
import type { LinkRecord, LinkStatus } from '../../../shared/contracts/links'
import type { SegmentRecord, TextRecord } from '../../../shared/contracts/text'
import { counterpartOf, findMatches } from './chatSearch'

function record(content: string, cuts: Array<[string, string]>, rev = 1): TextRecord {
  const segments: SegmentRecord[] = cuts.map(([id, text]) => {
    const start = content.indexOf(text)
    return { id, start, end: start + text.length, textRev: rev, status: 'ok' }
  })
  return { content, rev, segments } as TextRecord
}

function link(id: string, members: string[], status: LinkStatus = 'ok'): LinkRecord {
  return {
    id,
    chapterId: 'c',
    kind: 'user',
    confidence: null,
    status,
    members,
    createdAt: 0,
    reviewedAt: null
  }
}

const SOURCE = record('魔王が来た。\n勇者は逃げた。', [
  ['s1', '魔王が来た。'],
  ['s2', '勇者は逃げた。']
])
const TARGET = record('Ma vương đã đến.\nDũng giả bỏ chạy.\nCậu ta chạy rất nhanh.', [
  ['t1', 'Ma vương đã đến.'],
  ['t2', 'Dũng giả bỏ chạy.'],
  ['t3', 'Cậu ta chạy rất nhanh.']
])

describe('findMatches', () => {
  it('finds a two-character CJK name with no spaces around it', () => {
    expect(findMatches('昔、魔王がいた。魔王は強い。', '魔王')).toEqual([2, 8])
  })

  it('matches Latin letters regardless of case', () => {
    expect(findMatches('Ma Vương và ma vương', 'MA VƯƠNG')).toEqual([0, 12])
  })

  it('compares composed and decomposed Vietnamese as the same text', () => {
    const decomposed = 'vướng'.normalize('NFD')
    expect(decomposed.length).toBeGreaterThan(5)
    expect(findMatches('một vướng mắc', decomposed)).toEqual([4])
  })

  it('finds nothing when the text does not have it', () => {
    expect(findMatches('không có', '魔王')).toEqual([])
  })
})

describe('counterpartOf', () => {
  it('gives the linked translation, both segments in translation order', () => {
    const links = [link('l1', ['s2', 't3', 't2'])]
    expect(counterpartOf('source', SOURCE.content.indexOf('勇者'), SOURCE, TARGET, links)).toEqual({
      kind: 'linked',
      texts: ['Dũng giả bỏ chạy.', 'Cậu ta chạy rất nhanh.'],
      uncertain: false
    })
  })

  it('goes the other way from the translation to the source', () => {
    const links = [link('l1', ['s1', 't1'])]
    expect(counterpartOf('target', 3, SOURCE, TARGET, links)).toMatchObject({
      kind: 'linked',
      texts: ['魔王が来た。']
    })
  })

  it('says unaligned when the segment has no link, and never pairs by paragraph number', () => {
    // s1 and t1 are both "paragraph 1", and that must not count as evidence.
    expect(counterpartOf('source', 0, SOURCE, TARGET, [])).toEqual({ kind: 'unaligned' })
    expect(counterpartOf('source', 0, SOURCE, TARGET, [link('l', ['s2', 't2'])])).toEqual({
      kind: 'unaligned'
    })
  })

  it('says unaligned when the match is in no segment', () => {
    const bare = { ...SOURCE, segments: [] } as TextRecord
    expect(counterpartOf('source', 0, bare, TARGET, [link('l', ['s1', 't1'])])).toEqual({
      kind: 'unaligned'
    })
  })

  it.each<LinkStatus>(['needs_review', 'broken'])(
    'still gives the text of a %s link, marked uncertain',
    (status) => {
      expect(counterpartOf('source', 0, SOURCE, TARGET, [link('l', ['s1', 't1'], status)])).toEqual(
        { kind: 'linked', texts: ['Ma vương đã đến.'], uncertain: true }
      )
    }
  )

  it('marks a segment written for an older revision as uncertain', () => {
    const stale = record(TARGET.content, [['t1', 'Ma vương đã đến.']], 1)
    const moved = { ...stale, rev: 2 } as TextRecord
    expect(counterpartOf('source', 0, SOURCE, moved, [link('l', ['s1', 't1'])])).toMatchObject({
      kind: 'linked',
      uncertain: true
    })
  })
})
