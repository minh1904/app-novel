import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { markdownSupport, scanMarkdown, type MarkdownScan } from './markdownSyntax'

/**
 * `scanMarkdown` is pure, so everything the parser decides can be tested here without a DOM. These
 * cover the cases the old line-by-line regexes got wrong — each of those made Live Preview hide
 * characters that were not delimiters — plus the cases it already handled.
 */

function parse(text: string): { state: EditorState; scan: MarkdownScan } {
  const state = EditorState.create({ doc: text, extensions: markdownSupport() })
  const tree = ensureSyntaxTree(state, state.doc.length, 5000)
  if (!tree) throw new Error('the Markdown parser did not finish')
  return { state, scan: scanMarkdown(tree, state.doc, [{ from: 0, to: state.doc.length }]) }
}

function spans(text: string): Array<{ kind: string; text: string; inner: string }> {
  return parse(text).scan.inline.map((span) => ({
    kind: span.kind,
    text: text.slice(span.from, span.to),
    inner: text.slice(span.innerFrom, span.innerTo)
  }))
}

describe('emphasis', () => {
  it('finds bold with ** on both sides', () => {
    expect(spans('Một câu có **từ quan trọng** ở giữa')).toEqual([
      { kind: 'bold', text: '**từ quan trọng**', inner: 'từ quan trọng' }
    ])
  })

  it('finds italic with * or _ on both sides', () => {
    expect(spans('Một câu có *từ quan trọng* ở giữa')).toEqual([
      { kind: 'italic', text: '*từ quan trọng*', inner: 'từ quan trọng' }
    ])
    expect(spans('Một câu có _từ quan trọng_ ở giữa')).toEqual([
      { kind: 'italic', text: '_từ quan trọng_', inner: 'từ quan trọng' }
    ])
  })

  it('finds bold with __ on both sides', () => {
    expect(spans('Một __đậm__ nữa')).toEqual([{ kind: 'bold', text: '__đậm__', inner: 'đậm' }])
  })

  it('finds strikethrough with ~~ on both sides', () => {
    expect(spans('Một câu có ~~từ cũ~~ đã bỏ')).toEqual([
      { kind: 'strikethrough', text: '~~từ cũ~~', inner: 'từ cũ' }
    ])
  })

  it('does not read a bold pair as two nested italics', () => {
    expect(spans('Một câu có **từ quan trọng** ở giữa').map((s) => s.kind)).toEqual(['bold'])
  })

  it('finds several marks on the same line in order', () => {
    expect(spans('**đậm** rồi *nghiêng* rồi ~~gạch~~').map((s) => s.kind)).toEqual([
      'bold',
      'italic',
      'strikethrough'
    ])
  })

  it('finds an italic inside a bold, each with its own delimiters', () => {
    const text = '**a *b* c**'
    expect(spans(text)).toEqual([
      { kind: 'bold', text: '**a *b* c**', inner: 'a *b* c' },
      { kind: 'italic', text: '*b*', inner: 'b' }
    ])
  })

  it('finds bold and italic in ***both***', () => {
    expect(spans('***cả hai***').map((s) => s.kind)).toEqual(['italic', 'bold'])
  })

  it('finds emphasis inside a heading, a quote and a list item', () => {
    expect(spans('# Tên **chương**').map((s) => s.kind)).toEqual(['bold'])
    expect(spans('> lời *thoại*').map((s) => s.kind)).toEqual(['italic'])
    expect(spans('- một ý **đậm**').map((s) => s.kind)).toEqual(['bold'])
  })

  it('finds emphasis in a line indented with spaces, as a novel paragraph is', () => {
    expect(spans('    thụt bốn dấu cách **đậm**').map((s) => s.kind)).toEqual(['bold'])
  })

  it('finds emphasis in an HTML-looking line', () => {
    expect(spans('<div>**x**</div>').map((s) => s.kind)).toEqual(['bold'])
  })
})

describe('what is not emphasis', () => {
  it('ignores asterisks inside a code span', () => {
    expect(spans('`a*b*c` code')).toEqual([])
  })

  it('ignores an escaped asterisk', () => {
    // Built from the character code so the backslash survives however this file is written out.
    const backslash = String.fromCharCode(92)
    expect(spans('use ' + backslash + '*x' + backslash + '* here')).toEqual([])
  })

  it('ignores underscores inside words and in a URL', () => {
    expect(spans('snake_case_name and file_name_x')).toEqual([])
    expect(spans('[x](http://a_b_c.com/x_y_z)')).toEqual([])
  })

  it('ignores asterisks with a space on both sides', () => {
    expect(spans('2 * 3 * 4')).toEqual([])
  })

  it('ignores a span that has no closing delimiter yet', () => {
    expect(spans('Một câu có **từ quan trọng')).toEqual([])
    expect(spans('*abc')).toEqual([])
  })

  it('ignores text inside a fenced code block', () => {
    expect(spans('```\n**trong code**\n```')).toEqual([])
  })

  it('reports a half-typed **chữ* as the italic *chữ*, with a stray * before it', () => {
    // The caret sits right after the closing `*` while this is being typed, so Live Preview keeps
    // the delimiters visible; the parser is simply honest about what is complete.
    expect(spans('**chữ*')).toEqual([{ kind: 'italic', text: '*chữ*', inner: 'chữ' }])
  })
})

describe('headings', () => {
  it('marks 1 to 3 leading # and the text after them', () => {
    for (const level of [1, 2, 3] as const) {
      const text = '#'.repeat(level) + ' Tiêu đề'
      expect(parse(text).scan.lines).toEqual([
        {
          kind: 'heading',
          level,
          markFrom: 0,
          markTo: level + 1,
          contentFrom: level + 1,
          contentTo: text.length
        }
      ])
    }
  })

  it('does not style more than 3 #, or a # in the middle of a line', () => {
    expect(parse('#### Quá nhiều').scan.lines).toEqual([])
    expect(parse('Một câu # giữa dòng').scan.lines).toEqual([])
  })

  it('marks a bare # but has no text to style', () => {
    const [line] = parse('#').scan.lines
    expect(line.markFrom).toBe(0)
    expect(line.contentFrom).toBe(line.contentTo)
  })

  it('does not turn a line above --- into a heading (a scene break, not a Setext heading)', () => {
    expect(parse('Một dòng\n---').scan.lines).toEqual([])
  })
})

describe('quotes', () => {
  it('marks a leading > with the spaces after it, and styles the rest of the line', () => {
    const text = '> Lời thoại được trích'
    expect(parse(text).scan.lines).toEqual([
      { kind: 'quote', markFrom: 0, markTo: 2, contentFrom: 2, contentTo: text.length }
    ])
  })

  it('does not take a face like >_< or a > with no space after it for a quote', () => {
    expect(parse('>_<').scan.lines).toEqual([])
    expect(parse('>.< ối').scan.lines).toEqual([])
    expect(parse('>không cách').scan.lines).toEqual([])
  })

  it('does not take a > in the middle of a line for a quote', () => {
    expect(parse('Giá > 10').scan.lines).toEqual([])
  })

  it('styles the text of a nested quote only once', () => {
    const text = '> > lồng nhau'
    const lines = parse(text).scan.lines
    expect(lines.map((l) => [l.markFrom, l.markTo])).toEqual([
      [0, 2],
      [2, 4]
    ])
    expect(lines.map((l) => l.contentTo - l.contentFrom)).toEqual([0, text.length - 4])
  })
})

describe('lists', () => {
  it.each([
    ['- Một ý', 2],
    ['* Một ý', 2],
    ['+ Một ý', 2],
    ['1. Một ý', 3],
    ['12. Một ý', 4]
  ])('marks the marker and the spaces after it in %s', (text, markTo) => {
    expect(parse(text).scan.lines).toEqual([
      { kind: 'list', markFrom: 0, markTo, contentFrom: markTo, contentTo: markTo }
    ])
  })

  it('does not take a bare delimiter with no space for a list (so "**đậm**" is untouched)', () => {
    expect(parse('**đậm** rồi chữ').scan.lines).toEqual([])
    expect(parse('*nghiêng* rồi chữ').scan.lines).toEqual([])
  })
})

describe('scanning several ranges', () => {
  it('returns a span once even when two ranges both touch it', () => {
    const text = '**ab** cd'
    const state = EditorState.create({ doc: text, extensions: markdownSupport() })
    const tree = ensureSyntaxTree(state, state.doc.length, 5000)!
    const { inline } = scanMarkdown(tree, state.doc, [
      { from: 0, to: 3 },
      { from: 2, to: 6 }
    ])
    expect(inline).toHaveLength(1)
  })
})

describe('markdownSupport', () => {
  it('adds no key bindings, so Enter keeps adding a bare line break', () => {
    const state = EditorState.create({ extensions: markdownSupport() })
    expect(state.facet(keymap).flat()).toEqual([])
  })
})
