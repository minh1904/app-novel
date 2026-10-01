import * as v from 'valibot'
import type { ErrorCode } from './result'

export const SOURCE_LANGUAGES = ['en', 'zh-Hans', 'zh-Hant', 'ja'] as const
export type SourceLanguage = (typeof SOURCE_LANGUAGES)[number]

export const WORK_STATUSES = ['not-started', 'in-progress', 'paused'] as const
export type WorkStatus = (typeof WORK_STATUSES)[number]

export const TITLE_MAX = 200

/** Covers are normalised to JPEG by the renderer and re-checked by the main process. */
export const COVER_MAX_BYTES = 1024 * 1024
export const COVER_DATA_URL_PREFIX = 'data:image/jpeg;base64,'
export const DESCRIPTION_MAX = 2000

export interface ChapterSummary {
  id: string
  /** 1-based position derived from order, never stored. */
  number: number
  title: string
}

export interface WorkSummary {
  id: string
  title: string
  originalTitle: string | null
  description: string | null
  author: string | null
  /** Free text such as "Tiên hiệp, cổ đại"; later used as context for the translator model. */
  genre: string | null
  /** Changes whenever the cover does; null when the work has no cover. Used as a cache key. */
  coverVersion: number | null
  sourceLang: SourceLanguage
  status: WorkStatus
  archived: boolean
  chapterCount: number
  lastChapter: ChapterSummary | null
  /** Milliseconds since the Unix epoch, UTC. */
  createdAt: number
  updatedAt: number
}

/** A work file that could not be opened; the rest of the library stays usable. */
export interface WorkProblem {
  fileName: string
  code: ErrorCode
  message: string
}

export interface WorkList {
  works: WorkSummary[]
  problems: WorkProblem[]
}

const title = v.pipe(
  v.string('Tên tác phẩm phải là chữ.'),
  v.trim(),
  v.minLength(1, 'Nhập tên tác phẩm.'),
  v.maxLength(TITLE_MAX, 'Tên tác phẩm tối đa ' + TITLE_MAX + ' ký tự.')
)

const optionalTitle = v.pipe(
  v.string('Tên gốc phải là chữ.'),
  v.trim(),
  v.maxLength(TITLE_MAX, 'Tên gốc tối đa ' + TITLE_MAX + ' ký tự.')
)

const author = v.pipe(
  v.string('Tác giả phải là chữ.'),
  v.trim(),
  v.maxLength(TITLE_MAX, 'Tác giả tối đa ' + TITLE_MAX + ' ký tự.')
)

const genre = v.pipe(
  v.string('Thể loại phải là chữ.'),
  v.trim(),
  v.maxLength(TITLE_MAX, 'Thể loại tối đa ' + TITLE_MAX + ' ký tự.')
)

const description = v.pipe(
  v.string('Mô tả phải là chữ.'),
  v.trim(),
  v.maxLength(DESCRIPTION_MAX, 'Mô tả tối đa ' + DESCRIPTION_MAX + ' ký tự.')
)

// base64 inflates by 4/3; the exact byte limit is enforced again after decoding.
const cover = v.pipe(
  v.string('Ảnh bìa không hợp lệ.'),
  v.startsWith(COVER_DATA_URL_PREFIX, 'Ảnh bìa phải là ảnh JPEG.'),
  v.maxLength(
    COVER_DATA_URL_PREFIX.length + Math.ceil((COVER_MAX_BYTES * 4) / 3) + 4,
    'Ảnh bìa quá lớn.'
  )
)

const sourceLang = v.picklist(SOURCE_LANGUAGES, 'Chọn ngôn ngữ nguồn hợp lệ.')
const status = v.picklist(WORK_STATUSES, 'Trạng thái không hợp lệ.')
export const idSchema = v.pipe(v.string('ID phải là chữ.'), v.uuid('ID không hợp lệ.'))

export const createWorkSchema = v.strictObject({
  title,
  sourceLang,
  originalTitle: v.optional(optionalTitle),
  author: v.optional(author),
  genre: v.optional(genre),
  description: v.optional(description),
  cover: v.optional(cover)
})
export type CreateWorkInput = v.InferInput<typeof createWorkSchema>

/**
 * `null` clears an optional text field or removes the cover; an absent key leaves it unchanged.
 * The cover travels in the same patch so details and cover save atomically.
 */
export const workPatchSchema = v.strictObject({
  title: v.optional(title),
  originalTitle: v.optional(v.nullable(optionalTitle)),
  author: v.optional(v.nullable(author)),
  genre: v.optional(v.nullable(genre)),
  description: v.optional(v.nullable(description)),
  status: v.optional(status),
  archived: v.optional(v.boolean('Giá trị lưu trữ phải là đúng/sai.')),
  cover: v.optional(v.nullable(cover))
})
export type WorkPatch = v.InferInput<typeof workPatchSchema>

export const getWorkSchema = v.strictObject({ id: idSchema })
export const setCoverSchema = v.strictObject({ id: idSchema, cover: v.nullable(cover) })
export const updateWorkSchema = v.strictObject({ id: idSchema, patch: workPatchSchema })
export type UpdateWorkInput = v.InferInput<typeof updateWorkSchema>
