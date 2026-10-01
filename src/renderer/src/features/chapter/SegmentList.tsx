import { memo, useMemo, useState, type JSX } from 'react'
import type { SourceLanguage } from '../../../../shared/library'
import type { SegmentRecord } from '../../../../shared/text'
import { ChapterPager } from '../work/ChapterPager'
import { clampPage, slicePage } from '../work/chapterList'

/** Rows per page: enough to read a screenful of a chapter, few enough that 5,000 segments stay light. */
export const SEGMENTS_PER_PAGE = 200

interface Row {
  segment: SegmentRecord
  number: number
  text: string
  /** A line break lies between this segment and the one before it, so a new paragraph starts. */
  paragraphStart: boolean
}

function toRows(content: string, segments: SegmentRecord[]): Row[] {
  return segments.map((segment, index) => ({
    segment,
    number: index + 1,
    text: content.slice(segment.start, segment.end),
    paragraphStart:
      index > 0 && content.slice(segments[index - 1].end, segment.start).includes('\n')
  }))
}

const SegmentRow = memo(function SegmentRow({
  row,
  lang
}: {
  row: Row
  lang: SourceLanguage
}): JSX.Element {
  return (
    <li
      className={
        'grid grid-cols-[44px_minmax(0,1fr)] items-baseline gap-x-2 border-b border-line px-2 py-1.5 last:border-b-0' +
        (row.paragraphStart ? ' pt-4' : '')
      }
    >
      <span className="pl-1 text-xs text-ink-muted tabular-nums">{row.number}</span>
      <span lang={lang} className="text-[14px] leading-[1.7] break-words whitespace-pre-wrap">
        {row.text}
      </span>
    </li>
  )
})

/**
 * The source text as one row per segment, read only. Long chapters are shown a page at a time, so
 * a chapter of thousands of segments opens and scrolls without holding every row in the page.
 */
export function SegmentList({
  content,
  segments,
  lang
}: {
  content: string
  segments: SegmentRecord[]
  lang: SourceLanguage
}): JSX.Element {
  const [page, setPage] = useState(1)
  const rows = useMemo(() => toRows(content, segments), [content, segments])
  const current = clampPage(page, rows.length, SEGMENTS_PER_PAGE)
  const visible = useMemo(() => slicePage(rows, current, SEGMENTS_PER_PAGE), [rows, current])

  return (
    <div className="flex flex-col gap-1">
      <div className="overflow-hidden rounded-panel border border-line">
        <ol aria-label="Các segment của bản gốc">
          {visible.map((row) => (
            <SegmentRow key={row.segment.id} row={row} lang={lang} />
          ))}
        </ol>
      </div>
      <ChapterPager
        page={current}
        pageSize={SEGMENTS_PER_PAGE}
        total={rows.length}
        onPage={setPage}
        unit="segment"
      />
    </div>
  )
}
