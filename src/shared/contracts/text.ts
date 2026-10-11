import * as v from 'valibot'
import { idSchema } from './library'

export const TEXT_SIDES = ['source', 'target'] as const
export type TextSide = (typeof TEXT_SIDES)[number]

/** Giới hạn ký tự và đoạn văn tối đa cho một phía văn bản của chương. */
export const TEXT_MAX_UNITS = 2_000_000
export const SEGMENTS_MAX = 50_000

export type SegmentStatus = 'ok' | 'dirty' | 'orphaned'

/** Một đoạn văn bản trong chương. `start` và `end` tính theo UTF-16 code units. */
export interface SegmentRecord {
  id: string
  start: number
  end: number
  /** Revision của văn bản mà đoạn này có hiệu lực. */
  textRev: number
  status: SegmentStatus
}

export interface TextRecord {
  content: string
  /** Bằng 0 cho đến khi phía văn bản được lưu lần đầu. */
  rev: number
  segments: SegmentRecord[]
}

const chapterId = v.pipe(v.string('ID chương phải là chữ.'), v.uuid('ID chương không hợp lệ.'))
const side = v.picklist(TEXT_SIDES, 'Bên văn bản không hợp lệ.')

export const textRefSchema = v.strictObject({ workId: idSchema, chapterId, side })

const segmentInput = v.strictObject({
  id: v.optional(v.pipe(v.string('ID segment phải là chữ.'), v.uuid('ID segment không hợp lệ.'))),
  start: v.pipe(
    v.number('Vị trí phải là số.'),
    v.integer('Vị trí phải là số nguyên.'),
    v.minValue(0)
  ),
  end: v.pipe(v.number('Vị trí phải là số.'), v.integer('Vị trí phải là số nguyên.'), v.minValue(0))
})

export const saveTextSchema = v.strictObject({
  workId: idSchema,
  chapterId,
  side,
  content: v.pipe(
    v.string('Nội dung phải là chữ.'),
    v.maxLength(TEXT_MAX_UNITS, 'Văn bản tối đa ' + TEXT_MAX_UNITS.toLocaleString('vi') + ' ký tự.')
  ),
  expectedRev: v.pipe(
    v.number('Revision phải là số.'),
    v.integer('Revision phải là số nguyên.'),
    v.minValue(0)
  ),
  segments: v.pipe(
    v.array(segmentInput),
    v.maxLength(SEGMENTS_MAX, 'Mỗi bên tối đa ' + SEGMENTS_MAX.toLocaleString('vi') + ' segment.')
  )
})

export type SegmentInput = v.InferInput<typeof segmentInput>
export type SaveTextInput = v.InferInput<typeof saveTextSchema>
