import { SEGMENTS_MAX, TEXT_MAX_UNITS, type SegmentInput } from '../../../shared/text'
import { StorageError } from './errors'

/** Pure rules for chapter text and its segments. Offsets are UTF-16 code units. */

export interface SegmentCheck {
  /** Indices of segments that start or end between the two halves of a surrogate pair. */
  splitsSurrogate: number[]
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff
}

/** True when `offset` falls inside a surrogate pair, i.e. it would cut one character in two. */
export function cutsSurrogatePair(content: string, offset: number): boolean {
  if (offset <= 0 || offset >= content.length) return false
  return (
    isHighSurrogate(content.charCodeAt(offset - 1)) && isLowSurrogate(content.charCodeAt(offset))
  )
}

/**
 * Refuses text or segments that break a rule, so a bad write changes nothing. Cutting through a
 * surrogate pair is allowed (the editor decides) but reported, since it usually means an offset
 * was counted in code points.
 */
export function checkText(content: string, segments: SegmentInput[]): SegmentCheck {
  if (content.length > TEXT_MAX_UNITS) {
    throw new StorageError(
      'validation',
      'Văn bản dài ' +
        content.length.toLocaleString('vi') +
        ' ký tự, vượt giới hạn ' +
        TEXT_MAX_UNITS.toLocaleString('vi') +
        '.'
    )
  }
  if (segments.length > SEGMENTS_MAX) {
    throw new StorageError(
      'validation',
      'Có ' + segments.length + ' segment, vượt giới hạn ' + SEGMENTS_MAX + ' mỗi bên.'
    )
  }

  const splitsSurrogate: number[] = []
  const seen = new Set<string>()
  let previousEnd = 0

  segments.forEach((segment, index) => {
    const label = 'Segment ' + (index + 1)
    if (!Number.isInteger(segment.start) || !Number.isInteger(segment.end)) {
      throw new StorageError('validation', label + ': vị trí phải là số nguyên.')
    }
    if (segment.start < 0 || segment.end < segment.start) {
      throw new StorageError(
        'validation',
        label + ': vùng không hợp lệ (' + segment.start + '–' + segment.end + ').'
      )
    }
    if (segment.end > content.length) {
      throw new StorageError(
        'validation',
        label + ': vùng vượt độ dài văn bản (' + segment.end + ' > ' + content.length + ').'
      )
    }
    if (segment.start < previousEnd) {
      throw new StorageError('validation', label + ': chồng lên segment trước hoặc sai thứ tự.')
    }
    if (segment.id !== undefined) {
      if (seen.has(segment.id)) throw new StorageError('validation', label + ': ID bị trùng.')
      seen.add(segment.id)
    }
    if (cutsSurrogatePair(content, segment.start) || cutsSurrogatePair(content, segment.end)) {
      splitsSurrogate.push(index)
    }
    previousEnd = segment.end
  })

  return { splitsSurrogate }
}
