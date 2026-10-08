import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ExportChapterInput,
  ExportFormat,
  ExportProgress,
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

/** Width of the number at the front of each file name, so the files sort in chapter order. */
export function numberWidth(chapterCount: number): number {
  return Math.max(3, String(chapterCount).length)
}

export class ExportService {
  /** Works whose running export should stop before the next chapter. */
  private readonly cancelled = new Set<string>()
  /** Files and folders written this session: the only paths `reveal` will open. */
  private readonly written = new Set<string>()

  constructor(
    private readonly library: LibraryStore,
    private readonly picker: ExportFilePicker,
    private readonly pdfPrinter: PdfPrinter,
    private readonly writeBuffer: (path: string, data: Buffer) => Promise<void> = writeFile,
    private readonly revealPath: (path: string) => void = () => {}
  ) {}

  cancel(workId: string): void {
    this.cancelled.add(workId)
  }

  /**
   * Shows an exported file in its folder. Limited to what this session wrote, so the renderer cannot
   * use it to open arbitrary places on disk.
   */
  reveal(path: string): boolean {
    if (!this.written.has(path)) return false
    this.revealPath(path)
    return true
  }

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
    this.written.add(targetPath)

    return {
      success: true,
      filePath: targetPath,
      count: 1
    }
  }

  /**
   * Exports the chosen chapters (all of them when none are named). Chapters with no translation are
   * left out and counted in `skipped`, so the screen can say how many and which.
   *
   * `onProgress` hears after each chapter written; `cancel(workId)` stops before the next one, and
   * what was already written stays on disk.
   */
  async exportWork(
    input: ExportWorkInput,
    onProgress: (progress: ExportProgress) => void = () => {}
  ): Promise<ExportResult> {
    const workId = input.workId
    this.cancelled.delete(workId)
    const work = this.library.get(workId)
    const allChapters = this.library.listChapters(workId)

    const wanted =
      input.chapterIds && input.chapterIds.length > 0 ? new Set(input.chapterIds) : null
    const selectedChapters = wanted ? allChapters.filter((c) => wanted.has(c.id)) : allChapters

    const items: ChapterExportItem[] = []
    for (const c of selectedChapters) {
      const text = this.library.readText(workId, c.id, 'target')
      if (text.content.trim().length > 0) {
        items.push({
          id: c.id,
          number: c.number,
          title: c.title || `Chương ${c.number}`,
          content: text.content
        })
      }
    }
    const skipped = selectedChapters.length - items.length

    if (items.length === 0) {
      return { success: false, skipped, error: 'Không có chương nào có nội dung dịch để xuất.' }
    }

    const novelMeta: NovelMetadata = {
      title: work.title,
      originalTitle: work.originalTitle,
      author: work.author,
      description: work.description
    }
    const total = items.length

    if (input.mode === 'combined') {
      const suggestedName = `${sanitizeFilename(work.title)}.${input.format}`
      const targetPath = await this.picker.chooseExportSavePath(suggestedName, input.format)

      if (!targetPath) {
        return { success: false, canceled: true }
      }

      onProgress({ workId, done: 0, total })
      const buffer = await this.generateBuffer(input.format, novelMeta, items, input.options)
      if (this.cancelled.delete(workId)) return { success: false, canceled: true, count: 0 }
      await this.writeBuffer(targetPath, buffer)
      this.written.add(targetPath)
      onProgress({ workId, done: total, total })

      return { success: true, filePath: targetPath, count: total, skipped }
    }

    const dirPath = await this.picker.chooseExportDirectory()
    if (!dirPath) {
      return { success: false, canceled: true }
    }

    const width = numberWidth(allChapters.length)
    onProgress({ workId, done: 0, total })
    let done = 0
    for (const item of items) {
      if (this.cancelled.delete(workId)) {
        return { success: false, canceled: true, filePath: dirPath, count: done, skipped }
      }
      const numStr = String(item.number).padStart(width, '0')
      const chName = sanitizeFilename(item.title)
      const fileName = `${numStr} - ${chName}.${input.format}`
      const filePath = join(dirPath, fileName)

      const buffer = await this.generateBuffer(input.format, novelMeta, [item], input.options)
      await this.writeBuffer(filePath, buffer)
      this.written.add(dirPath)
      done += 1
      onProgress({ workId, done, total })
    }

    return { success: true, filePath: dirPath, count: done, skipped }
  }
}
