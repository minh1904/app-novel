import * as v from 'valibot'
import { idSchema } from './library'

export const EXPORT_FORMATS = ['txt', 'md', 'docx', 'pdf'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const EXPORT_PAGE_SIZES = ['A4', 'A5'] as const
export type ExportPageSize = (typeof EXPORT_PAGE_SIZES)[number]

export const EXPORT_PARAGRAPH_SPACINGS = ['indent', 'spacing'] as const
export type ExportParagraphSpacing = (typeof EXPORT_PARAGRAPH_SPACINGS)[number]

export const EXPORT_WORK_MODES = ['combined', 'separate'] as const
export type ExportWorkMode = (typeof EXPORT_WORK_MODES)[number]

export interface ExportOptions {
  includeTitle?: boolean
  includeAuthor?: boolean
  includeDescription?: boolean
  paragraphSpacing?: ExportParagraphSpacing
  pageSize?: ExportPageSize
}

export interface ExportChapterInput {
  workId: string
  chapterId: string
  format: ExportFormat
  options?: ExportOptions
}

export interface ExportWorkInput {
  workId: string
  chapterIds?: string[]
  format: ExportFormat
  mode: ExportWorkMode
  options?: ExportOptions
}

export interface ExportResult {
  success: boolean
  canceled?: boolean
  filePath?: string
  count?: number
  /** Chapters in the range left out because they have no translation. */
  skipped?: number
  error?: string
}

/** How far an export of several chapters is; sent while it runs. */
export interface ExportProgress {
  workId: string
  done: number
  total: number
}

export const exportCancelSchema = v.strictObject({ workId: idSchema })
export const exportRevealSchema = v.strictObject({
  path: v.pipe(v.string('Đường dẫn phải là chuỗi.'), v.minLength(1, 'Thiếu đường dẫn.'))
})

export const exportFormatSchema = v.picklist(EXPORT_FORMATS, 'Định dạng xuất không hợp lệ.')
export const exportPageSizeSchema = v.optional(
  v.picklist(EXPORT_PAGE_SIZES, 'Khổ trang không hợp lệ.')
)
export const exportParagraphSpacingSchema = v.optional(
  v.picklist(EXPORT_PARAGRAPH_SPACINGS, 'Kiểu cách đoạn không hợp lệ.')
)
export const exportWorkModeSchema = v.picklist(
  EXPORT_WORK_MODES,
  'Chế độ xuất tác phẩm không hợp lệ.'
)

export const exportOptionsSchema = v.optional(
  v.object({
    includeTitle: v.optional(v.boolean()),
    includeAuthor: v.optional(v.boolean()),
    includeDescription: v.optional(v.boolean()),
    paragraphSpacing: exportParagraphSpacingSchema,
    pageSize: exportPageSizeSchema
  })
)

export const exportChapterSchema = v.object({
  workId: idSchema,
  chapterId: v.pipe(v.string('ID chương phải là chuỗi.'), v.uuid('ID chương không hợp lệ.')),
  format: exportFormatSchema,
  options: exportOptionsSchema
})

export const exportWorkSchema = v.object({
  workId: idSchema,
  chapterIds: v.optional(
    v.array(v.pipe(v.string('ID chương phải là chuỗi.'), v.uuid('ID chương không hợp lệ.')))
  ),
  format: exportFormatSchema,
  mode: exportWorkModeSchema,
  options: exportOptionsSchema
})
