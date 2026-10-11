import { describe, expect, it } from 'vitest'
import { applyEdits, checkSegments, resegment, type Edit, type Seg } from './segmentMap'
import { segment, type SegmentLanguage } from './segmenter'

/** Văn bản kèm các segment tên s0, s1, … giống như trạng thái kho lưu trữ sau khi nhập. */
function load(content: string, lang: SegmentLanguage): { content: string; segs: Seg[] } {
  const segs = segment(content, lang).map((range, index) => ({
    id: 's' + index,
    from: range.start,
    to: range.end,
    edited: false
  }))
  return { content, segs }
}

function change(
  doc: { content: string; segs: Seg[] },
  edit: Edit
): { content: string; segs: Seg[] } {
  return {
    content: doc.content.slice(0, edit.from) + edit.insert + doc.content.slice(edit.to),
    segs: applyEdits(doc.segs, [edit])
  }
}

const insertAt = (_doc: unknown, offset: number, insert: string): Edit => ({
  from: offset,
  to: offset,
  insert
})

const texts = (doc: { content: string; segs: Seg[] }): string[] =>
  doc.segs.map((seg) => doc.content.slice(seg.from, seg.to))

const ids = (segs: Seg[]): Array<string | null> => segs.map((seg) => seg.id)

describe('applyEdits: segments nobody touched', () => {
  const lines = Array.from({ length: 200 }, (_, i) => 'Câu số ' + i + ' ở đây.').join('\n')

  it('keep their ID and text, and shift by the length added in front of them', () => {
    const before = load(lines, 'en')
    const at = before.segs[3].from + 4
    const after = change(before, insertAt(before, at, 'rất '))
    expect(ids(after.segs)).toEqual(ids(before.segs))
    texts(after).forEach((text, index) => {
      if (index === 3) return
      expect(text).toBe(texts(before)[index])
    })
    after.segs.slice(4).forEach((seg, index) => {
      expect(seg.from).toBe(before.segs[index + 4].from + 4)
      expect(seg.edited).toBe(false)
    })
    expect(after.segs[3].edited).toBe(true)
  })

  it('lose only the segments an edit covers', () => {
    const before = load(lines, 'en')
    const after = change(before, { from: before.segs[10].from, to: before.segs[11].to, insert: '' })
    expect(ids(after.segs)).toEqual(ids(before.segs).filter((id) => id !== 's10' && id !== 's11'))
  })
})

describe('applyEdits: inside one segment', () => {
  it('typing in the middle keeps the segment and its ID', () => {
    const before = load('Trời mưa to.', 'en')
    const after = change(before, insertAt(before, 5, 'rất '))
    expect(after.segs).toEqual([{ id: 's0', from: 0, to: 16, edited: true }])
    expect(texts(after)).toEqual(['Trời rất mưa to.'])
  })

  it('replacing a selection inside it keeps the ID', () => {
    const before = load('Trời mưa to.', 'en')
    const after = change(before, { from: 5, to: 8, insert: 'nắng' })
    expect(texts(after)).toEqual(['Trời nắng to.'])
    expect(ids(after.segs)).toEqual(['s0'])
  })

  it('replacing a whole sentence keeps its ID', () => {
    const before = load('Một câu. Câu khác.', 'en')
    const after = change(before, { from: 0, to: 7, insert: 'Mới hẳn' })
    expect(ids(after.segs)).toEqual(['s0', 's1'])
    expect(texts(after)[0]).toBe('Mới hẳn.')
  })
})

describe('applyEdits: at the edge of a segment', () => {
  it('text typed after the last character joins the segment', () => {
    const before = load('Trời mưa.', 'en')
    const after = change(before, insertAt(before, 9, ' Gió rất to'))
    expect(ids(after.segs)).toEqual(['s0'])
    expect(texts(after)).toEqual(['Trời mưa. Gió rất to'])
  })

  it('a line break typed there leaves the segment alone', () => {
    const before = load('Trời mưa.', 'en')
    const after = change(before, insertAt(before, 9, '\n'))
    expect(after.segs).toEqual(before.segs)
  })

  it('only the part before the first line break joins', () => {
    const before = load('Trời mưa.', 'en')
    const after = change(before, insertAt(before, 9, ' Hết\nDòng mới'))
    expect(texts(after)).toEqual(['Trời mưa. Hết'])
  })

  it('white space alone does not extend it', () => {
    const before = load('Trời mưa.', 'en')
    const after = change(before, insertAt(before, 9, '   '))
    expect(after.segs[0]).toEqual(before.segs[0])
  })

  it('text typed in front of a sentence joins it', () => {
    const before = load('Anh ở nhà.', 'en')
    const after = change(before, insertAt(before, 0, 'Rồi '))
    expect(after.segs).toEqual([{ id: 's0', from: 0, to: 14, edited: true }])
  })

  it('belongs to the left segment where two touch', () => {
    const before = load('他走了。然后来了。', 'zh-Hans')
    expect(before.segs[0].to).toBe(before.segs[1].from)
    const after = change(before, insertAt(before, before.segs[0].to, '，真的'))
    expect(texts(after)[0]).toBe('他走了。，真的')
    expect(after.segs[1].from).toBe(before.segs[1].from + 3)
  })
})

describe('applyEdits: new text outside every segment', () => {
  it('on a blank line becomes a segment with no ID once split', () => {
    const before = load('Một.\n\nHai.', 'en')
    const typed = change(before, insertAt(before, 5, 'Cô đi ra ngoài.'))
    expect(typed.segs).toHaveLength(2)
    const after = resegment(typed.content, typed.segs, 'en')
    expect(texts({ content: typed.content, segs: after })).toEqual([
      'Một.',
      'Cô đi ra ngoài.',
      'Hai.'
    ])
    expect(ids(after)).toEqual(['s0', null, 's1'])
  })

  it('white space or a line break creates nothing', () => {
    const before = load('Một.\n\nHai.', 'en')
    const typed = change(before, insertAt(before, 5, '  \n'))
    expect(resegment(typed.content, typed.segs, 'en')).toEqual(typed.segs)
  })
})

describe('applyEdits: deleting across segments', () => {
  it('from the middle of one sentence to the middle of the next merges them under the first ID', () => {
    const before = load('Trời mưa to. Anh ở nhà.', 'en')
    const from = before.content.indexOf('to.')
    const to = before.content.indexOf('ở nhà')
    const after = change(before, { from, to, insert: '' })
    expect(ids(after.segs)).toEqual(['s0'])
    expect(texts(after)).toEqual(['Trời mưa ở nhà.'])
  })

  it('a whole sentence disappears and the others keep their IDs', () => {
    const before = load('A một. B hai. C ba. D bốn.', 'en')
    const after = change(before, { from: before.segs[2].from, to: before.segs[2].to, insert: '' })
    expect(ids(after.segs)).toEqual(['s0', 's1', 's3'])
  })

  it('a whole sentence and the start of the next leaves the next one with its ID', () => {
    const before = load('Trời mưa to. Anh ở nhà.', 'en')
    const to = before.content.indexOf('ở nhà')
    const after = change(before, { from: 0, to, insert: '' })
    expect(ids(after.segs)).toEqual(['s1'])
    expect(texts(after)).toEqual(['ở nhà.'])
  })
})

describe('resegment', () => {
  it('splits what a multi-line paste made and gives the old ID to exactly one of the pieces', () => {
    const before = load('Trời mưa to.', 'en')
    const typed = change(before, insertAt(before, 5, 'a.\nb.\nc. '))
    const after = resegment(typed.content, typed.segs, 'en')
    expect(checkSegments(typed.content, after)).toEqual([])
    expect(ids(after).filter((id) => id === 's0')).toHaveLength(1)
    expect(after.length).toBeGreaterThan(1)
    expect(after.some((seg) => seg.id === null)).toBe(true)
  })

  it('gives all-new IDs to 40 pasted lines and keeps the IDs outside them', () => {
    const before = load('Đầu.\n\nCuối.', 'en')
    const paste = Array.from({ length: 40 }, (_, i) => 'Dòng ' + i + '.').join('\n')
    const typed = change(before, insertAt(before, 5, paste))
    const after = resegment(typed.content, typed.segs, 'en')
    expect(after).toHaveLength(42)
    expect(after[0].id).toBe('s0')
    expect(after[41].id).toBe('s1')
    expect(after.slice(1, 41).every((seg) => seg.id === null)).toBe(true)
  })

  it('leaves a sibling sentence on the same line unedited, with its ID', () => {
    const before = load('Một câu. Hai câu. Ba câu.', 'en')
    const typed = change(before, insertAt(before, 4, ' nữa'))
    const after = resegment(typed.content, typed.segs, 'en')
    expect(ids(after)).toEqual(['s0', 's1', 's2'])
    expect(after.map((seg) => seg.edited)).toEqual([true, false, false])
  })

  it('returns the same array when nothing is disturbed', () => {
    const before = load('Một. Hai.\nBa.', 'en')
    expect(resegment(before.content, before.segs, 'en')).toBe(before.segs)
  })

  it('keeps characters outside the basic plane whole', () => {
    const before = load('𠮷野家は旨い。😀そうだ。', 'ja')
    const typed = change(before, insertAt(before, before.content.indexOf('そ'), '𠮷'))
    const after = resegment(typed.content, typed.segs, 'ja')
    expect(checkSegments(typed.content, after)).toEqual([])
  })
})

describe('checkSegments', () => {
  it('finds text outside every segment, a segment over a line break and an overlap', () => {
    expect(checkSegments('Một.\nHai.', [{ id: 'a', from: 0, to: 4, edited: false }])).not.toEqual(
      []
    )
    expect(checkSegments('Một.\nHai.', [{ id: 'a', from: 0, to: 9, edited: false }])).not.toEqual(
      []
    )
    expect(
      checkSegments('Một Hai', [
        { id: 'a', from: 0, to: 5, edited: false },
        { id: 'b', from: 3, to: 7, edited: false }
      ])
    ).not.toEqual([])
  })

  it('accepts what the splitter makes', () => {
    const doc = load('　　他站在山顶。风很大。\n\n“你来了。”\n', 'zh-Hans')
    expect(checkSegments(doc.content, doc.segs)).toEqual([])
  })
})

// Bộ sinh ngẫu nhiên nhỏ dựa trên seed để có thể tái hiện lỗi kiểm thử.
function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SNIPPETS = [
  '字',
  'abc ',
  '\n',
  '。',
  '😀',
  '\n新しい。\n',
  ' Hello. World.',
  '　',
  '“好。”',
  '𠮷',
  '\r',
  '…'
]
const SAMPLES: Array<[SegmentLanguage, string]> = [
  [
    'zh-Hans',
    '　　他站在山顶，望着远方。风很大。\n\n“你来了。”一个声音说道。他没有回头。\n第二章 开始\n\n夜深了。月亮升起来了。'
  ],
  ['ja', '彼は黙った……そして去った。\n「行こう。もう遅い。」\n𠮷野家は旨い。😀そうだ。'],
  [
    'en',
    'He stood on the hill. Mr. Smith did not turn.\n\nIt cost $3.50 today. Then it rose.\nWait... what? Yes!!'
  ]
]

function safeOffset(content: string, offset: number): number {
  const before = content.charCodeAt(offset - 1)
  const after = content.charCodeAt(offset)
  if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) return offset + 1
  return offset
}

function randomEdit(content: string, next: () => number): Edit {
  const at = (): number => safeOffset(content, Math.floor(next() * (content.length + 1)))
  const kind = next()
  const from = at()
  if (kind < 0.4) return { from, to: from, insert: SNIPPETS[Math.floor(next() * SNIPPETS.length)] }
  const to = safeOffset(content, Math.min(content.length, from + Math.floor(next() * 30)))
  const insert = kind < 0.7 ? '' : SNIPPETS[Math.floor(next() * SNIPPETS.length)]
  return { from, to, insert }
}

const stripped = (text: string): string => text.replace(/\s/g, '')

describe('random edits', () => {
  for (const [lang, sample] of SAMPLES) {
    it('keep every invariant after being split again (' + lang + ')', () => {
      for (let seed = 1; seed <= 25; seed++) {
        const next = random(seed)
        let doc = load(sample, lang)
        const known = new Set(ids(doc.segs))
        for (let step = 0; step < 60; step++) {
          const edit = randomEdit(doc.content, next)
          const touchedFrom = doc.content.lastIndexOf('\n', Math.max(0, edit.from - 1)) + 1
          const nextBreak = doc.content.indexOf('\n', edit.to)
          const touchedTo = nextBreak === -1 ? doc.content.length : nextBreak
          const old = doc
          const moved = change(doc, edit)
          const split = resegment(moved.content, moved.segs, lang)
          doc = { content: moved.content, segs: split }

          expect(checkSegments(doc.content, doc.segs), 'seed ' + seed + ' step ' + step).toEqual([])
          // Không mất hoặc lặp ký tự: nội dung các segment ghép lại đúng bằng nội dung văn bản (bỏ khoảng trắng).
          expect(stripped(texts(doc).join(''))).toBe(stripped(doc.content))
          for (const seg of doc.segs) if (seg.id !== null) expect(known.has(seg.id)).toBe(true)
          // Các dòng không bị chỉnh sửa chạm đến sẽ giữ nguyên ID và nội dung văn bản.
          const delta = edit.insert.length - (edit.to - edit.from)
          for (const seg of old.segs) {
            if (seg.id === null) continue
            const unchanged =
              seg.to <= touchedFrom - 1 || seg.from > touchedTo
                ? doc.segs.find((candidate) => candidate.id === seg.id)
                : undefined
            if (unchanged === undefined) continue
            const shift = seg.from > touchedTo ? delta : 0
            expect(unchanged.from).toBe(seg.from + shift)
            expect(doc.content.slice(unchanged.from, unchanged.to)).toBe(
              old.content.slice(seg.from, seg.to)
            )
          }
          const keep = (seg: Seg): boolean => seg.to <= touchedFrom - 1 || seg.from > touchedTo
          for (const seg of old.segs.filter(
            (candidate) => candidate.id !== null && keep(candidate)
          )) {
            expect(
              doc.segs.some((candidate) => candidate.id === seg.id),
              'seed ' + seed
            ).toBe(true)
          }
        }
      }
    })

    it('give the same result every time (' + lang + ')', () => {
      const run = (): Seg[] => {
        const next = random(7)
        let doc = load(sample, lang)
        for (let step = 0; step < 40; step++) {
          const moved = change(doc, randomEdit(doc.content, next))
          doc = { content: moved.content, segs: resegment(moved.content, moved.segs, lang) }
        }
        return doc.segs
      }
      expect(run()).toEqual(run())
    })
  }
})

describe('applyEdits: speed', () => {
  it('moves 5,000 segments through an edit in well under a frame', () => {
    const content = Array.from({ length: 5000 }, (_, i) => 'Câu số ' + i + ' ở đây.').join('\n')
    const doc = load(content, 'en')
    const start = performance.now()
    let segs = doc.segs
    for (let i = 0; i < 200; i++) segs = applyEdits(segs, [{ from: 10, to: 10, insert: 'x' }])
    const each = (performance.now() - start) / 200
    expect(segs).toHaveLength(5000)
    expect(each).toBeLessThan(2)
  })
})
