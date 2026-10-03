import { describe, expect, it } from 'vitest'
import type { LinkRecord } from './links'
import { buildRows, normalizeRowText, rowState } from './rows'
import { segment } from '../algorithms/segmenter'
import type { SegmentRecord, TextRecord } from './text'

function record(content: string, prefix: string, lang: 'en' | 'vi'): TextRecord {
  const segments: SegmentRecord[] = segment(content, lang).map((range, index) => ({
    id: prefix + index,
    start: range.start,
    end: range.end,
    textRev: 1,
    status: 'ok'
  }))
  return { content, rev: 1, segments }
}

let counter = 0
function link(members: string[], over: Partial<LinkRecord> = {}): LinkRecord {
  return {
    id: 'l' + counter++,
    chapterId: 'c',
    kind: 'user',
    confidence: null,
    status: 'ok',
    members,
    createdAt: 1,
    reviewedAt: 1,
    ...over
  }
}

const SOURCE = record('One. Two. Three.\nFour.', 's', 'en')
const TARGET = record('Một. Hai. Ba.\nBốn.', 't', 'vi')

describe('rowState', () => {
  it('is untranslated without a translated segment', () => {
    expect(rowState([], false)).toBe('untranslated')
    expect(rowState([link(['s0'])], false)).toBe('untranslated')
  })

  it('reads a link that needs another look as check, a broken one too', () => {
    expect(rowState([link([], { status: 'needs_review' })], true)).toBe('check')
    expect(rowState([link([], { status: 'broken' })], true)).toBe('check')
  })

  it('reads an AI link nobody confirmed as ai, and a confirmed one as reviewed', () => {
    expect(rowState([link([], { kind: 'ai', reviewedAt: null })], true)).toBe('ai')
    expect(rowState([link([], { kind: 'ai', reviewedAt: 5 })], true)).toBe('reviewed')
    expect(rowState([link([])], true)).toBe('reviewed')
  })

  it('takes the most noteworthy of several links', () => {
    const reviewed = link([])
    const ai = link([], { kind: 'ai', reviewedAt: null })
    const check = link([], { status: 'needs_review' })
    expect(rowState([reviewed, ai], true)).toBe('ai')
    expect(rowState([reviewed, ai, check], true)).toBe('check')
  })
})

describe('buildRows', () => {
  it('makes a row of every source segment, untranslated when nothing is linked', () => {
    const view = buildRows(SOURCE, TARGET, [])
    expect(view.rows.map((row) => row.sourceText)).toEqual(['One.', 'Two.', 'Three.', 'Four.'])
    expect(view.rows.every((row) => row.state === 'untranslated' && row.targetText === '')).toBe(
      true
    )
    expect(view.counts).toEqual({ untranslated: 4, ai: 0, reviewed: 0, check: 0 })
    expect(view.unlinkedTargets).toHaveLength(4)
  })

  it('takes the translation of a row from its linked segments', () => {
    const view = buildRows(SOURCE, TARGET, [link(['s0', 't0']), link(['s3', 't3'])])
    expect(view.rows[0]).toMatchObject({ targetText: 'Một.', state: 'reviewed', targetIds: ['t0'] })
    expect(view.rows[1].state).toBe('untranslated')
    expect(view.rows[3].targetText).toBe('Bốn.')
    expect(view.counts).toMatchObject({ reviewed: 2, untranslated: 2 })
    expect(view.unlinkedTargets.map((s) => s.id)).toEqual(['t1', 't2'])
  })

  it('runs a row over all of its segments, and over the space between them', () => {
    const view = buildRows(SOURCE, TARGET, [link(['s0', 't0', 't1'])])
    expect(view.rows[0].targetIds).toEqual(['t0', 't1'])
    expect(view.rows[0].targetText).toBe('Một. Hai.')
  })

  it('puts the segments of a row in the order of the translation, not of the link', () => {
    const view = buildRows(SOURCE, TARGET, [link(['t1', 's0', 't0'])])
    expect(view.rows[0].targetIds).toEqual(['t0', 't1'])
  })

  it('counts each state', () => {
    const view = buildRows(SOURCE, TARGET, [
      link(['s0', 't0']),
      link(['s1', 't1'], { status: 'needs_review' }),
      link(['s2', 't2'], { kind: 'ai', reviewedAt: null })
    ])
    expect(view.counts).toEqual({ untranslated: 1, ai: 1, reviewed: 1, check: 1 })
  })

  it('builds 5,000 rows in well under a frame', () => {
    const text = Array.from({ length: 5000 }, (_, i) => 'Sentence ' + i + '.').join('\n')
    const source = record(text, 's', 'en')
    const target = record(text, 't', 'en')
    const links = source.segments.map((s, i) => link([s.id, target.segments[i].id]))
    const start = performance.now()
    const view = buildRows(source, target, links)
    expect(performance.now() - start).toBeLessThan(50)
    expect(view.rows).toHaveLength(5000)
    expect(view.counts.reviewed).toBe(5000)
  })
})

describe('normalizeRowText', () => {
  it('makes a line break and the white space around it one space, and trims the ends', () => {
    expect(normalizeRowText('  Một.\n  Hai.\r\nBa.  ')).toBe('Một. Hai. Ba.')
    expect(normalizeRowText('\n\n')).toBe('')
  })

  it('leaves other white space alone', () => {
    expect(normalizeRowText('A  B')).toBe('A  B')
  })
})
