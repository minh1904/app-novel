import * as v from 'valibot'
import { idSchema } from './library'

/**
 * Images pasted or dropped into a chapter's translation. There is no vault folder like Obsidian's:
 * each image is a blob inside the work's own file, named by a generated ID that the embed syntax
 * (`![[id]]`, or `![[id|width]]` once resized) refers to.
 */

export const IMAGE_ACCEPTED_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const
export type ImageMime = (typeof IMAGE_ACCEPTED_MIMES)[number]

/** After renderer-side compression; see `imageEmbed.ts`. Re-checked by the main process. */
export const IMAGE_MAX_BYTES = 8_000_000
export const IMAGE_MAX_DIMENSION = 2000
export const IMAGE_MAX_PER_WORK = 200
export const IMAGE_MIN_WIDTH = 40

const workId = idSchema
const imageId = v.pipe(v.string('ID ảnh phải là chữ.'), v.uuid('ID ảnh không hợp lệ.'))

// base64 inflates by 4/3; the exact byte limit is enforced again after decoding.
const dataUrl = v.pipe(
  v.string('Ảnh không hợp lệ.'),
  v.maxLength(Math.ceil((IMAGE_MAX_BYTES * 4) / 3) + 64, 'Ảnh quá lớn.')
)

export const putImageSchema = v.strictObject({ workId, data: dataUrl })
export const getImageSchema = v.strictObject({ workId, imageId })
export const deleteImageSchema = v.strictObject({ workId, imageId })
export type PutImageInput = v.InferInput<typeof putImageSchema>
