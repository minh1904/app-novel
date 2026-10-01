import { useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import type { WorkSummary } from '../../../../shared/library'
import { Button } from '../../components/Button'
import { EditWorkDialog } from './EditWorkDialog'
import { useWorkDetail } from './useWorkDetail'
import { WorkAreaHost } from './WorkAreaHost'
import { WorkHeader } from './WorkHeader'
import { workAreas } from './workAreas'

export interface WorkDetailScreenProps {
  workId: string
  onBackToLibrary(): void
  onOpenChapter(workId: string, chapterId: string): void
  /** Every change made on this screen, so the library list and sidebar stay in step. */
  onWorkChanged(summary: WorkSummary): void
}

/**
 * One work: its header, then the areas (today only Chapters). The screen is keyed by work, so
 * moving to another work always starts from a clean state.
 */
export function WorkDetailScreen({
  workId,
  onBackToLibrary,
  onOpenChapter,
  onWorkChanged
}: WorkDetailScreenProps): JSX.Element {
  const detail = useWorkDetail(workId, onWorkChanged)
  const { work } = detail
  const [areaId, setAreaId] = useState(workAreas[0].id)
  const [editing, setEditing] = useState(false)
  const [addChapterSignal, setAddChapterSignal] = useState(0)

  if (detail.load === 'loading') {
    return (
      <p role="status" className="px-6 pt-8 text-[13px] text-ink-muted">
        Đang mở tác phẩm…
      </p>
    )
  }

  if (detail.load === 'failed' || !work) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-6 pt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.04em]">Không mở được tác phẩm</h2>
        <p role="alert" className="text-[13px] leading-[1.6] text-ink-muted">
          {detail.loadError}
        </p>
        <div className="flex gap-2">
          <Button size="lg" onClick={onBackToLibrary}>
            <AltArrowLeftIcon size={14} />
            Về thư viện
          </Button>
          <Button size="lg" variant="secondary" onClick={() => void detail.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  async function continueWork(): Promise<void> {
    const chapter = work?.lastChapter
    if (!chapter) return
    const result = await window.mira.chapters.open(workId, chapter.id)
    if (result.ok) {
      detail.applyWork(result.value.work)
      onOpenChapter(workId, chapter.id)
    } else {
      detail.reportNotice('Không mở được chương: ' + result.error.message)
    }
  }

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-7 px-6 py-8">
      {detail.notice && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-control border border-error/40 bg-error/8 px-3.5 py-2.5 text-xs"
        >
          <span>{detail.notice}</span>
          <Button variant="ghost-muted" size="sm" onClick={detail.dismissNotice}>
            Đóng
          </Button>
        </div>
      )}

      <WorkHeader
        work={work}
        actions={{
          onContinue: () => void continueWork(),
          onAddChapter: () => setAddChapterSignal((signal) => signal + 1),
          onEdit: () => setEditing(true),
          onSetPaused: (paused) => void detail.setPaused(paused),
          onSetArchived: (archived) => void detail.setArchived(archived),
          onSetCover: (file) => void detail.setCover(file)
        }}
      />

      <WorkAreaHost
        areas={workAreas}
        selectedId={areaId}
        onSelect={setAreaId}
        areaProps={{
          workId,
          onWork: detail.applyWork,
          onOpenChapter: (chapterId) => onOpenChapter(workId, chapterId),
          addChapterSignal
        }}
      />

      <EditWorkDialog
        work={work}
        open={editing}
        onClose={() => setEditing(false)}
        onSave={(patch) => detail.update(patch)}
      />
    </div>
  )
}
