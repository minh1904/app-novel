import { describe, expect, it } from 'vitest'
import { IMAGE_ACCEPTED_MIMES, IMAGE_MAX_BYTES } from '../../../shared/images'
import { decodeImage, encodeImage } from './image'
import { StorageError } from './errors'
import { fakeImageBytes, fakeImageDataUrl } from '../../testing/testImage'

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

describe('decodeImage', () => {
  it.each(IMAGE_ACCEPTED_MIMES)('round-trips a %s payload byte for byte', (mime) => {
    const url = fakeImageDataUrl(mime, 200, 0x42)
    const image = decodeImage(url)
    expect(image.mime).toBe(mime)
    expect(Array.from(image.data)).toEqual(Array.from(fakeImageBytes(mime, 200, 0x42)))
    expect(encodeImage(image)).toBe(url)
  })

  it('reads the mime from the bytes, not from the data URL prefix', () => {
    // Declares PNG, but the bytes are a JPEG signature: the declared type must not be trusted.
    const url =
      'data:image/png;base64,' + Buffer.from(fakeImageBytes('image/jpeg')).toString('base64')
    expect(decodeImage(url).mime).toBe('image/jpeg')
  })

  it.each([
    ['a plain string', 'not a data url'],
    ['invalid base64 characters', 'data:image/png;base64,@@@@'],
    ['an empty payload', 'data:image/png;base64,'],
    [
      'bytes that are not a recognised image format',
      'data:image/png;base64,' + Buffer.from('hello world').toString('base64')
    ],
    [
      'an SVG, which is not in the accepted list',
      'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64')
    ]
  ])('rejects %s', (_name, url) => {
    expect(codeOf(() => decodeImage(url))).toBe('validation')
  })

  it('rejects an image larger than the limit and accepts one exactly at it', () => {
    expect(codeOf(() => decodeImage(fakeImageDataUrl('image/png', IMAGE_MAX_BYTES + 1)))).toBe(
      'validation'
    )
    expect(
      codeOf(() => decodeImage(fakeImageDataUrl('image/png', IMAGE_MAX_BYTES)))
    ).toBeUndefined()
  })
})
