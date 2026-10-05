import { useEffect, useState, type JSX } from 'react'
import { cx } from '../../components/cx'
import type { SessionStatus } from '../editor/editorSession'
import { combinedSaveLabel, textStats } from './chapterStats'

/** Pending AI proposals for one chapter, refreshed whenever any proposal changes. */
function usePendingCount(workId: string, chapterId: string): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let active = true
    const load = async (): Promise<void> => {
      if (!window.mira?.ai?.proposals?.pendingCounts) return
      const result = await window.mira.ai.proposals.pendingCounts(workId)
      if (active && result.ok) {
        setCount(result.value.counts.find((item) => item.chapterId === chapterId)?.count ?? 0)
      }
    }
    void load()
    const refresh = (): void => void load()
    window.addEventListener('mira:proposals-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('mira:proposals-changed', refresh)
    }
  }, [workId, chapterId])
  return count
}

/**
 * The strip under the chapter's panes, as Obsidian keeps one under its editor: figures for the
 * translation as it is typed, whether the chapter is saved, and how many AI proposals wait. Small and
 * muted so it never competes with the text; the proposal count opens the AI panel that holds them.
 */
export function ChapterStatusBar({
  workId,
  chapterId,
  translation,
  statuses,
  onOpenProposals
}: {
  workId: string
  chapterId: string
  translation: string
  statuses: SessionStatus[]
  onOpenProposals(): void
}): JSX.Element {
  const { words, characters } = textStats(translation)
  const save = combinedSaveLabel(statuses)
  const pending = usePendingCount(workId, chapterId)

  return (
    <footer
      aria-label="Trạng thái chương"
      className="flex h-6 shrink-0 items-center justify-end gap-1 border-t border-line bg-sidebar px-2 text-ui-xs text-ink-muted tabular-nums"
    >
      {pending > 0 && (
        <button
          type="button"
          onClick={onOpenProposals}
          className="cursor-pointer rounded-item px-1 py-0.5 text-warning outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-focus/40"
        >
          {pending.toLocaleString('vi')} đề xuất chờ duyệt
        </button>
      )}
      <span className="px-1 py-0.5">
        Bản dịch: {words.toLocaleString('vi')} chữ · {characters.toLocaleString('vi')} ký tự
      </span>
      <span role="status" className="flex items-center gap-1.5 px-1 py-0.5">
        <span
          aria-hidden="true"
          className={cx('size-1.5 rounded-full', save.safe ? 'bg-success' : 'bg-warning')}
        />
        {save.label}
      </span>
    </footer>
  )
}
