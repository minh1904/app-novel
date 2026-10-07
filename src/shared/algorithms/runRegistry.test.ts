import { describe, expect, it } from 'vitest'
import {
  contextDifferences,
  LEGACY_PROMPT,
  combinedContextHash,
  compareGroups,
  compareSnapshots,
  completionCells,
  glossaryOriginOf,
  historyMarkdown,
  parseRegistry,
  promptVersionOf,
  runIdToIso,
  snapshotOf,
  summarizeRun,
  type Comparison,
  type MeasurementRecord,
  type VariantSnapshot,
  type RunRecord,
  type RegistryCall
} from './runRegistry'

const hash = (text: string): string => `h${text.length}`

function call(over: Partial<RegistryCall> = {}): RegistryCall {
  return {
    ncode: 'n1',
    variant: 'base',
    chapter: 1,
    messages: [
      { role: 'system', content: 'system A' },
      { role: 'user', content: '<source>\n[]\n</source>' }
    ],
    status: 200,
    inputTokens: 100,
    cachedTokens: 40,
    outputTokens: 50,
    reasoningTokens: 5,
    ms: 1500,
    ...over
  }
}

const meta = {
  runId: '2026-10-06T03-36-05-395Z',
  ncode: 'n1',
  variant: 'base',
  thinking: 'off',
  model: 'gemini-2.5-flash',
  commit: 'abc1234',
  dirty: false,
  usd: 0.01
}

function measurement(over: Partial<MeasurementRecord>): MeasurementRecord {
  return {
    kind: 'measurement',
    schema: 1,
    id: 'm',
    measuredAt: '2026-10-06T05:00:00.000Z',
    commit: 'abc1234',
    dirty: false,
    ncode: 'n1',
    variant: 'base',
    chapters: [1, 2, 3],
    runIds: [meta.runId],
    ...over
  }
}

describe('runRegistry', () => {
  it('đọc lại thời điểm từ tên thư mục lần chạy', () => {
    expect(runIdToIso('2026-10-06T03-36-05-395Z')).toBe('2026-10-06T03:36:05.395Z')
    expect(runIdToIso('lạ')).toBe('lạ')
  })

  it('nhận ra prompt hợp nhất và prompt cũ từ thẻ nguồn', () => {
    expect(promptVersionOf(call().messages, 'translate-v5')).toBe('translate-v5')
    expect(
      promptVersionOf([{ role: 'user', content: '<nguon>\n[]\n</nguon>' }], 'translate-v5')
    ).toBe(LEGACY_PROMPT)
    expect(promptVersionOf([{ role: 'user', content: 'khác' }], 'translate-v5')).toBeNull()
  })

  it('gộp lời gọi của một biến thể: token, chương, lỗi HTTP và các system prompt khác nhau', () => {
    const record = summarizeRun(
      [
        call(),
        call({ chapter: 3, status: 429 }),
        call({
          chapter: 2,
          messages: [
            { role: 'system', content: 'system B dài hơn' },
            { role: 'user', content: '<source>' }
          ]
        })
      ],
      meta,
      hash,
      'translate-v5'
    )
    expect(record.id).toBe(`${meta.runId}/n1/base`)
    expect(record.at).toBe('2026-10-06T03:36:05.395Z')
    expect(record.chapters).toEqual([1, 2, 3])
    expect(record.calls).toBe(3)
    expect(record.httpErrors).toBe(1)
    expect(record.inputTokens).toBe(300)
    expect(record.reasoningTokens).toBe(15)
    expect(record.seconds).toBe(4.5)
    expect(record.systemHashes).toEqual(['h16', 'h8'])
    expect(record.promptVersion).toBe('translate-v5')
  })

  it('bỏ qua dòng hỏng thay vì làm hỏng cả sổ', () => {
    expect(parseRegistry<{ a: number }>('{"a":1}\n{hỏng\n\n{"a":2}\n')).toEqual([
      { a: 1 },
      { a: 2 }
    ])
  })

  it('ảnh chụp lấy từng chỉ số từ lần đo gần nhất có chỉ số đó', () => {
    const run = summarizeRun([call()], meta, hash, 'translate-v5')
    const snap = snapshotOf(
      'n1',
      'base',
      [run],
      [
        measurement({ measuredAt: '2026-10-06T05:00:00.000Z', glossary: { hits: 5, checks: 10 } }),
        measurement({ measuredAt: '2026-10-06T06:00:00.000Z', glossary: { hits: 9, checks: 10 } }),
        measurement({
          measuredAt: '2026-10-06T07:00:00.000Z',
          addressing: { labels: 'base', checked: 20, off: 2 }
        })
      ]
    )
    expect(snap.glossary?.value.hits).toBe(9)
    expect(snap.addressing?.value.off).toBe(2)
    expect(snap.runs).toEqual([run])
  })

  it('so hai biến thể và cảnh báo khi đo trên chương hoặc nhãn khác nhau', () => {
    const runA = summarizeRun([call()], meta, hash, 'translate-v5')
    const runB = summarizeRun([call()], { ...meta, variant: 'b', usd: 0.02 }, hash, 'translate-v5')
    const a = snapshotOf(
      'n1',
      'base',
      [runA],
      [
        measurement({
          structure: { chapters: 3, mismatched: 1, missingParagraphs: 2 },
          glossary: { hits: 8, checks: 10 },
          addressing: { labels: 'base', checked: 10, off: 3 }
        })
      ]
    )
    const b = snapshotOf(
      'n1',
      'b',
      [runB],
      [
        measurement({
          variant: 'b',
          chapters: [1, 2],
          structure: { chapters: 2, mismatched: 0, missingParagraphs: 0 },
          glossary: { hits: 9, checks: 10 },
          addressing: { labels: 'b', checked: 10, off: 1 }
        })
      ]
    )
    const result = compareSnapshots(a, b)
    const row = (start: string): Comparison['rows'][number] | undefined =>
      result.rows.find((r) => r.metric.startsWith(start))
    // One run a side: numbers are shown, but nothing is called better.
    expect(row('Đoạn thiếu')).toMatchObject({ a: '2', b: '0', better: null, verdict: 'too_few', tier: 'gate' })
    expect(row('Cờ glossary')).toMatchObject({ a: '80%', b: '90%', better: null, tier: 'flag' })
    expect(row('Cờ glossary')?.metric).toContain('chưa đủ lần lặp')
    expect(row('Cờ xưng hô lệch')).toMatchObject({ a: '30%', b: '10%', better: null })
    expect(row('Chi phí (USD)')?.better).toBeNull()
    expect(result.rows.every((r) => !/lỗi glossary/i.test(r.metric))).toBe(true)
    expect(result.warnings).toHaveLength(3)
  })

  it('so nhóm lần lặp: chỉ kết luận khi khoảng hai bên không chồng nhau', () => {
    const snap = (variant: string, hits: number, missing: number): VariantSnapshot =>
      snapshotOf(
        'n1',
        variant,
        [],
        [
          measurement({
            variant,
            structure: { chapters: 3, mismatched: 0, missingParagraphs: missing },
            glossary: { hits, checks: 100 }
          })
        ]
      )
    const result = compareGroups(
      [snap('a#1', 92, 4), snap('a#2', 95, 5)],
      [snap('b#1', 94, 0), snap('b#2', 96, 1)]
    )
    const row = (start: string): Comparison['rows'][number] =>
      result.rows.find((r) => r.metric.startsWith(start))!
    expect(row('Cờ glossary')).toMatchObject({ verdict: 'indistinguishable', better: null })
    expect(row('Cờ glossary').a).toBe('n=2 · 92%–95% · tb 93.5% ± 2.1')
    expect(row('Đoạn thiếu')).toMatchObject({ verdict: 'different', better: 'b' })
  })

  it('nhận nguồn gốc glossary từ trường origin, hoặc từ ghi chú "Nháp do Claude" của tệp cũ', () => {
    expect(glossaryOriginOf({ origin: 'ai' })).toBe('ai')
    expect(glossaryOriginOf({ note: 'Nháp do Claude soạn 2026-10-05 từ tần suất tên' })).toBe(
      'claude-draft'
    )
    expect(glossaryOriginOf({ note: 'Người dịch duyệt' })).toBe('unknown')
    expect(glossaryOriginOf(null)).toBe('unknown')
  })

  it('trang lịch sử có bảng hiện tại và dòng thời gian của từng truyện', () => {
    const run = summarizeRun(
      [call()],
      { ...meta, glossary: { hash: 'g1', origin: 'claude-draft' } },
      hash,
      'translate-v5'
    )
    const text = historyMarkdown(
      [run],
      [
        measurement({
          structure: { chapters: 3, mismatched: 0, missingParagraphs: 0 },
          glossary: { hits: 9, checks: 10 }
        })
      ],
      { n1: 'Truyện thử' },
      '2026-10-06T08:00:00.000Z'
    )
    expect(text).toContain('## Truyện thử (n1)')
    expect(text).toContain(
      '| base | gemini-2.5-flash | off | translate-v5 | h8 | abc1234 | claude-draft | 1–3 | 0 | 0 | 90% (9/10) | – | – | $0.010 |'
    )
    expect(text).toContain('Mọi lần đo, mới nhất trước:')
    expect(text).toContain('| Lúc đo | Biến thể | Chương | Cơ sở |')
    expect(text).toContain('theo chương')
    expect(text).toContain('đừng sửa tay')
  })

  it('tách lần chạy chết vì 400 khỏi bảng chính, kèm lý do', () => {
    const good = summarizeRun([call()], meta, hash, 'translate-v5')
    const dead = summarizeRun(
      [call({ status: 400 }), call({ chapter: 2, status: 400 })],
      { ...meta, runId: '2026-10-07T15-51-51-275Z', variant: 'v5-nothink+lite35', usd: 0 },
      hash,
      'translate-v5'
    )
    const text = historyMarkdown(
      [good, dead],
      [measurement({ structure: { chapters: 3, mismatched: 0, missingParagraphs: 0 } })],
      {},
      '2026-10-07T16:00:00.000Z'
    )
    expect(text).toContain('Lần chạy hỏng (không vào bảng so sánh chính):')
    expect(text).toContain('| v5-nothink+lite35 | gemini-2.5-flash | off | mọi lời gọi lỗi HTTP (2/2) | $0.000 |')
    expect(text).not.toMatch(/^\| v5-nothink\+lite35 \| gemini-2\.5-flash \| off \| translate-v5/m)
  })

  it('ghi ngân sách lời gọi của lần chạy khi có, và không ghi gì khi không có', () => {
    const budget = { modelCalls: 14, budgetExhausted: 2, maxCalls: 4 }
    expect(summarizeRun([call()], { ...meta, budget }, hash, 'translate-v5').budget).toEqual(budget)
    expect(summarizeRun([call()], meta, hash, 'translate-v5')).not.toHaveProperty('budget')
  })

  it('ghi schema 2 với kết cục và hash ngữ cảnh; vẫn đọc bản ghi schema 1', () => {
    const counts = { translated: 9, refused: 1, missing: 0, request_error: 0, not_run: 0 }
    const record = summarizeRun(
      [call()],
      { ...meta, contexts: { '2': 'b', '1': 'a' }, outcomes: { file: 'n1-base.outcomes.jsonl', counts } },
      hash,
      'translate-v5'
    )
    expect(record.schema).toBe(2)
    expect(record.outcomes).toEqual({ file: 'n1-base.outcomes.jsonl', counts })
    expect(record.contextHash).toBe(combinedContextHash({ '1': 'a', '2': 'b' }, hash))
    const old = parseRegistry<RunRecord>(JSON.stringify({ ...record, schema: 1, outcomes: undefined }))[0]
    expect(completionCells(old.outcomes?.counts ?? null)[0]).toBe('không có kết cục từng đoạn')
    expect(completionCells(counts)[0]).toBe('9/10 (90%)')
  })

  it('băm ngữ cảnh gộp không phụ thuộc thứ tự chương', () => {
    expect(combinedContextHash({ '2': 'y', '10': 'z', '1': 'x' }, hash)).toBe(
      combinedContextHash({ '1': 'x', '2': 'y', '10': 'z' }, hash)
    )
    expect(combinedContextHash({}, hash)).toBeUndefined()
  })
})

describe('contextDifferences', () => {
  it('names the chapters whose context snapshot differs between two runs', () => {
    expect(contextDifferences({ '1': 'a', '2': 'b', '3': 'c' }, { '1': 'a', '2': 'x', '3': 'c' })).toEqual({
      differ: [2],
      unknown: []
    })
  })

  it('cannot tell for a chapter only one run recorded, nor for runs from before snapshots', () => {
    expect(contextDifferences({ '1': 'a', '2': 'b' }, { '1': 'a' })).toEqual({ differ: [], unknown: [2] })
    expect(contextDifferences(undefined, undefined)).toEqual({ differ: [], unknown: [] })
  })
})
