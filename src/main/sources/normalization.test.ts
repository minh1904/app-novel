import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { contentIdentity, normalizeSourceText, relativePathIdentity } from './normalization'

describe('source normalization and identity', () => {
  it('normalizes mixed newlines and Unicode to NFC without trimming semantic whitespace', () => {
    const decoded = '  e\u0301\r\nnext\rfinal  \n'
    const result = contentIdentity(Buffer.from(decoded, 'utf8'))

    expect(result.text).toBe('  é\nnext\nfinal  \n')
    expect(result.normalizationVersion).toBe(1)
    expect(result.contentHash).toBe(
      createHash('sha256').update('  é\nnext\nfinal  \n', 'utf8').digest('hex')
    )
    expect(result.payloadHash).toBe(createHash('sha256').update(Buffer.from(decoded)).digest('hex'))
  })

  it('keeps empty content valid', () => {
    expect(normalizeSourceText('')).toBe('')
    expect(contentIdentity(Buffer.alloc(0)).text).toBe('')
  })

  it('normalizes a relative path into a stable, separator-independent identity', () => {
    expect(relativePathIdentity('.\\Volume 1\\e\u0301.md')).toBe('Volume 1/é.md')
    expect(() => relativePathIdentity('../outside.txt')).toThrow(/outside/)
    expect(() => relativePathIdentity('/absolute.txt')).toThrow(/relative/)
  })
})
