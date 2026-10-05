import { describe, expect, it } from 'vitest'
import { formatAsDocxBuffer } from './docxFormatter'
import type { ChapterExportItem, NovelMetadata } from '../exportTypes'

describe('docxFormatter', () => {
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

  it('generates a valid docx buffer for single chapter', async () => {
    const buffer = await formatAsDocxBuffer(mockNovel, [mockChapters[0]])
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(1000)
    // DOCX files are zip files starting with PK (0x50, 0x4B)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
  })

  it('generates a valid docx buffer for multiple chapters with indent', async () => {
    const buffer = await formatAsDocxBuffer(mockNovel, mockChapters, {
      paragraphSpacing: 'indent',
      includeDescription: true
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(2000)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
  })
})
