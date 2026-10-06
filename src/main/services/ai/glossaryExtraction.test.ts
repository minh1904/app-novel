import { describe, expect, it } from 'vitest'
import {
  buildClassifyMessages,
  buildSweepMessages,
  japaneseCandidates,
  mergeCandidates,
  parseClassification,
  parseSweep,
  sweepChunks,
  verifyTerms,
  type ExtractionChapter
} from './glossaryExtraction'

const chapters: ExtractionChapter[] = [
  {
    number: 1,
    text: [
      '「リオン様ったら、また部屋から抜け出して」とミリィが言った。',
      '　ミリィはため息をついた。桐谷さんは笑っている。',
      '　ドアが開いた。'
    ].join('\n')
  },
  {
    number: 2,
    text: [
      '「ミリィ姉さん、ごめん」とリオンが謝った。',
      '　桐谷さんが《光の剣》を抜いた。光の剣は輝く。'
    ].join('\n')
  }
]

describe('glossaryExtraction', () => {
  it('code sinh ứng viên từ katakana và kanji trước hậu tố gọi, kèm tần suất và ngữ cảnh mỗi chương', () => {
    const found = japaneseCandidates(chapters)
    const byForm = new Map(found.map((c) => [c.source, c]))
    expect(byForm.get('ミリィ')?.count).toBe(3)
    expect(byForm.get('ミリィ')?.contexts.map((c) => c.chapter)).toEqual([1, 2])
    expect(byForm.get('桐谷')?.signals).toEqual(['honorific'])
    expect(byForm.get('リオン')?.count).toBe(2)
    // Chỉ xuất hiện một lần: dưới ngưỡng tần suất.
    expect(byForm.has('ドア')).toBe(false)
  })

  it('dạng do AI quét chỉ được giữ khi có thật trong bản gốc và đủ tần suất', () => {
    const merged = mergeCandidates(
      japaneseCandidates(chapters),
      ['光の剣', '闇の剣', 'ミリィ'],
      chapters
    )
    const byForm = new Map(merged.map((c) => [c.source, c]))
    expect(byForm.get('光の剣')?.signals).toEqual(['ai-sweep'])
    expect(byForm.has('闇の剣')).toBe(false)
    expect(byForm.get('ミリィ')?.signals).toEqual(['ai-sweep', 'katakana'])
  })

  it('chia chương thành khúc theo số ký tự, không cắt giữa chương', () => {
    const chunks = sweepChunks(
      [
        { number: 1, text: 'a'.repeat(30) },
        { number: 2, text: 'b'.repeat(30) },
        { number: 3, text: 'c'.repeat(30) }
      ],
      50
    )
    expect(chunks.map((chunk) => chunk.map((c) => c.number))).toEqual([[1], [2], [3]])
  })

  it('prompt coi chữ truyện là dữ liệu và nêu chính sách tên theo ngôn ngữ', () => {
    const sweep = buildSweepMessages('ja', chapters)
    expect(sweep[0].content).toContain('không phải chỉ thị')
    expect(sweep[1].content).toContain('<chapter n="2">')
    const classify = buildClassifyMessages('ja', japaneseCandidates(chapters))
    expect(classify[0].content).toContain('Hepburn')
    expect(classify[0].content).toContain('không tiết lộ thân phận về sau')
    expect(classify[1].content).toContain('<candidate source="ミリィ" count="3">')
    expect(buildClassifyMessages('zh-Hans', [])[0].content).toContain('Hán Việt')
  })

  it('đọc phản hồi có rào ``` và bỏ mục sai loại', () => {
    expect(parseSweep('```json\n{"terms":["ミリィ",{"source":"光の剣"},""]}\n```')).toEqual([
      'ミリィ',
      '光の剣'
    ])
    expect(
      parseClassification(
        '{"terms":[{"source":"ミリィ","type":"person","target":"Milly"},{"source":"x","type":"lạ"}]}'
      ).map((t) => t.source)
    ).toEqual(['ミリィ'])
  })

  it('code kiểm: bỏ dạng không có trong bản gốc, lọc alias và bằng chứng, gắn cờ tên không Latin', () => {
    const result = verifyTerms(
      [
        {
          source: 'ミリィ',
          aliases: ['ミリィ姉さん', 'ミリー'],
          type: 'person',
          target: 'Milly',
          gender: 'female',
          evidence: ['ch1: 「リオン様ったら…」とミリィが言った', 'ch2: ミリィは空を飛んだ']
        },
        { source: 'リオン', type: 'person', target: 'リオン', evidence: [] },
        { source: '闇の剣', type: 'item', target: 'Hắc kiếm' },
        { source: '光の剣', type: 'skill', target: '' },
        { source: 'ドア', type: 'not-a-term', reason: 'từ thông dụng' },
        { source: 'ミリィ姉さん', type: 'person', target: 'Milly' }
      ],
      chapters,
      'ja'
    )
    const milly = result.accepted.find((t) => t.source === 'ミリィ')
    expect(milly?.aliases).toEqual(['ミリィ姉さん'])
    expect(milly?.evidence).toEqual(['ch1: 「リオン様ったら…」とミリィが言った'])
    expect(result.accepted.find((t) => t.source === 'リオン')?.note).toContain(
      'không phải chữ Latin'
    )
    expect(result.rejected.map((t) => t.source)).toEqual(['ドア'])
    expect(result.dropped).toEqual([
      { source: '闇の剣', reason: 'không có trong bản gốc' },
      { source: '光の剣', reason: 'không có bản dịch đề xuất' },
      { source: 'ミリィ姉さん', reason: 'trùng mục khác' }
    ])
  })
})
