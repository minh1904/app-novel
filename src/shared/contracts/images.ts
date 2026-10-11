import * as v from 'valibot'
import { idSchema } from './library'

/**
 * Quản lý ảnh dán hoặc kéo thả vào bản dịch của chương.
 * Mỗi ảnh là một blob lưu trong tệp tác phẩm, định danh bằng ID sinh ngẫu nhiên dùng trong cú pháp nhúng
 * (`![[id]]`, hoặc `![[id|width]]`).
 */

export const IMAGE_ACCEPTED_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const
export type ImageMime = (typeof IMAGE_ACCEPTED_MIMES)[number]

/** Giới hạn sau khi nén phía renderer, được kiểm tra lại bởi main process. */
export const IMAGE_MAX_BYTES = 8_000_000
export const IMAGE_MAX_DIMENSION = 2000
export const IMAGE_MAX_PER_WORK = 200
export const IMAGE_MIN_WIDTH = 40

const workId = idSchema
const imageId = v.pipe(v.string('ID ảnh phải là chữ.'), v.uuid('ID ảnh không hợp lệ.'))

// Chuỗi base64 tăng kích thước khoảng 4/3; giới hạn byte chính xác được kiểm tra lại sau khi giải mã.
const dataUrl = v.pipe(
  v.string('Ảnh không hợp lệ.'),
  v.maxLength(Math.ceil((IMAGE_MAX_BYTES * 4) / 3) + 64, 'Ảnh quá lớn.')
)

export const putImageSchema = v.strictObject({ workId, data: dataUrl })
export const getImageSchema = v.strictObject({ workId, imageId })
export const deleteImageSchema = v.strictObject({ workId, imageId })
export type PutImageInput = v.InferInput<typeof putImageSchema>
