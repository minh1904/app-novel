import { useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import type { WorkSummary } from '../../../../shared/library'
import { Button } from '../../components/Button'
import { languages } from '../library/works'
import { headingTitle } from '../work/chapterList'
import { ImportDialog } from './ImportDialog'
import { SegmentList } from './SegmentList'
import { useChapterScreen } from './useChapterScreen'

export interface ChapterScreenProps {
  workId: string
  chapterId: string
  onBackToWork(): void
  /** Called with the work after the chapter changed, so the library list follows. */
  onWorkChanged(summary: WorkSummary): void
}

/**
 * One chapter: its source text by segment, and the way to bring a source in. Keyed by chapter in
 * the app, so moving to another chapter always starts clean. The editor modes will extend this.
 */
export function ChapterScreen({
  workId,
  chapterId,
  onBackToWork,
  onWorkChanged
}: ChapterScreenProps): JSX.Element {
  const screen = useChapterScreen(workId, chapterId, onWorkChanged)
  const [importing, setImporting] = useState(false)
  const [chosenFile, setChosenFile] = useState<File | null>(null)
  const picker = useRef<HTMLInputElement>(null)

  if (screen.load === 'loading') {
    return (
      <p role="status" className="px-6 pt-8 text-[13px] text-ink-muted">
        Đang mở chương…
      </p>
    )
  }

  if (screen.load === 'failed' || !screen.work || !screen.chapter || !screen.source) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-6 pt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.04em]">Không mở được chương</h2>
        <p role="alert" className="text-[13px] leading-[1.6] text-ink-muted">
          {screen.error}
        </p>
        <div className="flex gap-2">
          <Button size="lg" onClick={onBackToWork}>
            <AltArrowLeftIcon size={14} />
            Về tác phẩm
          </Button>
          <Button variant="secondary" size="lg" onClick={() => void screen.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  const { work, chapter, source } = screen
  const hasSource = source.content !== ''

  function openDialog(file: File | null): void {
    setChosenFile(file)
    setImporting(true)
  }

  const fileInput = (
    <input
      ref={picker}
      type="file"
      accept=".txt,.md,.markdown,text/plain,text/markdown"
      className="hidden"
      aria-label="Chọn tệp bản gốc"
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) openDialog(file)
      }}
    />
  )

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em] break-words">
            {headingTitle(chapter)}
          </h2>
          <p className="text-xs text-ink-muted">
            {work.title} · {languages[work.sourceLanguage].short} → Việt
            {hasSource && (
              <>
                {' · '}
                <span className="tabular-nums">
                  {source.segments.length.toLocaleString('vi')} segment ·{' '}
                  {source.content.length.toLocaleString('vi')} ký tự
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasSource && (
            <Button variant="outline" size="lg" onClick={() => openDialog(null)}>
              <DocumentAddIcon size={14} />
              Thay bản gốc
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={onBackToWork}>
            <AltArrowLeftIcon size={14} />
            Về tác phẩm
          </Button>
        </div>
      </header>

      {fileInput}

      {hasSource ? (
        <SegmentList
          content={source.content}
          segments={source.segments}
          lang={work.sourceLanguage}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong px-6 py-14 text-center">
          <DocumentTextIcon size={28} className="text-ink-muted" />
          <p className="text-[14px] font-semibold">Chương này chưa có bản gốc</p>
          <p className="max-w-[460px] text-xs leading-[1.6] text-ink-muted">
            Đưa văn bản gốc của chương vào để Mira chia thành các segment. Bạn sẽ xem lại kết quả
            trước khi lưu.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button size="lg" onClick={() => openDialog(null)}>
              Dán văn bản
            </Button>
            <Button variant="outline" size="lg" onClick={() => picker.current?.click()}>
              Chọn tệp .txt / .md
            </Button>
          </div>
        </div>
      )}

      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        workId={workId}
        chapterId={chapterId}
        sourceLang={work.sourceLanguage}
        baseRev={source.rev}
        replacing={hasSource}
        hasTarget={chapter.hasTarget}
        initialFile={chosenFile}
        onSaved={(record) => void screen.applySource(record)}
      />
    </div>
  )
}
