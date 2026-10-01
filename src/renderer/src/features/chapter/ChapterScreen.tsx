import { useMemo, useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import type { WorkSummary } from '../../../../shared/library'
import type { TextSide } from '../../../../shared/text'
import { Button } from '../../components/Button'
import type { TextStore } from '../editor/editorSession'
import { languages } from '../library/works'
import { headingTitle } from '../work/chapterList'
import { ChapterWorkspace } from './ChapterWorkspace'
import { ImportDialog } from './ImportDialog'
import { useChapterScreen } from './useChapterScreen'

function makeStore(workId: string, chapterId: string, side: TextSide): TextStore {
  return {
    save: (content, expectedRev, segments) =>
      window.mira.text.save(workId, chapterId, side, content, expectedRev, segments),
    get: () => window.mira.text.get(workId, chapterId, side)
  }
}

export interface ChapterScreenProps {
  workId: string
  chapterId: string
  onBackToWork(): void
  /** Called with the work after the chapter changed, so the library list follows. */
  onWorkChanged(summary: WorkSummary): void
  /** True while the sidebar is hidden to give the editor room. */
  focused: boolean
  onToggleFocus(): void
}

/**
 * One chapter. Without a source it offers the two ways to bring one in; with one it is the
 * full-text editor, source and translation side by side. Keyed by chapter in the app, so moving to
 * another chapter always starts clean.
 */
export function ChapterScreen({
  workId,
  chapterId,
  onBackToWork,
  onWorkChanged,
  focused,
  onToggleFocus
}: ChapterScreenProps): JSX.Element {
  const screen = useChapterScreen(workId, chapterId, onWorkChanged)
  const [importing, setImporting] = useState(false)
  const [chosenFile, setChosenFile] = useState<File | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const sourceStore = useMemo(() => makeStore(workId, chapterId, 'source'), [workId, chapterId])
  const targetStore = useMemo(() => makeStore(workId, chapterId, 'target'), [workId, chapterId])

  if (screen.load === 'loading') {
    return (
      <p role="status" className="px-6 pt-8 text-[13px] text-ink-muted">
        Đang mở chương…
      </p>
    )
  }

  if (
    screen.load === 'failed' ||
    !screen.work ||
    !screen.chapter ||
    !screen.source ||
    !screen.target
  ) {
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

  const { work, chapter, source, target } = screen
  const hasSource = source.content !== ''

  function openDialog(file: File | null): void {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
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

  const importDialog = (
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
      finalFocus={opener}
      onSaved={(record) => void screen.applySource(record)}
    />
  )

  if (hasSource) {
    return (
      <>
        <ChapterWorkspace
          work={work}
          chapter={chapter}
          source={source}
          target={target}
          sourceEpoch={screen.epoch}
          sourceStore={sourceStore}
          targetStore={targetStore}
          onSourceSaved={(record) => void screen.noteSaved(record)}
          onTargetSaved={(record) => void screen.noteTargetSaved(record)}
          onBackToWork={onBackToWork}
          onReplaceSource={() => openDialog(null)}
          focused={focused}
          onToggleFocus={onToggleFocus}
        />
        {importDialog}
      </>
    )
  }

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em] break-words">
            {headingTitle(chapter)}
          </h2>
          <p className="text-xs text-ink-muted">
            {work.title} · {languages[work.sourceLanguage].short} → Việt
          </p>
        </div>
        <Button variant="secondary" size="lg" onClick={onBackToWork}>
          <AltArrowLeftIcon size={14} />
          Về tác phẩm
        </Button>
      </header>

      {fileInput}

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

      {importDialog}
    </div>
  )
}
