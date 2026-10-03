import { describe, expect, it } from 'vitest'
import { COVER_DATA_URL_PREFIX, COVER_MAX_BYTES } from '../../../shared/contracts/library'
import { decodeCover, encodeCover } from './cover'
import { StorageError } from './errors'
import { fakeJpegBytes, fakeJpegDataUrl } from '../../testing/testCover'

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

describe('decodeCover', () => {
  it('round-trips a JPEG-shaped payload byte for byte', () => {
    const url = fakeJpegDataUrl(200, 0x42)
    const cover = decodeCover(url)
    expect(cover.mime).toBe('image/jpeg')
    expect(Array.from(cover.data)).toEqual(Array.from(fakeJpegBytes(200, 0x42)))
    expect(encodeCover(cover)).toBe(url)
  })

  it.each([
    ['a PNG data URL', 'data:image/png;base64,iVBORw0KGgo='],
    ['a plain string', 'not a data url'],
    ['an empty payload', COVER_DATA_URL_PREFIX],
    ['invalid base64 characters', COVER_DATA_URL_PREFIX + '@@@@'],
    [
      'bytes without the JPEG start marker',
      COVER_DATA_URL_PREFIX + Buffer.from('hello world').toString('base64')
    ],
    [
      'bytes without the JPEG end marker',
      COVER_DATA_URL_PREFIX + Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3, 4]).toString('base64')
    ]
  ])('rejects %s', (_name, url) => {
    expect(codeOf(() => decodeCover(url))).toBe('validation')
  })

  it('rejects an image larger than the limit and accepts one exactly at it', () => {
    expect(codeOf(() => decodeCover(fakeJpegDataUrl(COVER_MAX_BYTES + 1)))).toBe('validation')
    expect(codeOf(() => decodeCover(fakeJpegDataUrl(COVER_MAX_BYTES)))).toBeUndefined()
  })
})
