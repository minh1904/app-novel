/**
 * Chuyển đổi ảnh do người dùng chọn thành ảnh JPEG kích thước nhỏ để lưu làm ảnh bìa.
 * Quá trình giải mã diễn ra tại tiến trình renderer nhằm hỗ trợ nhiều định dạng ảnh phong phú.
 */

export const COVER_MAX_WIDTH = 600
export const COVER_MAX_HEIGHT = 900
/** Giữ dung lượng thấp hơn nhiều so với giới hạn lưu trữ 1 MiB sau khi trừ phần phụ trợ base64. */
const TARGET_BYTES = 700 * 1024
const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const QUALITIES = [0.85, 0.72, 0.6, 0.45]

export class CoverImageError extends Error {}

/** Thu nhỏ ảnh vừa với khung hình nhưng giữ nguyên tỷ lệ khung hình. Không phóng to ảnh. */
export function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new CoverImageError('Không đọc được ảnh này.'))
    reader.readAsDataURL(blob)
  })
}

export async function fileToCoverDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new CoverImageError('Hãy chọn một tệp ảnh (JPEG, PNG, WebP…).')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new CoverImageError('Ảnh quá lớn (tối đa 30 MB).')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new CoverImageError('Không đọc được ảnh này. Thử một tệp khác.')
  }

  try {
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      COVER_MAX_WIDTH,
      COVER_MAX_HEIGHT
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new CoverImageError('Không xử lý được ảnh này.')
    // JPEG không hỗ trợ trong suốt; cần nền trắng để tránh ảnh PNG trong suốt bị đen nền.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    let blob: Blob | null = null
    for (const quality of QUALITIES) {
      blob = await toBlob(canvas, quality)
      if (blob && blob.size <= TARGET_BYTES) break
    }
    if (!blob) throw new CoverImageError('Không xử lý được ảnh này.')
    if (blob.size > TARGET_BYTES * 1.4) throw new CoverImageError('Ảnh quá phức tạp để làm bìa.')
    return await blobToDataUrl(blob)
  } finally {
    bitmap.close()
  }
}
