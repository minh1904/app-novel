import { buildRows } from '../../../shared/contracts/rows'
import type { LinkRecord } from '../../../shared/contracts/links'
import type { SegmentRecord, TextRecord, TextSide } from '../../../shared/contracts/text'
import { paragraphAt, splitParagraphs, type ParagraphSpan } from './chatToolText'

/**
 * `search_work`: quét chuỗi con trên toàn bộ văn bản của các chương mà không cần chỉ mục.
 * Tiếng Trung/Nhật/Hàn so khớp trực tiếp không cần tách từ; chữ cái La-tinh so khớp không phân biệt hoa thường.
 * Vị trí offset chỉ được sử dụng khi quá trình chuẩn hóa không làm thay đổi độ dài văn bản.
 */

export const SEARCH_QUERY_MAX = 100
export const SEARCH_RESULTS_MAX = 20
/** Số ký tự ngữ cảnh hai bên kết quả tìm kiếm, ngắt tại ranh giới dòng. */
export const SEARCH_EXCERPT_RADIUS = 60

/** Tìm vị trí xuất hiện của `query` trong `content`, trả về mảng các chỉ số offset. */
export function findMatches(content: string, query: string): number[] {
  const folded = fold(content)
  const needle = fold(query)
  const [haystack, wanted] =
    folded.length === content.length && needle.length > 0 ? [folded, needle] : [content, query]
  const offsets: number[] = []
  for (
    let at = haystack.indexOf(wanted);
    at >= 0;
    at = haystack.indexOf(wanted, at + wanted.length)
  ) {
    offsets.push(at)
  }
  return offsets
}

function fold(text: string): string {
  const normal = text.normalize('NFC')
  const lower = normal.toLowerCase()
  // Chuyển chữ thường một số ký tự đặc biệt có thể đổi độ dài; khi đó dùng chuỗi đã chuẩn hóa để so sánh.
  return lower.length === normal.length ? lower : normal
}

/** Trích đoạn văn bản quanh vị trí khớp, tối đa `SEARCH_EXCERPT_RADIUS` ký tự mỗi bên. */
export function excerptAt(
  content: string,
  span: ParagraphSpan,
  at: number,
  length: number
): string {
  const from = Math.max(span.lineStart, at - SEARCH_EXCERPT_RADIUS)
  const to = Math.min(span.lineEnd, at + length + SEARCH_EXCERPT_RADIUS)
  return (
    (from > span.lineStart ? '…' : '') +
    content.slice(from, to).trim() +
    (to < span.lineEnd ? '…' : '')
  )
}

/** Đoạn văn bản đối ứng ở phía còn lại theo liên kết gióng hàng. */
export type Counterpart =
  | { kind: 'linked'; texts: string[]; uncertain: boolean }
  | { kind: 'unaligned' }

const segmentAt = (record: TextRecord, offset: number): SegmentRecord | undefined =>
  record.segments.find((segment) => segment.start <= offset && offset < segment.end)

const isStale = (segment: SegmentRecord, record: TextRecord): boolean =>
  segment.status !== 'ok' || segment.textRev !== record.rev

/**
 * Tìm đoạn văn bản đối ứng ở phía còn lại chỉ thông qua các liên kết gióng hàng:
 * xác định phân đoạn chứa kết quả tìm kiếm, đọc các liên kết và lấy phân đoạn tương ứng ở phía đối diện.
 * Nếu không có phân đoạn, không có liên kết hoặc liên kết rỗng thì trả về `unaligned`.
 * Nếu liên kết cần soát lại hoặc phân đoạn thuộc bản sửa đổi cũ, văn bản vẫn được trả về nhưng đánh dấu `uncertain`.
 */
export function counterpartOf(
  side: TextSide,
  offset: number,
  source: TextRecord,
  target: TextRecord,
  links: LinkRecord[]
): Counterpart {
  const here = side === 'source' ? source : target
  const there = side === 'source' ? target : source
  const segment = segmentAt(here, offset)
  if (!segment) return { kind: 'unaligned' }
  const own = links.filter((link) => link.members.includes(segment.id))
  const position = new Map(there.segments.map((item, index) => [item.id, index]))
  // Với phía văn bản gốc, đọc cặp liên kết qua view hàng để đảm bảo đồng nhất với editor.
  const others =
    side === 'source'
      ? (buildRows(source, target, links).rows.find((row) => row.sourceId === segment.id)
          ?.targetIds ?? [])
      : [
          ...new Set(own.flatMap((link) => link.members.filter((member) => position.has(member))))
        ].sort((a, b) => position.get(a)! - position.get(b)!)
  if (others.length === 0) return { kind: 'unaligned' }
  const segments = others.map((id) => there.segments[position.get(id)!])
  return {
    kind: 'linked',
    texts: segments.map((item) => there.content.slice(item.start, item.end).trim()),
    uncertain:
      own.some((link) => link.status !== 'ok') ||
      isStale(segment, here) ||
      segments.some((item) => isStale(item, there))
  }
}

export interface SearchHit {
  chapter: number
  title: string
  chapterId: string
  /** Chỉ số đoạn văn bản tính từ 1 trên phía được tìm kiếm. */
  paragraph: number
  offset: number
  excerpt: string
}

/**
 * Danh sách kết quả tìm kiếm trong một chương theo thứ tự xuất hiện.
 * Chỉ tính toán số đoạn khi chương đó có kết quả khớp để tối ưu hiệu năng.
 */
export function hitsIn(
  chapter: { number: number; title: string; id: string },
  content: string,
  query: string
): SearchHit[] {
  const offsets = findMatches(content, query)
  if (offsets.length === 0) return []
  const spans = splitParagraphs(content)
  return offsets.map((offset) => {
    const index = paragraphAt(spans, offset)
    return {
      chapter: chapter.number,
      title: chapter.title,
      chapterId: chapter.id,
      paragraph: index + 1,
      offset,
      excerpt: excerptAt(content, spans[index], offset, query.length)
    }
  })
}

/**
 * Thông tin gióng hàng của một chương, đọc một lần cho lệnh gọi tool:
 * xây dựng view hàng ở lần đầu tiên cần tới thay vì tính toán lại cho từng đoạn văn bản.
 */
export interface ChapterAlignment {
  /**
   * Tìm văn bản đối ứng trong khoảng `[from, to)` của một phía thông qua liên kết gióng hàng.
   * `partial` biểu thị một số phân đoạn trong khoảng chưa có liên kết.
   */
  counterpart(side: TextSide, from: number, to: number): Counterpart & { partial?: boolean }
  /** Các phân đoạn gốc có ít nhất một phân đoạn dịch liên kết tương ứng. */
  linkedSources(): Set<string>
}

export function alignmentOf(
  source: TextRecord,
  target: TextRecord,
  links: LinkRecord[]
): ChapterAlignment {
  let rows: Map<string, string[]> | null = null
  const bySource = (): Map<string, string[]> =>
    (rows ??= new Map(
      buildRows(source, target, links).rows.map((row) => [row.sourceId, row.targetIds])
    ))

  return {
    counterpart(side, from, to) {
      const here = side === 'source' ? source : target
      const there = side === 'source' ? target : source
      const end = Math.max(to, from + 1)
      const segments = here.segments.filter((segment) => segment.start < end && segment.end > from)
      if (segments.length === 0) return { kind: 'unaligned' }
      const position = new Map(there.segments.map((item, index) => [item.id, index]))
      const others = new Set<string>()
      let unlinked = 0
      let uncertain = false
      for (const segment of segments) {
        const own = links.filter((link) => link.members.includes(segment.id))
        const ids =
          side === 'source'
            ? (bySource().get(segment.id) ?? [])
            : own.flatMap((link) => link.members.filter((member) => position.has(member)))
        if (ids.length === 0) {
          unlinked++
          continue
        }
        for (const id of ids) others.add(id)
        if (own.some((link) => link.status !== 'ok') || isStale(segment, here)) uncertain = true
      }
      if (others.size === 0) return { kind: 'unaligned' }
      const ordered = [...others].sort((a, b) => position.get(a)! - position.get(b)!)
      const linked = ordered.map((id) => there.segments[position.get(id)!])
      return {
        kind: 'linked',
        texts: linked.map((item) => there.content.slice(item.start, item.end).trim()),
        uncertain: uncertain || linked.some((item) => isStale(item, there)),
        ...(unlinked > 0 ? { partial: true } : {})
      }
    },
    linkedSources() {
      const linked = new Set<string>()
      for (const [id, targets] of bySource()) if (targets.length > 0) linked.add(id)
      return linked
    }
  }
}
