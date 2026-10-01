import type { JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import type { WorkSummary } from '../../../../shared/library'
import { cx } from '../../components/cx'
import { displayTitle } from '../work/chapterList'
import { useChapters } from '../work/useChapters'

/**
 * Left sidebar while a chapter is open: the chapters of the current work, instead of the library
 * navigation (which is not useful mid-translation). One row per chapter, no word count or status
 * text, so a long work still fits without scrolling past the fold.
 */
export function ChapterNavSidebar({
  workId,
  workTitle,
  activeChapterId,
  onOpenChapter,
  onBackToWork,
  onWorkChanged
}: {
  workId: string
  workTitle: string
  activeChapterId: string
  onOpenChapter(chapterId: string): void
  onBackToWork(): void
  onWorkChanged(summary: WorkSummary): void
}): JSX.Element {
  const { load, chapters } = useChapters(workId, onWorkChanged)

  return (
    <>
      <div className="flex h-[44px] shrink-0 items-center px-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-1 rounded-control px-1.5 py-1 text-ink-muted outline-none hover:bg-selected hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40"
          onClick={onBackToWork}
          title="Về tác phẩm"
        >
          <AltArrowLeftIcon size={14} className="shrink-0" />
          <span className="truncate text-[13px] font-semibold text-ink">{workTitle}</span>
        </button>
      </div>
      <nav aria-label="Danh sách chương" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {load === 'loading' ? (
          <p role="status" className="px-2 py-1.5 text-[12px] text-ink-muted">
            Đang tải…
          </p>
        ) : (
          chapters.map((chapter) => {
            const active = chapter.id === activeChapterId
            const dotClass =
              chapter.hasSource && chapter.hasTarget
                ? 'bg-success'
                : chapter.hasSource
                  ? 'bg-warning'
                  : 'bg-ink-muted/40'
            const dotLabel =
              chapter.hasSource && chapter.hasTarget
                ? 'Đã dịch'
                : chapter.hasSource
                  ? 'Chưa dịch'
                  : 'Chưa có bản gốc'
            return (
              <button
                key={chapter.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex w-full items-center gap-2 rounded-control px-2 py-1 text-left text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-focus/40',
                  active
                    ? 'bg-selected text-ink'
                    : 'text-ink-muted hover:bg-selected/60 hover:text-ink'
                )}
                onClick={() => onOpenChapter(chapter.id)}
              >
                <span
                  aria-hidden="true"
                  title={dotLabel}
                  className={cx('size-1.5 shrink-0 rounded-full', dotClass)}
                />
                <span className="truncate">
                  {chapter.number}. {displayTitle(chapter)}
                </span>
              </button>
            )
          })
        )}
      </nav>
    </>
  )
}
