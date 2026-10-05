import { describe, expect, it } from 'vitest'
import { formatAsTxt } from './txtFormatter'
import type { ChapterExportItem, NovelMetadata } from '../exportTypes'

describe('txtFormatter', () => {
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
      content: 'Hứa Thất An tỉnh lại trong ngục giam.\n\nHắn phát hiện mình đã xuyên không.'
    },
    {
      id: 'c2',
      number: 2,
      title: 'Chương 2: Tẩy oan',
      content: 'Vụ án thuế ngân có uẩn khúc.\n\nCần tìm ra manh mối.'
    }
  ]

  it('formats single chapter without novel header by default', () => {
    const output = formatAsTxt(mockNovel, [mockChapters[0]])
    expect(output).toContain('Chương 1: Nhập mộng')
    expect(output).toContain('Hứa Thất An tỉnh lại trong ngục giam.')
    expect(output).toContain('Hắn phát hiện mình đã xuyên không.')
    expect(output).not.toContain('ĐẠI PHỤNG ĐẢ CANH NHÂN')
  })

  it('formats multiple chapters with book title and author header', () => {
    const output = formatAsTxt(mockNovel, mockChapters)
    expect(output).toContain('ĐẠI PHỤNG ĐẢ CANH NHÂN')
    expect(output).toContain('Tác giả: Mại Báo Tiểu Lang Quân')
    expect(output).toContain('Chương 1: Nhập mộng')
    expect(output).toContain('Chương 2: Tẩy oan')
  })

  it('handles indent paragraph spacing', () => {
    const output = formatAsTxt(mockNovel, [mockChapters[0]], { paragraphSpacing: 'indent' })
    expect(output).toContain('    Hứa Thất An tỉnh lại trong ngục giam.')
    expect(output).toContain('    Hắn phát hiện mình đã xuyên không.')
  })

  it('normalizes CRLF and removes empty lines', () => {
    const chapter: ChapterExportItem = {
      id: 'c3',
      number: 3,
      title: 'Thử nghiệm',
      content: 'Dòng 1\r\n\r\n\r\nDòng 2\r\n'
    }
    const output = formatAsTxt(mockNovel, [chapter])
    expect(output).not.toContain('\r')
    expect(output).toContain('Dòng 1\n\nDòng 2')
  })
})
