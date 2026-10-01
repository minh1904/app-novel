import * as v from 'valibot'
import { idSchema, type ChapterSummary, type WorkSummary } from './library'

export const CHAPTER_TITLE_MAX = 200

/** A chapter as listed on the work detail screen. `number` is derived from position, never stored. */
export interface ChapterItem extends ChapterSummary {
  /** Milliseconds since the Unix epoch, UTC. */
  createdAt: number
  updatedAt: number
}

/** Every change returns the new work summary so the header and library need no second round trip. */
export interface ChapterChange {
  work: WorkSummary
  chapter: ChapterItem
}

/** Moves and deletes renumber many chapters at once, so they return the whole list. */
export interface ChaptersChange {
  work: WorkSummary
  chapters: ChapterItem[]
}

/** Titles are one line: line breaks become spaces, then the ends are trimmed. Empty is allowed. */
export const chapterTitleSchema = v.pipe(
  v.string('Tên chương phải là chữ.'),
  v.transform((value) => value.replace(/\s*[\r\n]+\s*/g, ' ')),
  v.trim(),
  v.maxLength(CHAPTER_TITLE_MAX, 'Tên chương tối đa ' + CHAPTER_TITLE_MAX + ' ký tự.')
)

const workId = idSchema
const chapterId = v.pipe(v.string('ID chương phải là chữ.'), v.uuid('ID chương không hợp lệ.'))

export const listChaptersSchema = v.strictObject({ workId })
export const createChapterSchema = v.strictObject({
  workId,
  title: v.optional(chapterTitleSchema)
})
export const renameChapterSchema = v.strictObject({
  workId,
  chapterId,
  title: chapterTitleSchema
})
/** `to` is the 1-based position the chapter should end up at; the upper bound is checked in storage. */
export const moveChapterSchema = v.strictObject({
  workId,
  chapterId,
  to: v.pipe(
    v.number('Vị trí phải là số.'),
    v.integer('Vị trí phải là số nguyên.'),
    v.minValue(1, 'Vị trí bắt đầu từ 1.')
  )
})
export const chapterRefSchema = v.strictObject({ workId, chapterId })

export type CreateChapterInput = v.InferInput<typeof createChapterSchema>
