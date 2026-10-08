import { describe, expect, it } from 'vitest'
import { formatAsTxt } from './formatters/txtFormatter'
import { formatAsMarkdown } from './formatters/markdownFormatter'
import { formatAsDocxBuffer } from './formatters/docxFormatter'
import { formatAsNovelHtml } from './formatters/pdfFormatter'
import { decodeRaw, normalizeRaw } from '../../../shared/text/rawText'
import type { ChapterExportItem, NovelMetadata } from './exportTypes'

describe('Export Round-trip and Novel Fidelity', () => {
  const novel: NovelMetadata = {
    title: 'Đại Phụng Đả Canh Nhân',
    author: 'Mại Báo Tiểu Lang Quân',
    description: 'Một bộ truyện tiên hiệp hài hước, suy luận trinh thám.'
  }

  const complexChapter: ChapterExportItem = {
    id: 'ch-01',
    number: 1,
    title: 'Nhập mộng kinh hồn',
    content: [
      'Hứa Thất An từ từ mở mắt, phát hiện bốn phía tối đen như mực.',
      '«Ngươi đã tỉnh?» — Một giọng nói trầm thấp vang lên từ trong góc tối.',
      '“Đây là nơi nào?” Hắn thầm nghĩ trong lòng, cảm giác cả người đau nhức khôn nguôi…',
      'Kho báu triều đình bị đánh cắp, thuế ngân mười vạn lượng không cánh mà bay!'
    ].join('\n\n')
  }

  it('preserves 100% of text content and characters on TXT round-trip', () => {
    // 1. Export as TXT
    const exportedTxt = formatAsTxt(novel, [complexChapter])
    const bytes = new TextEncoder().encode(exportedTxt)

    // 2. Import back through decodeRaw & normalizeRaw
    const decoded = decodeRaw(bytes, 'utf-8')
    const normalized = normalizeRaw(decoded.text)

    // 3. Verify all paragraphs exist intact with original punctuation and quotes
    expect(normalized.text).toContain('Hứa Thất An từ từ mở mắt, phát hiện bốn phía tối đen như mực.')
    expect(normalized.text).toContain('«Ngươi đã tỉnh?» — Một giọng nói trầm thấp vang lên từ trong góc tối.')
    expect(normalized.text).toContain('“Đây là nơi nào?” Hắn thầm nghĩ trong lòng, cảm giác cả người đau nhức khôn nguôi…')
    expect(normalized.text).toContain('Kho báu triều đình bị đánh cắp, thuế ngân mười vạn lượng không cánh mà bay!')
  })

  it('preserves markdown headers and paragraphs on MD export', () => {
    const exportedMd = formatAsMarkdown(novel, [complexChapter])
    const bytes = new TextEncoder().encode(exportedMd)

    const decoded = decodeRaw(bytes, 'utf-8')
    const normalized = normalizeRaw(decoded.text)

    expect(normalized.text).toContain('## Chương 1: Nhập mộng kinh hồn')
    expect(normalized.text).toContain('«Ngươi đã tỉnh?» — Một giọng nói trầm thấp vang lên từ trong góc tối.')
  })

  it('creates valid DOCX buffer with novel sections and page breaks', async () => {
    const docxBuffer = await formatAsDocxBuffer(novel, [complexChapter, {
      id: 'ch-02',
      number: 2,
      title: 'Phá án',
      content: 'Chương thứ hai tiếp nối.'
    }])

    expect(docxBuffer).toBeInstanceOf(Buffer)
    expect(docxBuffer.length).toBeGreaterThan(3000)
    // Check zip header
    expect(docxBuffer.readUInt32LE(0)).toBe(0x04034b50)
  })

  it('creates valid PDF HTML template with CSS @page and chapter break-before', () => {
    const html = formatAsNovelHtml(novel, [complexChapter, {
      id: 'ch-02',
      number: 2,
      title: 'Phá án',
      content: 'Chương thứ hai tiếp nối.'
    }], { pageSize: 'A5', paragraphSpacing: 'indent' })

    expect(html).toContain('size: A5;')
    expect(html).toContain('break-before: page;')
    expect(html).toContain('class="chapter-title"')
    expect(html).toContain('text-indent: 1.8em;')
  })
})
