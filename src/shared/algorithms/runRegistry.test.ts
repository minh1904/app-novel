import { describe, expect, it } from 'vitest'
import {
  LEGACY_PROMPT,
  compareSnapshots,
  glossaryOriginOf,
  historyMarkdown,
  parseRegistry,
  promptVersionOf,
  runIdToIso,
  snapshotOf,
  summarizeRun,
  type Comparison,
  type MeasurementRecord,
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
    const row = (metric: string): Comparison['rows'][number] | undefined =>
      result.rows.find((r) => r.metric === metric)
    expect(row('Đoạn thiếu')?.better).toBe('b')
    expect(row('Glossary đúng')?.better).toBe('b')
    expect(row('Câu lệch cặp xưng hô')).toMatchObject({ a: '30%', b: '10%', better: 'b' })
    expect(row('Chi phí (USD)')?.better).toBe('a')
    expect(result.warnings).toHaveLength(3)
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
    expect(text).toContain('đừng sửa tay')
  })
})
