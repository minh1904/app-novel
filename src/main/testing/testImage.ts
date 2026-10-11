import type { ImageMime } from '../../shared/contracts/images'

/** Các chuỗi byte có đúng magic number cho từng định dạng được chấp nhận, để `sniffMime` nhận diện. */
const SIGNATURES: Record<ImageMime, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
  'image/gif': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]
}

export function fakeImageBytes(mime: ImageMime, size = 64, fill = 0x11): Uint8Array {
  const signature = SIGNATURES[mime]
  const bytes = new Uint8Array(Math.max(size, signature.length)).fill(fill)
  bytes.set(signature, 0)
  return bytes
}

export function fakeImageDataUrl(mime: ImageMime, size = 64, fill = 0x11): string {
  return (
    'data:' + mime + ';base64,' + Buffer.from(fakeImageBytes(mime, size, fill)).toString('base64')
  )
}
