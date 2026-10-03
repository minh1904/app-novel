import { IMAGE_ACCEPTED_MIMES, IMAGE_MAX_BYTES, type ImageMime } from '../../../shared/contracts/images'
import { StorageError } from './errors'

export interface StoredImage {
  mime: ImageMime
  data: Uint8Array
}

const DATA_URL_RE = /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

/**
 * The mime is taken from the bytes themselves, never from the data URL's declared type or a file
 * name extension: a renamed or mislabeled file must not slip past the format allow-list.
 */
function sniffMime(data: Uint8Array): ImageMime | null {
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return 'image/png'
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38
  ) {
    return 'image/gif'
  }
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

/** Turns an image data URL from the renderer into bytes, re-checking format and size. */
export function decodeImage(dataUrl: string): StoredImage {
  const match = DATA_URL_RE.exec(dataUrl)
  if (!match) throw new StorageError('validation', 'Ảnh không hợp lệ.')
  const base64 = dataUrl.slice(match[0].length)
  if (!BASE64_RE.test(base64)) throw new StorageError('validation', 'Ảnh không hợp lệ.')

  const data = Uint8Array.from(Buffer.from(base64, 'base64'))
  if (data.length === 0) throw new StorageError('validation', 'Ảnh trống.')
  if (data.length > IMAGE_MAX_BYTES) {
    throw new StorageError('validation', 'Ảnh quá lớn (tối đa 8 MB sau khi nén).')
  }
  const mime = sniffMime(data)
  if (mime === null || !IMAGE_ACCEPTED_MIMES.includes(mime)) {
    throw new StorageError('validation', 'Chỉ chấp nhận ảnh PNG, JPEG, GIF hoặc WebP.')
  }
  return { mime, data }
}

export function encodeImage(image: StoredImage): string {
  return 'data:' + image.mime + ';base64,' + Buffer.from(image.data).toString('base64')
}
