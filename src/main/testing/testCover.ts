import { COVER_DATA_URL_PREFIX } from '../../shared/contracts/library'

/** A byte sequence that looks like a JPEG to the guards (start and end markers) without being one. */
export function fakeJpegBytes(size = 64, fill = 0x11): Uint8Array {
  const bytes = new Uint8Array(size).fill(fill)
  bytes.set([0xff, 0xd8, 0xff], 0)
  bytes.set([0xff, 0xd9], size - 2)
  return bytes
}

export function fakeJpegDataUrl(size = 64, fill = 0x11): string {
  return COVER_DATA_URL_PREFIX + Buffer.from(fakeJpegBytes(size, fill)).toString('base64')
}
