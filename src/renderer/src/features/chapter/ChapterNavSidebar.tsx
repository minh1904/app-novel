import { useEffect, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import type { WorkSummary } from '../../../../shared/contracts/library'
import { Badge } from '../../components/ui/Badge'
import { ICON } from '../../components/ui/icon'
import { NavItem } from '../../components/ui/NavItem'
import { cn } from '../../lib/cn'
import {
  chapterState,
  chapterStateLabels,
  displayTitle,
  type ChapterState
} from '../work/chapterList'
import { useChapters } from '../work/useChapters'

/** The same colours as the status column of the chapter list (ChapterRow). */
const STATE_DOTS: Record<ChapterState, string> = {
  translated: 'bg-success',
  untranslated: 'bg-warning',
  empty: 'bg-neutral/40'
}

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
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let active = true
    const loadCounts = async (): Promise<void> => {
      if (!window.mira?.ai?.proposals?.pendingCounts) return
      const result = await window.mira.ai.proposals.pendingCounts(workId)
      if (active && result.ok) {
        const counts: Record<string, number> = {}
        for (const item of result.value.counts) counts[item.chapterId] = item.count
        setPendingCounts(counts)
      }
    }
    void loadCounts()
    const refresh = (): void => {
      void loadCounts()
    }
    window.addEventListener('mira:proposals-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('mira:proposals-changed', refresh)
    }
  }, [workId])

  return (
    <>
      <div className="flex h-(--mira-header-height) shrink-0 items-center px-2.5">
        <NavItem
          strong
          onClick={onBackToWork}
          title="Về tác phẩm"
          leading={<AltArrowLeftIcon size={ICON.sm} aria-hidden="true" />}
        >
          {workTitle}
        </NavItem>
      </div>
      <nav aria-label="Danh sách chương" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {load === 'loading' ? (
          <p role="status" className="px-2 py-1.5 text-body-xs text-subtle">
            Đang tải…
          </p>
        ) : (
          chapters.map((chapter) => {
            const active = chapter.id === activeChapterId
            const state = chapterState(chapter)
            const dotClass = STATE_DOTS[state]
            const dotLabel = chapterStateLabels[state]
            const pending = pendingCounts[chapter.id] ?? 0
            return (
              <NavItem
                key={chapter.id}
                active={active}
                onClick={() => onOpenChapter(chapter.id)}
                leading={
                  <span
                    aria-hidden="true"
                    title={dotLabel}
                    className={cn('size-1.5 shrink-0 rounded-full', dotClass)}
                  />
                }
                trailing={
                  pending > 0 && (
                    <Badge
                      color="warning"
                      className="tabular-nums"
                      title={`${pending} đề xuất chờ duyệt`}
                    >
                      {pending}
                    </Badge>
                  )
                }
              >
                {chapter.number}. {displayTitle(chapter)}
              </NavItem>
            )
          })
        )}
      </nav>
    </>
  )
}
