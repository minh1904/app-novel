import {
  IMAGE_ACCEPTED_MIMES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_DIMENSION
} from '../../../../shared/contracts/images'
import { fail, ok, type Result } from '../../../../shared/contracts/result'

/**
 * Turns a pasted or dropped file into the data URL that gets stored as an embedded image. Mirrors
 * `coverImage.ts`: decoding happens here because Chromium reads more formats than the main process
 * can; the main process re-checks whatever arrives by its actual bytes, not by this file's say-so.
 */

const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const JPEG_QUALITIES = [0.85, 0.72, 0.6, 0.45]
const ACCEPTED_AS_IS = new Set<string>(IMAGE_ACCEPTED_MIMES)

export class ImageEmbedError extends Error {}

function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / width, max / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new ImageEmbedError('Không đọc được ảnh này.'))
    reader.readAsDataURL(blob)
  })
}

/** PNG/GIF ignore the quality argument (lossless); only JPEG and WebP shrink by quality. */
function outputMimeFor(sourceMime: string): string {
  return sourceMime === 'image/jpeg' || sourceMime === 'image/webp' ? sourceMime : 'image/png'
}

async function encode(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  if (mime === 'image/jpeg') {
    let blob: Blob | null = null
    for (const quality of JPEG_QUALITIES) {
      blob = await toBlob(canvas, mime, quality)
      if (blob && blob.size <= IMAGE_MAX_BYTES) break
    }
    if (!blob) throw new ImageEmbedError('Không xử lý được ảnh này.')
    return blob
  }
  const blob = mime === 'image/webp' ? await toBlob(canvas, mime, 0.8) : await toBlob(canvas, mime)
  if (!blob) throw new ImageEmbedError('Không xử lý được ảnh này.')
  return blob
}

export interface PreparedImage {
  dataUrl: string
  width: number
  height: number
}

/** Resizes to fit the storage limits and re-encodes only when the original does not already fit. */
export async function fileToImageDataUrl(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new ImageEmbedError('Hãy chọn một tệp ảnh (PNG, JPEG, GIF, WebP).')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageEmbedError('Ảnh quá lớn (tối đa 30 MB).')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageEmbedError('Không đọc được ảnh này. Thử một tệp khác.')
  }

  try {
    const fitsAlready =
      ACCEPTED_AS_IS.has(file.type) &&
      file.size <= IMAGE_MAX_BYTES &&
      bitmap.width <= IMAGE_MAX_DIMENSION &&
      bitmap.height <= IMAGE_MAX_DIMENSION
    if (fitsAlready) {
      return { dataUrl: await blobToDataUrl(file), width: bitmap.width, height: bitmap.height }
    }

    const { width, height } = fitWithin(bitmap.width, bitmap.height, IMAGE_MAX_DIMENSION)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new ImageEmbedError('Không xử lý được ảnh này.')
    context.drawImage(bitmap, 0, 0, width, height)

    const mime = outputMimeFor(file.type)
    const blob = await encode(canvas, mime)
    if (blob.size > IMAGE_MAX_BYTES) {
      throw new ImageEmbedError('Ảnh quá lớn sau khi nén (tối đa 8 MB). Hãy chọn ảnh khác.')
    }
    return { dataUrl: await blobToDataUrl(blob), width, height }
  } finally {
    bitmap.close()
  }
}

/**
 * Compresses, uploads and returns the Markdown embed syntax to insert (`![[id]]`), or why it could
 * not be. The caller inserts the text at the caret or drop position; it never touches storage itself.
 */
export async function insertImageEmbed(workId: string, file: File): Promise<Result<string>> {
  let prepared: PreparedImage
  try {
    prepared = await fileToImageDataUrl(file)
  } catch (error) {
    return fail(
      'validation',
      error instanceof ImageEmbedError ? error.message : 'Không xử lý được ảnh này.'
    )
  }
  const result = await window.mira.images.put(workId, prepared.dataUrl)
  if (!result.ok) return result
  return ok('![[' + result.value.id + ']]')
}
