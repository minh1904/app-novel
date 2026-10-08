import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ExportChapterInput,
  ExportFormat,
  ExportResult,
  ExportWorkInput
} from '../../../shared/contracts/export'
import type { LibraryStore } from '../library/library'
import type {
  ChapterExportItem,
  ExportFilePicker,
  NovelExportOptions,
  NovelMetadata,
  PdfPrinter
} from './exportTypes'
import { formatAsTxt } from './formatters/txtFormatter'
import { formatAsMarkdown } from './formatters/markdownFormatter'
import { formatAsDocxBuffer } from './formatters/docxFormatter'
import { formatAsNovelHtml } from './formatters/pdfFormatter'

export function sanitizeFilename(name: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: the control characters are what this pattern removes
  const sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
  return sanitized.length > 0 ? sanitized : 'novel'
}

export class ExportService {
  constructor(
    private readonly library: LibraryStore,
    private readonly picker: ExportFilePicker,
    private readonly pdfPrinter: PdfPrinter,
    private readonly writeBuffer: (path: string, data: Buffer) => Promise<void> = writeFile
  ) {}

  private async generateBuffer(
    format: ExportFormat,
    novel: NovelMetadata,
    chapters: ChapterExportItem[],
    options?: NovelExportOptions
  ): Promise<Buffer> {
    switch (format) {
      case 'txt':
        return Buffer.from(formatAsTxt(novel, chapters, options), 'utf-8')
      case 'md':
        return Buffer.from(formatAsMarkdown(novel, chapters, options), 'utf-8')
      case 'docx':
        return await formatAsDocxBuffer(novel, chapters, options)
      case 'pdf': {
        const html = formatAsNovelHtml(novel, chapters, options)
        return await this.pdfPrinter.renderToPdf(html, { pageSize: options?.pageSize })
      }
    }
  }

  async exportChapter(input: ExportChapterInput): Promise<ExportResult> {
    const work = this.library.get(input.workId)
    const chapters = this.library.listChapters(input.workId)
    const chapter = chapters.find((c) => c.id === input.chapterId)

    if (!chapter) {
      return { success: false, error: 'Không tìm thấy chương cần xuất.' }
    }

    const textRecord = this.library.readText(input.workId, input.chapterId, 'target')
    const content = textRecord.content.trim()

    const chapterItem: ChapterExportItem = {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title || `Chương ${chapter.number}`,
      content
    }

    const novelMeta: NovelMetadata = {
      title: work.title,
      originalTitle: work.originalTitle,
      author: work.author,
      description: work.description
    }

    const suggestedName = `${sanitizeFilename(work.title)} - Chuong ${chapter.number}.${input.format}`
    const targetPath = await this.picker.chooseExportSavePath(suggestedName, input.format)

    if (!targetPath) {
      return { success: false, canceled: true }
    }

    const buffer = await this.generateBuffer(input.format, novelMeta, [chapterItem], input.options)
    await this.writeBuffer(targetPath, buffer)

    return {
      success: true,
      filePath: targetPath,
      count: 1
    }
  }

  async exportWork(input: ExportWorkInput): Promise<ExportResult> {
    const work = this.library.get(input.workId)
    const allChapters = this.library.listChapters(input.workId)

    const selectedChapters =
      input.chapterIds && input.chapterIds.length > 0
        ? allChapters.filter((c) => input.chapterIds?.includes(c.id))
        : allChapters

    const items: ChapterExportItem[] = []
    for (const c of selectedChapters) {
      const text = this.library.readText(input.workId, c.id, 'target')
      if (text.content.trim().length > 0) {
        items.push({
          id: c.id,
          number: c.number,
          title: c.title || `Chương ${c.number}`,
          content: text.content
        })
      }
    }

    if (items.length === 0) {
      return { success: false, error: 'Không có chương nào có nội dung dịch để xuất.' }
    }

    const novelMeta: NovelMetadata = {
      title: work.title,
      originalTitle: work.originalTitle,
      author: work.author,
      description: work.description
    }

    if (input.mode === 'combined') {
      const suggestedName = `${sanitizeFilename(work.title)}.${input.format}`
      const targetPath = await this.picker.chooseExportSavePath(suggestedName, input.format)

      if (!targetPath) {
        return { success: false, canceled: true }
      }

      const buffer = await this.generateBuffer(input.format, novelMeta, items, input.options)
      await this.writeBuffer(targetPath, buffer)

      return {
        success: true,
        filePath: targetPath,
        count: items.length
      }
    } else {
      const dirPath = await this.picker.chooseExportDirectory()
      if (!dirPath) {
        return { success: false, canceled: true }
      }

      for (const item of items) {
        const numStr = String(item.number).padStart(3, '0')
        const chName = sanitizeFilename(item.title)
        const fileName = `${numStr} - ${chName}.${input.format}`
        const filePath = join(dirPath, fileName)

        const buffer = await this.generateBuffer(input.format, novelMeta, [item], input.options)
        await this.writeBuffer(filePath, buffer)
      }

      return {
        success: true,
        filePath: dirPath,
        count: items.length
      }
    }
  }
}
