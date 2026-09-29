import { COVER_DATA_URL_PREFIX, COVER_MAX_BYTES } from '../../shared/library'
import { StorageError } from './errors'

export interface CoverImage {
  mime: 'image/jpeg'
  data: Uint8Array
}

/**
 * Turns a cover data URL from the renderer into bytes, refusing anything that is not a plausible
 * JPEG. The renderer already re-encodes images, so this is a guard against a misbehaving caller,
 * not the primary conversion.
 */
export function decodeCover(dataUrl: string): CoverImage {
  if (!dataUrl.startsWith(COVER_DATA_URL_PREFIX)) {
    throw new StorageError('validation', 'Ảnh bìa phải là ảnh JPEG.')
  }
  const base64 = dataUrl.slice(COVER_DATA_URL_PREFIX.length)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new StorageError('validation', 'Ảnh bìa không hợp lệ.')
  }

  const data = Uint8Array.from(Buffer.from(base64, 'base64'))
  if (data.length === 0) throw new StorageError('validation', 'Ảnh bìa trống.')
  if (data.length > COVER_MAX_BYTES) {
    throw new StorageError('validation', 'Ảnh bìa quá lớn (tối đa 1 MB sau khi nén).')
  }
  const startsLikeJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  const endsLikeJpeg = data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
  if (!startsLikeJpeg || !endsLikeJpeg) {
    throw new StorageError('validation', 'Ảnh bìa không phải tệp JPEG hợp lệ.')
  }
  return { mime: 'image/jpeg', data }
}

export function encodeCover(cover: CoverImage): string {
  return COVER_DATA_URL_PREFIX + Buffer.from(cover.data).toString('base64')
}
