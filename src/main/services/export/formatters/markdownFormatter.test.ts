import { describe, expect, it } from 'vitest'
import { formatAsMarkdown } from './markdownFormatter'
import type { ChapterExportItem, NovelMetadata } from '../exportTypes'

describe('markdownFormatter', () => {
  const mockNovel: NovelMetadata = {
    title: 'Đại Phụng Đả Canh Nhân',
    author: 'Mại Báo Tiểu Lang Quân',
    description: 'Một bộ truyện tiên hiệp hài hước.'
  }

  const mockChapters: ChapterExportItem[] = [
    {
      id: 'c1',
      number: 1,
      title: 'Nhập mộng',
      content: 'Hứa Thất An tỉnh lại trong ngục giam.\n\n*Hắn phát hiện mình đã xuyên không.*'
    },
    {
      id: 'c2',
      number: 2,
      title: 'Chương 2: Tẩy oan',
      content: 'Vụ án thuế ngân có uẩn khúc.\n\n> Cần tìm ra manh mối.'
    }
  ]

  it('formats single chapter with ## heading', () => {
    const output = formatAsMarkdown(mockNovel, [mockChapters[0]])
    expect(output).toContain('## Chương 1: Nhập mộng')
    expect(output).toContain('Hứa Thất An tỉnh lại trong ngục giam.')
    expect(output).toContain('*Hắn phát hiện mình đã xuyên không.*')
    expect(output).not.toContain('# Đại Phụng Đả Canh Nhân')
  })

  it('formats multiple chapters with # book title and dividers', () => {
    const output = formatAsMarkdown(mockNovel, mockChapters, { includeDescription: true })
    expect(output).toContain('# Đại Phụng Đả Canh Nhân')
    expect(output).toContain('**Tác giả:** Mại Báo Tiểu Lang Quân')
    expect(output).toContain('> Một bộ truyện tiên hiệp hài hước.')
    expect(output).toContain('---')
    expect(output).toContain('## Chương 1: Nhập mộng')
    expect(output).toContain('## Chương 2: Tẩy oan')
  })
})
