import { describe, expect, it } from 'vitest'
import {
  METRIC_TIERS,
  batchOutcomes,
  benchChapters,
  brokenRunReason,
  comparableKeys,
  countOutcomes,
  decide,
  estimateRepeatCost,
  exclusionLine,
  fullyTranslatedChapters,
  groupRepeats,
  notRunChapter,
  parseOutcomeLines,
  refusalReasons,
  repeatBase,
  repeatLabels,
  spread,
  type ChapterOutcomes,
  type RepeatRun
} from './labOutcomes'

const ids = (n: number, prefix = 'p'): string[] =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`)

describe('batchOutcomes', () => {
  it('records 27 translated, 2 refused and 1 missing for the right ids', () => {
    const planned = ids(30)
    const result = batchOutcomes(planned, {
      proposed: planned.slice(0, 27),
      failed: planned.slice(27),
      refusals: [
        { id: 'p27', group: 'prohibited', raw: 'PROHIBITED_CONTENT' },
        { id: 'p28', group: 'other', raw: '' }
      ],
      error: { kind: 'refused' }
    })
    expect(countOutcomes([{ chapter: 1, ids: result.ids }])).toEqual({
      translated: 27,
      refused: 2,
      missing: 1,
      request_error: 0,
      not_run: 0
    })
    expect(result.ids.p29).toBe('missing')
    expect(result.reasons).toEqual({ p27: 'PROHIBITED_CONTENT', p28: 'other' })
  })

  it('records a batch the provider rejected as request_error, not refused', () => {
    const planned = ids(3)
    const result = batchOutcomes(planned, {
      proposed: [],
      failed: planned,
      refusals: [],
      error: { kind: 'invalid_request' }
    })
    expect(Object.values(result.ids)).toEqual(['request_error', 'request_error', 'request_error'])
  })

  it('records a batch lost to the network as missing', () => {
    const result = batchOutcomes(['a'], {
      proposed: [],
      failed: ['a'],
      refusals: [],
      error: { kind: 'network' }
    })
    expect(result.ids).toEqual({ a: 'missing' })
  })

  it('marks every paragraph of a chapter the run never reached as not_run', () => {
    expect(countOutcomes([notRunChapter(4, ids(5))]).not_run).toBe(5)
  })
})

describe('comparableKeys', () => {
  const chapter = (outcomes: Record<string, ChapterOutcomes['ids'][string]>): ChapterOutcomes => ({
    chapter: 3,
    ids: outcomes
  })

  it('drops a paragraph blocked in one variant from both, and says why', () => {
    const comparable = comparableKeys({
      A: [chapter({ p11: 'translated', p12: 'refused' })],
      B: [chapter({ p11: 'translated', p12: 'translated' })]
    })
    expect([...comparable.keys]).toEqual(['3:p11'])
    expect(comparable.excluded).toEqual({ A: { refused: 1 }, B: {} })
    expect(exclusionLine(comparable)).toBe('Chất lượng đo trên 1/2 đoạn; loại 1 đoạn: A refused 1.')
  })

  it('says there is nothing to compare when no paragraph is translated everywhere', () => {
    const comparable = comparableKeys({
      A: [chapter({ p1: 'refused' })],
      B: [chapter({ p1: 'translated' })]
    })
    expect(comparable.keys.size).toBe(0)
    expect(exclusionLine(comparable)).toMatch(/Không có đoạn chung để so/)
  })

  it('treats a chapter one variant has no outcomes for as not_run there', () => {
    const comparable = comparableKeys({ A: [chapter({ p1: 'translated' })], B: [] })
    expect(comparable.excluded.B).toEqual({ not_run: 1 })
  })
})

describe('parseOutcomeLines', () => {
  it('skips a half-written line and keeps the later line for a chapter', () => {
    const text =
      '{"chapter":1,"ids":{"a":"missing"}}\n{"chapter":1,"ids":{"a":"translated"}}\n{"chap\n'
    const lines = parseOutcomeLines(text)
    expect([...lines.keys()]).toEqual([1])
    expect(lines.get(1)?.ids.a).toBe('translated')
  })
})

describe('refusalReasons and fullyTranslatedChapters', () => {
  it('counts refusals by the provider’s reason', () => {
    expect(
      refusalReasons([
        {
          chapter: 1,
          ids: { a: 'refused', b: 'refused', c: 'translated' },
          reasons: { a: 'SAFETY', b: 'SAFETY' }
        }
      ])
    ).toEqual({ SAFETY: 2 })
  })

  it('keeps only chapters complete in both runs', () => {
    const a = { 'w/1': { x: 'translated' }, 'w/2': { y: 'refused' } } as const
    const b = { 'w/1': { x: 'translated' }, 'w/2': { y: 'translated' }, 'w/3': {} } as const
    expect(fullyTranslatedChapters(a, b)).toEqual(['w/1'])
  })
})

describe('benchChapters', () => {
  it('keeps the shared chapters and warns when a run has no outcomes', () => {
    expect(benchChapters(['w/1', 'w/2'], null, { 'w/1': {} })).toEqual({
      chapters: ['w/1', 'w/2'],
      note: 'Chỉ lấy giao chương, chưa loại đoạn bị từ chối (một lần chạy không có outcomes.json).'
    })
  })

  it('drops chapters with a paragraph not translated in either run', () => {
    const result = benchChapters(
      ['w/1', 'w/2'],
      { 'w/1': { a: 'translated' }, 'w/2': { b: 'refused' } },
      { 'w/1': { a: 'translated' }, 'w/2': { b: 'translated' } }
    )
    expect(result.chapters).toEqual(['w/1'])
    expect(result.note).toMatch(/^Loại 1\/2 chương/)
  })
})

describe('repeats', () => {
  it('names the repeats of a variant and reads the base back', () => {
    expect(repeatLabels('a-nothink', 3)).toEqual(['a-nothink#1', 'a-nothink#2', 'a-nothink#3'])
    expect(repeatBase('a-nothink#2')).toBe('a-nothink')
    expect(() => repeatLabels('a', 1)).toThrow(/≥ 2/)
  })

  it('estimates N runs from the price of chapters already translated, or says it cannot', () => {
    expect(estimateRepeatCost([{ usd: 0.02 }, { usd: 0.04 }, {}], 10, 3)).toBeCloseTo(0.9)
    expect(estimateRepeatCost([{}, { usd: 0 }], 10, 3)).toBeNull()
  })

  const run = (variant: string, patch: Partial<RepeatRun> = {}): RepeatRun => ({
    variant,
    runId: variant,
    model: 'm',
    thinking: 'off',
    promptVersion: 'translate-v5',
    contextHash: 'h',
    chapters: [1, 2],
    ...patch
  })

  it('groups repeats that share their configuration', () => {
    const { groups, rejected } = groupRepeats([run('a#1'), run('a#2'), run('a#3')])
    expect(groups.a).toHaveLength(3)
    expect(rejected).toEqual([])
  })

  it('refuses to group a repeat whose context changed, and says which', () => {
    const { groups, rejected } = groupRepeats([
      run('a#1'),
      run('a#2', { contextHash: 'other' }),
      run('a#3')
    ])
    expect(groups.a.map((r) => r.variant)).toEqual(['a#1', 'a#3'])
    expect(rejected).toEqual([
      { run: run('a#2', { contextHash: 'other' }), reason: 'ngữ cảnh khác hash' }
    ])
  })

  it('names a different chapter set', () => {
    const { rejected } = groupRepeats([run('a#1'), run('a#2'), run('a#3', { chapters: [1] })])
    expect(rejected[0].reason).toBe('tập chương khác')
  })
})

describe('spread', () => {
  it('handles n = 1, 2 and 5', () => {
    expect(spread([0.9])).toEqual({ n: 1, min: 0.9, max: 0.9, mean: 0.9, sd: 0 })
    const two = spread([1, 3])!
    expect(two).toMatchObject({ n: 2, min: 1, max: 3, mean: 2 })
    expect(two.sd).toBeCloseTo(Math.SQRT2)
    const five = spread([2, 4, 4, 4, 6])!
    expect(five).toMatchObject({ n: 5, min: 2, max: 6, mean: 4 })
    expect(five.sd).toBeCloseTo(Math.sqrt(2))
    expect(spread([])).toBeNull()
  })
})

describe('decide', () => {
  it('says “too few” with one run on each side', () => {
    expect(decide([0.9], [0.95], true)).toEqual({ verdict: 'too_few', better: null })
  })

  it('says “indistinguishable” when the ranges overlap', () => {
    expect(decide([0.92, 0.95], [0.94, 0.96], true)).toEqual({
      verdict: 'indistinguishable',
      better: null
    })
  })

  it('calls a difference only when the ranges do not overlap', () => {
    expect(decide([0.9, 0.91], [0.95, 0.96], true)).toEqual({ verdict: 'different', better: 'b' })
    expect(decide([2, 3], [5, 6], false)).toEqual({ verdict: 'different', better: 'a' })
  })
})

describe('METRIC_TIERS', () => {
  it('calls the glossary check a flag, not an error', () => {
    expect(METRIC_TIERS.glossary).toEqual({ tier: 'flag', label: 'Cờ glossary (khớp)' })
    expect(METRIC_TIERS.missingParagraphs.tier).toBe('gate')
    for (const entry of Object.values(METRIC_TIERS)) {
      expect(['gate', 'flag', 'judge', 'human']).toContain(entry.tier)
      if (entry.tier === 'flag') expect(entry.label).not.toMatch(/lỗi/i)
    }
  })
})

describe('brokenRunReason', () => {
  it('flags a run whose every call failed with 400, like v5-nothink+lite35', () => {
    expect(brokenRunReason({ calls: 12, httpErrors: 12, usd: 0 }, false)).toMatch(
      /mọi lời gọi lỗi HTTP/
    )
  })

  it('flags a run where request errors are half the paragraphs or more', () => {
    expect(
      brokenRunReason(
        {
          calls: 4,
          httpErrors: 2,
          usd: 0.01,
          outcomes: { counts: { translated: 5, request_error: 5 } }
        },
        true
      )
    ).toMatch(/request_error 5\/10/)
  })

  it('keeps a run that worked', () => {
    expect(
      brokenRunReason(
        { calls: 4, httpErrors: 1, usd: 0.2, outcomes: { counts: { translated: 9, refused: 1 } } },
        true
      )
    ).toBeNull()
  })
})
