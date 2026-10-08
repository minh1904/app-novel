import { buildRows } from '../../../shared/contracts/rows'
import type { LinkRecord } from '../../../shared/contracts/links'
import type { SegmentRecord, TextRecord, TextSide } from '../../../shared/contracts/text'
import { paragraphAt, splitParagraphs, type ParagraphSpan } from './chatToolText'

/**
 * `search_work`: a substring scan over the stored text of every chapter, no index (D3 of change
 * `chat-tools-paging-search`). CJK needs no word splitting to match; Latin letters match regardless of
 * case. Offsets are only trusted when normalising did not change the length of the text, otherwise the
 * scan runs on the text as stored.
 */

export const SEARCH_QUERY_MAX = 100
export const SEARCH_RESULTS_MAX = 20
/** Characters of context on each side of a match, cut at the edges of its line. */
export const SEARCH_EXCERPT_RADIUS = 60

/** Where `query` occurs in `content`, as offsets into `content` itself. */
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
  // Lower-casing a few letters changes their length; then only the normalised form is comparable.
  return lower.length === normal.length ? lower : normal
}

/** The line around a match, at most `SEARCH_EXCERPT_RADIUS` characters each side, with marks where cut. */
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

/** What the other side says about a match, as far as the alignment links can tell. */
export type Counterpart =
  | { kind: 'linked'; texts: string[]; uncertain: boolean }
  | { kind: 'unaligned' }

const segmentAt = (record: TextRecord, offset: number): SegmentRecord | undefined =>
  record.segments.find((segment) => segment.start <= offset && offset < segment.end)

const isStale = (segment: SegmentRecord, record: TextRecord): boolean =>
  segment.status !== 'ok' || segment.textRev !== record.rev

/**
 * The other side of a match, **only** through alignment links (D4): the segment that holds the match,
 * its links, the segments they join on the other side, in that side's order. No segment, no link, or a
 * link with nothing on the other side is `unaligned` — never "the paragraph with the same number", which
 * looks like evidence and is often wrong. A link that needs review or is broken, or a segment written
 * for an older revision, still gives its text but is marked uncertain.
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
  // From the source side, read the pairs through the row view the editor shows, so both agree.
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
  /** 1-based paragraph on the searched side. */
  paragraph: number
  offset: number
  excerpt: string
}

/**
 * One chapter's hits, in text order. Paragraphs are only worked out for a chapter that has a match: most
 * chapters have none, and splitting all of them was most of the cost of a search.
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
 * The alignment of one chapter, read once for a tool call that asks about many paragraphs: the row view is
 * built the first time it is needed instead of once per paragraph, which on a long chapter was the whole
 * cost of the call.
 */
export interface ChapterAlignment {
  /**
   * The other side of the stretch `[from, to)` of `side`: every segment that overlaps it, through links
   * only, as `counterpartOf` reads one offset. `partial` says some of those segments have no link.
   */
  counterpart(side: TextSide, from: number, to: number): Counterpart & { partial?: boolean }
  /** Source segments that have at least one linked translation segment. */
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
