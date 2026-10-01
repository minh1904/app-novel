import { describe, expect, it } from 'vitest'
import { readingBlocks } from './readingParagraphs'

const shape = (text: string): string =>
  readingBlocks(text)
    .map((block) => (block.kind === 'gap' ? '_' : block.text))
    .join('|')

describe('readingBlocks', () => {
  it('makes a paragraph of every non-empty line', () => {
    expect(shape('Một.\nHai.')).toBe('Một.|Hai.')
  })

  it('turns one or many blank lines into a single gap', () => {
    expect(shape('Một.\n\nHai.')).toBe('Một.|_|Hai.')
    expect(shape('Một.\n\n\n  \n\nHai.')).toBe('Một.|_|Hai.')
  })

  it('makes no gap at the start or the end', () => {
    expect(shape('\n\nMột.\n\n')).toBe('Một.')
  })

  it('keeps white space inside a line and does not read Markdown', () => {
    expect(shape('　　Thụt đầu dòng\n# Không phải tiêu đề')).toBe(
      '　　Thụt đầu dòng|# Không phải tiêu đề'
    )
  })

  it('has nothing for an empty text', () => {
    expect(readingBlocks('')).toEqual([])
    expect(readingBlocks('\n\n')).toEqual([])
  })
})
