import { describe, expect, it } from 'vitest'
import { segment, longSegments, type SegmentLanguage } from './segmenter'
import { CORPUS } from './segmenterCorpus'

const texts = (input: string, lang: SegmentLanguage): string[] =>
  segment(input, lang).map((range) => input.slice(range.start, range.end))

describe('segment: regression corpus', () => {
  it.each(CORPUS)('%s', (_name, lang, input, expected) => {
    expect(texts(input, lang)).toEqual(expected)
  })
})

describe('segment: ranges', () => {
  it('start at the first character and end after the last one that is not white space', () => {
    const input = '　　甲乙。  \n\n  丙丁。\n'
    for (const range of segment(input, 'ja')) {
      expect(/\s/.test(input[range.start])).toBe(false)
      expect(/\s/.test(input[range.end - 1])).toBe(false)
    }
  })

  it('cut text containing emoji and rare Han characters on character boundaries', () => {
    const input = '𠮷野家は旨い。😀そうだ。'
    for (const range of segment(input, 'ja')) {
      const piece = input.slice(range.start, range.end)
      expect(piece).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/)
    }
  })

  it('segments Korean and an unprofiled valid tag without a closed locale table', () => {
    expect(texts('첫 문장입니다. 두 번째 문장입니다.', 'ko')).toHaveLength(2)
    expect(texts('Bonjour. Encore.', 'fr-CA')).toHaveLength(2)
  })

  it('give the same answer every time', () => {
    const input = 'Mr. Lee left. 「行こう。もう遅い。」\n\nDr. Kim stayed.'
    expect(segment(input, 'en')).toEqual(segment(input, 'en'))
  })
})

describe('longSegments', () => {
  it('flags only segments over 1,000 UTF-16 units, without cutting them', () => {
    const long = '字'.repeat(3000)
    const input = '短い。\n' + long + '\nまた短い。'
    const ranges = segment(input, 'ja')
    expect(ranges).toHaveLength(3)
    expect(longSegments(ranges)).toEqual([1])
    expect(input.slice(ranges[1].start, ranges[1].end)).toBe(long)
  })

  it('does not flag a segment of exactly 1,000 units', () => {
    const ranges = segment('字'.repeat(1000), 'ja')
    expect(longSegments(ranges)).toEqual([])
  })
})

describe('segment: invariants on random text', () => {
  /** Small deterministic PRNG so a failing run can be replayed from its seed. */
  function rng(seed: number): () => number {
    let state = seed >>> 0
    return () => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const TOKENS = [
    '。',
    '！',
    '？',
    '…',
    '……',
    '.',
    '!',
    '?',
    '...',
    '「',
    '」',
    '『',
    '』',
    '“',
    '”',
    '"',
    '(',
    ')',
    ' ',
    '  ',
    '\t',
    '\n',
    '\n\n',
    '\r\n',
    '　',
    'Mr.',
    'Dr.',
    'TP.',
    'Th.S.',
    'U.S.',
    'a',
    'b',
    'Bc',
    '山',
    '中',
    'あ',
    'い',
    'é',
    'é',
    '😀',
    '𠮷',
    '1',
    '3.5',
    ',',
    '—',
    '#',
    '***'
  ]
  const LANGUAGES: SegmentLanguage[] = ['en', 'vi', 'ja', 'zh-Hans', 'zh-Hant']

  for (const seed of [1, 2, 3, 20261001]) {
    it('holds for 150 random texts (seed ' + seed + ')', () => {
      const random = rng(seed)
      for (let run = 0; run < 150; run++) {
        const lang = LANGUAGES[Math.floor(random() * LANGUAGES.length)]
        const count = Math.floor(random() * 40)
        let input = ''
        for (let i = 0; i < count; i++) input += TOKENS[Math.floor(random() * TOKENS.length)]
        const label = 'seed ' + seed + ' run ' + run + ' ' + lang + ' ' + JSON.stringify(input)

        const ranges = segment(input, lang)

        let previousEnd = 0
        for (const range of ranges) {
          expect(range.start, label).toBeGreaterThanOrEqual(previousEnd)
          expect(range.end, label).toBeGreaterThan(range.start)
          expect(range.end, label).toBeLessThanOrEqual(input.length)
          expect(/\s/.test(input[range.start]), label).toBe(false)
          expect(/\s/.test(input[range.end - 1]), label).toBe(false)
          // A segment never spans two lines.
          expect(input.slice(range.start, range.end).includes('\n'), label).toBe(false)
          // Never between the halves of a surrogate pair.
          expect(/[\uD800-\uDBFF]$/.test(input.slice(range.start, range.end)), label).toBe(false)
          expect(/^[\uDC00-\uDFFF]/.test(input.slice(range.start, range.end)), label).toBe(false)
          previousEnd = range.end
        }

        // No letter lost or repeated: the pieces, minus white space, are the text, minus white space.
        const joined = ranges.map((r) => input.slice(r.start, r.end)).join('')
        expect(joined.replace(/\s/g, ''), label).toBe(input.replace(/\s/g, ''))

        // Same input, same answer.
        expect(segment(input, lang), label).toEqual(ranges)
      }
    })
  }
})

describe('segment: speed', () => {
  it.each([
    ['ja', '「おはよう。」と彼は言った。今日は晴れだ。「本当に？」彼女は笑った！\n'],
    ['zh-Hans', '他说：“你好。”然后离开了。今天天气很好！你呢？\n'],
    ['en', 'Mr. Smith went to Washington. He said, "Hello." It cost $3.50 today.\n']
  ] as const)('splits 300,000 characters of %s in under 500 ms', (lang, paragraph) => {
    const input = paragraph.repeat(Math.ceil(300_000 / paragraph.length)).slice(0, 300_000)
    segment(input, lang) // warm the segmenter, whose first use loads its data
    const started = performance.now()
    const ranges = segment(input, lang)
    const elapsed = performance.now() - started
    expect(ranges.length).toBeGreaterThan(1000)
    expect(elapsed).toBeLessThan(500)
  })
})
