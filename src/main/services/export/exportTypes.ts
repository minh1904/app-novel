import type { ExportOptions } from '../../../shared/contracts/export'

export interface NovelMetadata {
  title: string
  originalTitle?: string | null
  author?: string | null
  description?: string | null
}

export interface ChapterExportItem {
  id: string
  number: number
  title: string
  content: string
}

export type NovelExportOptions = ExportOptions

export interface ExportFilePicker {
  chooseExportSavePath(suggestedName: string, extension: string): Promise<string | null>
  chooseExportDirectory(): Promise<string | null>
}

export interface PdfPrinter {
  renderToPdf(html: string, options?: { pageSize?: 'A4' | 'A5' }): Promise<Buffer>
}
