import { segment, type SegmentLanguage, type SegmentRange } from './segmenter'
import type { SegmentInput, SegmentRecord } from '../contracts/text'

/**
 * Cơ chế theo dõi tọa độ segment khi văn bản được chỉnh sửa và phân đoạn lại những vùng bị tác động.
 * Hàm thuần túy: không phụ thuộc editor hay kho lưu trữ. Tọa độ là các đơn vị mã UTF-16.
 */

/** Một segment trong quá trình chỉnh sửa. `id` là null nếu kho lưu trữ chưa cấp ID. */
export interface Seg {
  id: string | null
  from: number
  to: number
  /** Đã thay đổi kể từ lần lưu trước (hoặc tạo mới): đánh dấu trạng thái chỉnh sửa và là căn cứ để phân đoạn lại. */
  edited: boolean
}

/** Một thay đổi theo hệ tọa độ của văn bản trước khi áp dụng chỉnh sửa. */
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
 * Dịch chuyển các vùng segment qua một tập hợp các thay đổi. Danh sách `edits` theo thứ tự tăng dần
 * và không chồng lấn, đều tính theo tọa độ của văn bản trước chỉnh sửa.
 * Các segment không bị tác động sẽ giữ nguyên ID, nội dung và chỉ bị dịch chuyển vị trí.
 */
export function applyEdits(segs: Seg[], edits: Edit[]): Seg[] {
  let current = segs
  // Áp dụng từ chỉnh sửa cuối về đầu để bảo toàn tính hợp lệ của tọa độ các chỉnh sửa trước đó.
  for (let i = edits.length - 1; i >= 0; i--) current = applyEdit(current, edits[i])
  return current
}

function applyEdit(segs: Seg[], edit: Edit): Seg[] {
  const { from, to, insert } = edit
  const n = insert.length
  const delta = n - (to - from)
  if (delta === 0 && from === to) return segs

  // Các segment mà khoảng thay thế chồng lấn. Với trường hợp chèn thuần túy, đây là segment duy nhất bao trọn vị trí chèn (nếu có).
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

  // Thay đổi nằm ngoài mọi segment. Ký tự gõ ở mép ngoài của segment sẽ được nhập vào segment đó.
  const out: Seg[] = []
  const lineBreak = insert.indexOf('\n')
  const headPart = lineBreak === -1 ? insert : insert.slice(0, lineBreak)
  const tailPart = insert.slice(insert.lastIndexOf('\n') + 1)
  let extendedLeft = false

  for (const seg of segs) {
    if (seg.to === from && hasText(headPart)) {
      // Viết tiếp câu: phần nội dung cho đến dấu xuống dòng đầu tiên sẽ nối vào segment này.
      out.push({ ...seg, to: from + headPart.length, edited: true })
      extendedLeft = true
    } else if (seg.from === from && from === to && !extendedLeft && hasText(tailPart)) {
      // Gõ vào ngay trước một câu có khoảng trắng hoặc dấu xuống dòng ở bên trái.
      const start = from + insert.length - tailPart.length
      out.push({ ...seg, from: start, to: seg.to + delta, edited: true })
    } else {
      out.push(shift(seg))
    }
  }
  return out
}

/** Các lỗi cấu trúc khiến thứ tự vùng segment mất ý nghĩa: vùng sai, vượt biên, chồng lấn, trùng lặp ID. */
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

/** Danh sách các lỗi của tập hợp segment dưới dạng dòng chữ dễ đọc; trả về mảng rỗng nếu hợp lệ. */
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

/** Tọa độ bắt đầu và kết thúc của từng dòng trong `content`, điểm kết thúc nằm trước dấu xuống dòng. */
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

/** Chỉ số dòng chứa vị trí `offset`, tìm kiếm bằng phương pháp chia đôi (nhị phân). */
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
 * Phân đoạn lại các dòng bị xáo trộn do chỉnh sửa: dòng chứa segment đã sửa, dòng có chữ nằm ngoài
 * mọi segment, hoặc dòng có segment vắt qua dấu xuống dòng. Các phần còn lại được giữ nguyên vẹn,
 * bảo toàn ID của các segment không bị chạm đến. Trong dòng được phân đoạn lại, segment mới nhận lại ID
 * của segment cũ có mức độ chồng lấn lớn nhất (ưu tiên đoạn trước khi hòa); các đoạn còn lại không có ID cho đến khi lưu.
 */
export function resegment(content: string, segs: Seg[], lang: SegmentLanguage): Seg[] {
  const lines = lineBounds(content)
  const dirty = new Set<number>()

  // Các segment không đáng tin cậy sẽ đưa mọi dòng mà chúng chạm vào vào diện cần phân đoạn lại.
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

  // Nhóm các dòng cần xử lý thành từng khoảng dòng liên tiếp.
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

  // Với mỗi segment cũ, tìm segment mới chồng lấn nhiều nhất; sau đó mỗi segment mới giữ lại ứng viên khớp tốt nhất.
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
