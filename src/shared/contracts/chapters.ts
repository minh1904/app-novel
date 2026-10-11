import * as v from 'valibot'
import { idSchema, type ChapterSummary, type WorkSummary } from './library'

export const CHAPTER_TITLE_MAX = 200

/** Thông tin chương hiển thị trên màn hình chi tiết tác phẩm. `number` tính từ vị trí, không lưu vào kho. */
export interface ChapterItem extends ChapterSummary {
  /** Thời điểm tạo (mili-giây epoch, UTC). */
  createdAt: number
  updatedAt: number
  /** Đã có nội dung gốc / bản dịch hay chưa (do kho tính toán, không nạp toàn bộ văn bản). */
  hasSource: boolean
  hasTarget: boolean
}

/** Kết quả thay đổi chương, trả kèm tóm tắt tác phẩm mới để cập nhật giao diện. */
export interface ChapterChange {
  work: WorkSummary
  chapter: ChapterItem
}

/** Thao tác di chuyển hoặc xóa tác động nhiều chương, trả về danh sách toàn bộ chương. */
export interface ChaptersChange {
  work: WorkSummary
  chapters: ChapterItem[]
}

/** Tên chương nằm trên một dòng: chuyển ngắt dòng thành dấu cách và cắt khoảng trắng hai đầu. */
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
/** `to` là vị trí kết quả 1-indexed của chương sau khi di chuyển; giới hạn trên do kho kiểm tra. */
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
