import { segment, type SegmentLanguage, type SegmentRange } from './segmenter'
import type { SegmentInput, SegmentRecord } from './text'

/**
 * How segment regions follow the text as it is edited, and how the regions an edit disturbed are
 * split again. Pure: no editor, no storage. Offsets are UTF-16 code units, like the stored regions.
 */

/** A segment while editing. `id` is null for a segment the store has not given an ID yet. */
export interface Seg {
  id: string | null
  from: number
  to: number
  /** Changed since the last save (or new): shown as edited, and a reason to split it again. */
  edited: boolean
}

/** One change in the coordinates of the text before it was applied. */
export interface Edit {
  from: number
  to: number
  insert: string
}

const SPACE = /\s/
const hasText = (text: string): boolean => /\S/.test(text)

export function segFromRecord(record: SegmentRecord): Seg {
  return { id: record.id, from: record.start, to: record.end, edited: false }
}

export function toSegmentInputs(segs: Seg[]): SegmentInput[] {
  return segs.map((seg) =>
    seg.id === null
      ? { start: seg.from, end: seg.to }
      : { id: seg.id, start: seg.from, end: seg.to }
  )
}

/**
 * Moves the regions through a set of changes. `edits` are in ascending order and do not overlap, all
 * in the coordinates of the text before any of them (what a CodeMirror change set gives). Segments an
 * edit does not touch keep their ID and their text and only shift.
 */
export function applyEdits(segs: Seg[], edits: Edit[]): Seg[] {
  let current = segs
  // Applying from the last to the first keeps the coordinates of the earlier edits valid.
  for (let i = edits.length - 1; i >= 0; i--) current = applyEdit(current, edits[i])
  return current
}

function applyEdit(segs: Seg[], edit: Edit): Seg[] {
  const { from, to, insert } = edit
  const n = insert.length
  const delta = n - (to - from)
  if (delta === 0 && from === to) return segs

  // Segments whose region the replaced range overlaps. For a pure insertion this is the one segment
  // the position lies strictly inside, if any.
  let first = -1
  let last = -1
  segs.forEach((seg, index) => {
    if (seg.from < to && seg.to > from) {
      if (first === -1) first = index
      last = index
    }
  })

  const shift = (seg: Seg): Seg =>
    seg.from >= to ? { ...seg, from: seg.from + delta, to: seg.to + delta } : seg

  if (first !== -1) {
    const head = segs[first]
    const tail = segs[last]
    const headSurvives = head.from < from
    const tailSurvives = tail.to > to
    const inserts = hasText(insert)

    let id: string | null = null
    let survives = true
    if (headSurvives) id = head.id
    else if (tailSurvives) id = tail.id
    else if (inserts) id = head.id
    else survives = false

    const out = segs.slice(0, first)
    if (survives) {
      const start = headSurvives ? head.from : from
      const end = tailSurvives ? tail.to + delta : from + n
      if (end > start) out.push({ id, from: start, to: end, edited: true })
    }
    for (let i = last + 1; i < segs.length; i++) out.push(shift(segs[i]))
    return out
  }

  // The change lies outside every segment. Text typed at the edge of one belongs to it.
  const out: Seg[] = []
  const lineBreak = insert.indexOf('\n')
  const headPart = lineBreak === -1 ? insert : insert.slice(0, lineBreak)
  const tailPart = insert.slice(insert.lastIndexOf('\n') + 1)
  let extendedLeft = false

  for (const seg of segs) {
    if (seg.to === from && hasText(headPart)) {
      // Continuing the sentence: the part up to the first line break joins it.
      out.push({ ...seg, to: from + headPart.length, edited: true })
      extendedLeft = true
    } else if (seg.from === from && from === to && !extendedLeft && hasText(tailPart)) {
      // Typing in front of a sentence that has white space or a line break on its left.
      const start = from + insert.length - tailPart.length
      out.push({ ...seg, from: start, to: seg.to + delta, edited: true })
    } else {
      out.push(shift(seg))
    }
  }
  return out
}

/** Breaks that make the order of the regions meaningless: bad range, out of bounds, overlap, repeated ID. */
function structuralProblems(content: string, segs: Seg[]): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  let previousEnd = 0
  segs.forEach((seg, index) => {
    const label = 'Segment ' + (index + 1)
    if (seg.from < 0 || seg.to <= seg.from) problems.push(label + ': vùng không hợp lệ.')
    if (seg.to > content.length) problems.push(label + ': vượt độ dài văn bản.')
    if (seg.from < previousEnd) problems.push(label + ': chồng lên segment trước.')
    if (seg.id !== null) {
      if (ids.has(seg.id)) problems.push(label + ': ID bị trùng.')
      ids.add(seg.id)
    }
    previousEnd = Math.max(previousEnd, seg.to)
  })
  return problems
}

/** What is wrong with a set of segments, as readable lines; empty when it is sound. */
export function checkSegments(content: string, segs: Seg[]): string[] {
  const problems = structuralProblems(content, segs)
  if (problems.length > 0) return problems
  let previousEnd = 0
  segs.forEach((seg, index) => {
    const label = 'Segment ' + (index + 1)
    if (hasText(content.slice(previousEnd, seg.from))) {
      problems.push(label + ': có chữ nằm ngoài mọi segment ngay trước nó.')
    }
    if (content.slice(seg.from, seg.to).includes('\n')) {
      problems.push(label + ': vắt qua hai dòng.')
    }
    if (cuts(content, seg.from) || cuts(content, seg.to))
      problems.push(label + ': cắt cặp surrogate.')
    previousEnd = seg.to
  })
  if (hasText(content.slice(previousEnd))) problems.push('Có chữ nằm sau segment cuối.')
  return problems
}

function cuts(content: string, offset: number): boolean {
  if (offset <= 0 || offset >= content.length) return false
  const before = content.charCodeAt(offset - 1)
  const after = content.charCodeAt(offset)
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff
}

/** The start and end offsets of every line of `content`, the end being before the line break. */
function lineBounds(content: string): Array<[number, number]> {
  const lines: Array<[number, number]> = []
  let start = 0
  for (;;) {
    const end = content.indexOf('\n', start)
    if (end === -1) {
      lines.push([start, content.length])
      return lines
    }
    lines.push([start, end])
    start = end + 1
  }
}

/** Index of the line holding `offset`, found by bisection. */
function lineOf(lines: Array<[number, number]>, offset: number): number {
  let low = 0
  let high = lines.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (lines[mid][0] <= offset) low = mid
    else high = mid - 1
  }
  return low
}

const overlap = (a: SegmentRange, b: SegmentRange): number =>
  Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))

/**
 * Splits again the lines an edit disturbed: lines with an edited segment, with text outside every
 * segment, or with a segment that runs over a line break. Everything else is returned untouched, so
 * the IDs of segments nobody touched never change. In a re-split line a new segment takes the ID
 * of the old one it overlaps most (the earlier one on a tie); the others have no ID until saved.
 */
export function resegment(content: string, segs: Seg[], lang: SegmentLanguage): Seg[] {
  const lines = lineBounds(content)
  const dirty = new Set<number>()

  // Segments that cannot be trusted put every line they touch in play.
  const sound = structuralProblems(content, segs).length === 0
  if (!sound) lines.forEach((_, index) => dirty.add(index))

  if (sound) {
    let covered = 0
    const markText = (from: number, to: number): void => {
      for (let i = from; i < to; i++) {
        if (!SPACE.test(content[i])) {
          dirty.add(lineOf(lines, i))
          i = lines[lineOf(lines, i)][1]
        }
      }
    }
    for (const seg of segs) {
      markText(covered, seg.from)
      covered = seg.to
      const suspect =
        seg.edited ||
        content.slice(seg.from, seg.to).includes('\n') ||
        cuts(content, seg.from) ||
        cuts(content, seg.to)
      if (suspect) {
        const lastLine = lineOf(lines, Math.max(seg.from, seg.to - 1))
        for (let l = lineOf(lines, seg.from); l <= lastLine; l++) dirty.add(l)
      }
    }
    markText(covered, content.length)
  }
  if (dirty.size === 0) return segs

  // Group the dirty lines into runs of consecutive lines.
  const ordered = [...dirty].sort((a, b) => a - b)
  const windows: Array<[number, number]> = []
  for (const line of ordered) {
    const [start, end] = lines[line]
    const last = windows[windows.length - 1]
    if (last && lines[line - 1] && last[1] === lines[line - 1][1]) last[1] = end
    else windows.push([start, end])
  }

  const out: Seg[] = []
  let cursor = 0
  for (const [windowStart, windowEnd] of windows) {
    while (cursor < segs.length && segs[cursor].to <= windowStart) out.push(segs[cursor++])
    const inside: Seg[] = []
    while (cursor < segs.length && segs[cursor].from < windowEnd) inside.push(segs[cursor++])
    out.push(...splitWindow(content, windowStart, windowEnd, inside, lang))
  }
  while (cursor < segs.length) out.push(segs[cursor++])
  return out
}

function splitWindow(
  content: string,
  windowStart: number,
  windowEnd: number,
  old: Seg[],
  lang: SegmentLanguage
): Seg[] {
  const fresh = segment(content.slice(windowStart, windowEnd), lang).map((range) => ({
    start: range.start + windowStart,
    end: range.end + windowStart
  }))

  // For each old segment, the new one it overlaps most; then each new one keeps the best claimant.
  const claims = new Map<number, { old: number; size: number }>()
  old.forEach((seg, oldIndex) => {
    if (seg.id === null) return
    let best = -1
    let bestSize = 0
    fresh.forEach((range, index) => {
      const size = overlap({ start: seg.from, end: seg.to }, range)
      if (size > bestSize) {
        best = index
        bestSize = size
      }
    })
    if (best === -1) return
    const rival = claims.get(best)
    if (!rival || bestSize > rival.size) claims.set(best, { old: oldIndex, size: bestSize })
  })

  return fresh.map((range, index) => {
    const claim = claims.get(index)
    const source = claim === undefined ? undefined : old[claim.old]
    const unchanged = source !== undefined && source.from === range.start && source.to === range.end
    return {
      id: source?.id ?? null,
      from: range.start,
      to: range.end,
      edited: unchanged ? source.edited : true
    }
  })
}
