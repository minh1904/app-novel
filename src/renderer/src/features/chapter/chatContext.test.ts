import { describe, expect, it } from 'vitest'
import { CHAT_BLOCK_TEXT_MAX } from '../../../../shared/aiChat'
import { buildChatContext, paragraphsOf, rangeLabel, type ContextScope } from './chatContext'
import type { TargetRange } from '../editor/chatRange'

/**
 * What a turn sends along with the question.
 *
 * Two tests here exist because of bugs that reached the screen. The unsaved-text one is the only
 * proof of why this runs in the renderer at all. The untranslated-chapter one is the regression for
 * the worst failure this feature has had: the source was attached only when both sides had the same
 * number of paragraphs, so asking "dịch chương này" on a fresh chapter sent the model nothing to
 * translate — and the model, correctly, asked the user to paste the chapter in.
 */

const SOURCE = ['Source one.', '', 'Source two.', '', 'Source three.'].join('\n')
const TARGET = ['Đoạn một.', '', 'Đoạn hai.', '', 'Đoạn ba.'].join('\n')

function rangeFor(text: string, needle: string): TargetRange {
  const from = text.indexOf(needle)
  return { from, to: from + needle.length, text: needle, targetIds: [] }
}

function build(options: {
  sourceText?: string
  targetText?: string
  range?: TargetRange | null
  scope?: ContextScope
  radius?: number
}): ReturnType<typeof buildChatContext> {
  return buildChatContext({
    sourceText: options.sourceText ?? SOURCE,
    targetText: options.targetText ?? TARGET,
    range: options.range ?? null,
    scope: options.scope ?? 'range',
    radius: options.radius ?? 1
  })
}

const labelsOf = (blocks: ReturnType<typeof buildChatContext>): string[] =>
  blocks.map((block) => block.label)

const textOf = (blocks: ReturnType<typeof buildChatContext>, label: string): string | undefined =>
  blocks.find((block) => block.label === label)?.text

describe('paragraphsOf', () => {
  it('splits on blank lines and keeps offsets', () => {
    const paragraphs = paragraphsOf(TARGET)
    expect(paragraphs.map((p) => p.text)).toEqual(['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.'])
    expect(TARGET.slice(paragraphs[1].from, paragraphs[1].to)).toBe('Đoạn hai.')
  })

  it('keeps multi-line paragraphs whole', () => {
    expect(paragraphsOf('một\nhai\n\nba').map((p) => p.text)).toEqual(['một\nhai', 'ba'])
  })

  it('treats runs of blank lines as one separator', () => {
    expect(paragraphsOf('một\n\n\n\nhai').map((p) => p.text)).toEqual(['một', 'hai'])
  })

  it('gives nothing for empty or blank text', () => {
    expect(paragraphsOf('')).toEqual([])
    expect(paragraphsOf('\n\n  \n')).toEqual([])
  })
})

describe('the chapter always goes', () => {
  /**
   * The exact shape that failed on screen: a chapter with a real source and a junk one-line
   * translation. Paragraph counts differ, which used to delete the source from the request.
   */
  it('sends the source of an untranslated chapter', () => {
    const blocks = build({ targetText: 'dcscdvsdv', scope: 'chapter' })
    expect(labelsOf(blocks)).toContain('Bản gốc của chương')
    expect(textOf(blocks, 'Bản gốc của chương')).toBe(SOURCE)
  })

  it('sends the source even when the two sides have different paragraph counts', () => {
    const blocks = build({
      sourceText: SOURCE,
      targetText: 'một dòng duy nhất',
      range: rangeFor('một dòng duy nhất', 'một dòng duy nhất')
    })
    expect(textOf(blocks, 'Bản gốc của chương')).toBe(SOURCE)
  })

  it('sends the source with no range and no caret at all', () => {
    const blocks = build({ range: null })
    expect(textOf(blocks, 'Bản gốc của chương')).toBe(SOURCE)
  })

  it('puts the chapter first, before anything about a paragraph', () => {
    const blocks = build({ range: rangeFor(TARGET, 'Đoạn hai.') })
    expect(labelsOf(blocks).slice(0, 2)).toEqual(['Bản gốc của chương', 'Bản dịch hiện có'])
  })

  it('leaves out the translation block when there is no translation', () => {
    const blocks = build({ targetText: '   \n\n ', scope: 'chapter' })
    expect(labelsOf(blocks)).toEqual(['Bản gốc của chương'])
  })

  it('cuts an oversized chapter and says so instead of cutting silently', () => {
    const huge = 'a'.repeat(CHAT_BLOCK_TEXT_MAX + 500)
    const blocks = build({ sourceText: huge, targetText: '', scope: 'chapter' })
    const block = blocks[0]
    expect(block.text).toHaveLength(CHAT_BLOCK_TEXT_MAX)
    expect(block.detail).toContain('đã cắt')
  })
})

describe('narrowing to a paragraph', () => {
  it('adds the range, its source counterpart, and the neighbours', () => {
    const blocks = build({ range: rangeFor(TARGET, 'Đoạn hai.') })

    expect(labelsOf(blocks)).toEqual([
      'Bản gốc của chương',
      'Bản dịch hiện có',
      'Đoạn đang sửa',
      'Bản gốc của đoạn',
      'Bản dịch liền trước',
      'Bản dịch liền sau'
    ])
    expect(textOf(blocks, 'Bản gốc của đoạn')).toBe('Source two.')
    expect(textOf(blocks, 'Bản dịch liền trước')).toBe('Đoạn một.')
    expect(textOf(blocks, 'Bản dịch liền sau')).toBe('Đoạn ba.')
  })

  // The alignment rule survives, but now it only decides a convenience block.
  it('drops only the per-paragraph source block when the sides do not line up', () => {
    const blocks = build({
      sourceText: 'Source one.\n\nSource two.',
      range: rangeFor(TARGET, 'Đoạn hai.')
    })
    expect(labelsOf(blocks)).not.toContain('Bản gốc của đoạn')
    expect(labelsOf(blocks)).toContain('Bản gốc của chương')
  })

  it('chapter scope sends no paragraph blocks at all', () => {
    const blocks = build({ range: rangeFor(TARGET, 'Đoạn hai.'), scope: 'chapter' })
    expect(labelsOf(blocks)).toEqual(['Bản gốc của chương', 'Bản dịch hiện có'])
  })

  it('stops at the edges instead of wrapping around', () => {
    const first = build({ range: rangeFor(TARGET, 'Đoạn một.') })
    expect(labelsOf(first)).not.toContain('Bản dịch liền trước')

    const last = build({ range: rangeFor(TARGET, 'Đoạn ba.') })
    expect(labelsOf(last)).not.toContain('Bản dịch liền sau')
  })

  it('radius 0 sends no neighbours', () => {
    const blocks = build({ range: rangeFor(TARGET, 'Đoạn hai.'), radius: 0 })
    expect(labelsOf(blocks)).not.toContain('Bản dịch liền trước')
    expect(labelsOf(blocks)).toContain('Đoạn đang sửa')
  })

  it('an empty range adds nothing beyond the chapter', () => {
    const blocks = build({ range: { from: 10, to: 10, text: '', targetIds: [] } })
    expect(labelsOf(blocks)).toEqual(['Bản gốc của chương', 'Bản dịch hiện có'])
  })

  it('same input gives the same blocks', () => {
    const input = { range: rangeFor(TARGET, 'Đoạn hai.') }
    expect(build(input)).toEqual(build(input))
  })

  // Task 8.2 — the reason this module lives in the renderer.
  it('sees text the user typed but has not saved', () => {
    const edited = TARGET.replace('Đoạn hai.', 'Đoạn hai, vừa sửa chưa lưu.')
    const blocks = build({
      targetText: edited,
      range: rangeFor(edited, 'Đoạn hai, vừa sửa chưa lưu.')
    })
    expect(textOf(blocks, 'Đoạn đang sửa')).toBe('Đoạn hai, vừa sửa chưa lưu.')
    expect(textOf(blocks, 'Bản dịch hiện có')).toContain('vừa sửa chưa lưu')
  })

  it('never puts content in the detail line', () => {
    const blocks = build({ range: rangeFor(TARGET, 'Đoạn hai.') })
    for (const block of blocks) expect(block.detail).not.toContain('Đoạn một')
  })
})

describe('rangeLabel', () => {
  it('says plainly when there is nothing to ask about', () => {
    expect(rangeLabel(null, TARGET)).toBe('chưa đặt con trỏ vào đoạn nào')
    expect(rangeLabel({ from: 9, to: 9, text: '', targetIds: [] }, TARGET)).toBe(
      'chưa đặt con trỏ vào đoạn nào'
    )
  })

  it('says "cả chương" whenever the scope is the chapter, even with no translation', () => {
    expect(rangeLabel(null, '', 'chapter')).toBe('cả chương')
  })

  it('names one paragraph with its size', () => {
    expect(rangeLabel(rangeFor(TARGET, 'Đoạn hai.'), TARGET)).toBe('đoạn đang sửa · 9 ký tự')
  })

  it('counts paragraphs when more than one is covered', () => {
    const range = { from: 0, to: 20, text: 'Đoạn một.\n\nĐoạn hai.', targetIds: [] }
    expect(rangeLabel(range, TARGET)).toBe('2 đoạn · 20 ký tự')
  })

  it('says "cả chương" when the range really is the whole text', () => {
    expect(rangeLabel({ from: 0, to: TARGET.length, text: TARGET, targetIds: [] }, TARGET)).toBe(
      'cả chương'
    )
  })
})
