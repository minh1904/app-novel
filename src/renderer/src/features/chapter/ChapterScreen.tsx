import { useMemo, useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { ClipboardTextIcon } from '@solar-icons/react/linear/clipboard-text'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import type { WorkSummary } from '../../../../shared/contracts/library'
import type { TextSide } from '../../../../shared/contracts/text'
import { TopBarActions } from '../../app/TopBarActions'
import { Button } from '../../components/ui/Button'
import { CompactButton } from '../../components/ui/CompactButton'
import { cn } from '../../lib/cn'
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
  /** Nơi khai kết nối AI; hộp thoại "Dịch bằng AI" dẫn tới đây khi chưa có kết nối nào. */
  onOpenSettings(): void
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
  onOpenSettings,
  focused,
  onToggleFocus
}: ChapterScreenProps): JSX.Element {
  const screen = useChapterScreen(workId, chapterId, onWorkChanged)
  const [importing, setImporting] = useState(false)
  const [chosenFile, setChosenFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const sourceStore = useMemo(() => makeStore(workId, chapterId, 'source'), [workId, chapterId])
  const targetStore = useMemo(() => makeStore(workId, chapterId, 'target'), [workId, chapterId])

  if (screen.load === 'loading') {
    return (
      <p role="status" className="px-6 pt-8 text-body-sm text-subtle">
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
        <h2 className="text-body-lg font-semibold tracking-heading">Không mở được chương</h2>
        <p role="alert" className="text-body-sm leading-normal text-subtle">
          {screen.error}
        </p>
        <div className="flex gap-2">
          <Button variant="solid" onClick={onBackToWork}>
            <AltArrowLeftIcon size={14} />
            Về tác phẩm
          </Button>
          <Button variant="light" onClick={() => void screen.reload()}>
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
          targetEpoch={screen.targetEpoch}
          sourceStore={sourceStore}
          targetStore={targetStore}
          onSourceSaved={(record) => void screen.noteSaved(record)}
          onTargetSaved={(record) => void screen.noteTargetSaved(record)}
          onBackToWork={onBackToWork}
          onReplaceSource={() => openDialog(null)}
          onTargetReplaced={(record) => void screen.applyTarget(record)}
          onOpenSettings={onOpenSettings}
          focused={focused}
          onToggleFocus={onToggleFocus}
        />
        {importDialog}
      </>
    )
  }

  /** Keeps the chapter inside the same frame as a chapter that has a source, so only the middle changes. */
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Same place as the chapter's own controls once it has text: the window's top bar. */}
      <TopBarActions>
        <CompactButton
          aria-label="Về tác phẩm"
          title="Về tác phẩm"
          onClick={onBackToWork}
          icon={<AltArrowLeftIcon size={16} />}
        />
      </TopBarActions>
      <header className="flex h-[36px] shrink-0 items-center gap-2 border-b border-default bg-surface px-2.5">
        <h2 className="min-w-0 truncate text-body-sm font-semibold">
          {headingTitle(chapter)}{' '}
          <span className="font-normal text-subtle">
            · {work.title} · {languages[work.sourceLanguage].short} → Việt
          </span>
        </h2>
      </header>

      {fileInput}

      {/* Two ways in, side by side: each says what it is for, so the first time is not a guess. */}
      <div className="@container flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="text-center">
          <p className="text-body-sm font-semibold">Chương này chưa có bản gốc</p>
          <p className="mt-1 max-w-[520px] text-body-xs leading-normal text-subtle">
            Đưa văn bản gốc vào để Mira chia thành các segment. Bạn xem lại kết quả trước khi lưu.
          </p>
        </div>
        <div className="grid w-full max-w-[640px] gap-3 @min-[560px]:grid-cols-2">
          <section className="flex flex-col items-start gap-2 rounded-lg border border-default bg-subtle p-3.5">
            <ClipboardTextIcon size={18} className="text-subtle" />
            <h3 className="text-body-sm font-semibold">Dán văn bản</h3>
            <p className="text-body-xs leading-normal text-subtle">
              Chép từ web hoặc tài liệu rồi dán thẳng vào. Hợp khi bạn lấy raw từng chương một.
            </p>
            <Button variant="solid" className="mt-1" onClick={() => openDialog(null)}>
              Dán văn bản
            </Button>
          </section>
          <section
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border border-dashed p-3.5 transition-colors',
              dragging ? 'border-focus bg-muted' : 'border-strong bg-muted/40'
            )}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files[0]
              if (file) openDialog(file)
            }}
          >
            <DocumentAddIcon size={18} className="text-subtle" />
            <h3 className="text-body-sm font-semibold">Chọn hoặc kéo tệp vào</h3>
            <p className="text-body-xs leading-normal text-subtle">
              .txt hoặc .md, tối đa 8 MB. Mira tự nhận bảng mã (UTF-8, GB18030, Big5, Shift_JIS…).
            </p>
            <Button className="mt-1" onClick={() => picker.current?.click()}>
              Chọn tệp…
            </Button>
          </section>
        </div>
      </div>

      {importDialog}
    </div>
  )
}
