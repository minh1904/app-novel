import { useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import type { WorkSummary } from '../../../../shared/contracts/library'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { backupWork, savedMessage } from './backup'
import { EditWorkDialog } from './EditWorkDialog'
import { useWorkDetail } from './useWorkDetail'
import { WorkAreaHost } from './WorkAreaHost'
import { WorkHeader } from './WorkHeader'
import { workAreas } from './workAreas'
import { ExportDialog } from '../export/ExportDialog'

export interface WorkDetailScreenProps {
  workId: string
  areaId?: string
  onAreaChange?(areaId: string): void
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
  areaId: controlledAreaId,
  onAreaChange,
  onBackToLibrary,
  onOpenChapter,
  onWorkChanged
}: WorkDetailScreenProps): JSX.Element {
  const detail = useWorkDetail(workId, onWorkChanged)
  const { work } = detail
  const [localAreaId, setLocalAreaId] = useState(workAreas[0].id)
  const areaId = controlledAreaId ?? localAreaId
  const [editing, setEditing] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [addChapterSignal, setAddChapterSignal] = useState(0)
  const [saved, setSaved] = useState<string | null>(null)

  if (detail.load === 'loading') {
    return (
      <p role="status" className="px-6 pt-8 text-ui-sm text-ink-muted">
        Đang mở tác phẩm…
      </p>
    )
  }

  if (detail.load === 'failed' || !work) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-6 pt-12">
        <h2 className="text-ui-lg font-semibold tracking-heading">Không mở được tác phẩm</h2>
        <p role="alert" className="text-ui-sm leading-normal text-ink-muted">
          {detail.loadError}
        </p>
        <div className="flex gap-2">
          <Button onClick={onBackToLibrary}>
            <AltArrowLeftIcon size={14} />
            Về thư viện
          </Button>
          <Button variant="secondary" onClick={() => void detail.reload()}>
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

  async function backUp(): Promise<void> {
    const outcome = await backupWork(workId)
    if (outcome.kind === 'saved') {
      detail.dismissNotice()
      setSaved(savedMessage(outcome.path))
    } else if (outcome.kind === 'failed') {
      setSaved(null)
      detail.reportNotice('Không sao lưu được: ' + outcome.message)
    }
  }

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5 px-6 py-6">
      {saved && (
        <Banner tone="success" onDismiss={() => setSaved(null)}>
          {saved}
        </Banner>
      )}
      {detail.notice && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-control border border-error/40 bg-error/8 px-3.5 py-2.5 text-ui-xs"
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
          onSetCover: (file) => void detail.setCover(file),
          onBackup: () => void backUp(),
          onExport: () => setExportOpen(true)
        }}
      />

      <WorkAreaHost
        areas={workAreas}
        selectedId={areaId}
        onSelect={(selected) => {
          setLocalAreaId(selected)
          onAreaChange?.(selected)
        }}
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

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        workId={workId}
        workTitle={work.title}
      />
    </div>
  )
}
