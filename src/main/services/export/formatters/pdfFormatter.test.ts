import { describe, expect, it } from 'vitest'
import { formatAsNovelHtml } from './pdfFormatter'
import type { ChapterExportItem, NovelMetadata } from '../exportTypes'

describe('pdfFormatter', () => {
  const mockNovel: NovelMetadata = {
    title: 'Đại Phụng Đả Canh Nhân & Bạn Bè',
    author: 'Mại Báo Tiểu Lang Quân',
    description: 'Một bộ truyện tiên hiệp hài hước.'
  }

  const mockChapters: ChapterExportItem[] = [
    {
      id: 'c1',
      number: 1,
      title: 'Nhập mộng',
      content: 'Hứa Thất An tỉnh lại trong ngục giam.\n\nHắn phát hiện mình đã xuyên không.'
    },
    {
      id: 'c2',
      number: 2,
      title: 'Chương 2: Tẩy oan',
      content: 'Vụ án thuế ngân có uẩn khúc.\n\nCần tìm ra manh mối.'
    }
  ]

  it('escapes html entities in title and content', () => {
    const html = formatAsNovelHtml(mockNovel, [mockChapters[0]])
    expect(html).toContain('Đại Phụng Đả Canh Nhân &amp; Bạn Bè')
    expect(html).toContain('Chương 1: Nhập mộng')
    expect(html).toContain('<p>Hứa Thất An tỉnh lại trong ngục giam.</p>')
  })

  it('generates paged media CSS with page breaks and novel typography', () => {
    const html = formatAsNovelHtml(mockNovel, mockChapters, {
      pageSize: 'A5',
      paragraphSpacing: 'indent',
      includeDescription: true
    })
    expect(html).toContain('@page {')
    expect(html).toContain('size: A5;')
    expect(html).toContain('break-before: page;')
    expect(html).toContain('text-indent: 1.8em;')
    expect(html).toContain('class="title-page"')
  })
})
