import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import { MaximizeSquareIcon } from '@solar-icons/react/linear/maximize-square'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import { MinimizeSquareIcon } from '@solar-icons/react/linear/minimize-square'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import type { ChapterItem } from '../../../../shared/chapters'
import type { TextRecord } from '../../../../shared/text'
import { Button } from '../../components/Button'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import { TabsList, TabsRoot, TabsTab } from '../../components/Tabs'
import type { SessionStatus, TextStore } from '../editor/editorSession'
import { insertImageEmbed } from '../editor/imageEmbed'
import type { ImageStore } from '../editor/imageEmbedDecorations'
import { useConfirmLeave, useRegisterLeaveGuard } from '../editor/leaveGuard'
import { ReadingView } from '../editor/ReadingView'
import { TextEditor, type TextEditorHandle } from '../editor/TextEditor'
import { languages, type Work } from '../library/works'
import { headingTitle } from '../work/chapterList'
import { SOON_LABEL } from '../work/mockFeatures'
import { AiPanel } from './AiPanel'
import { EditorPane } from './EditorPane'
import { SentenceMode, type SentenceModeHandle } from './SentenceMode'

const IDLE: SessionStatus = { state: 'saved', message: null, dirty: false }

export interface ChapterWorkspaceProps {
  work: Work
  chapter: ChapterItem
  source: TextRecord
  target: TextRecord
  /** Changes when the source was replaced from outside, which is when the source editor reopens. */
  sourceEpoch: number
  sourceStore: TextStore
  targetStore: TextStore
  onSourceSaved(record: TextRecord): void
  onTargetSaved(record: TextRecord): void
  onBackToWork(): void
  onReplaceSource(): void
  /** True while the sidebar is hidden to give the panes room. */
  focused: boolean
  onToggleFocus(): void
}

const figures = (record: TextRecord): string =>
  record.segments.length.toLocaleString('vi') +
  ' segment · ' +
  record.content.length.toLocaleString('vi') +
  ' ký tự'

/**
 * The full-text mode of a chapter: the source on the left, the translation on the right, each one
 * its own long text that scrolls on its own. Nothing ties the two together (no numbers, no lines,
 * no matching of rows), because they differ in length and in how they are cut.
 */
export function ChapterWorkspace({
  work,
  chapter,
  source,
  target,
  sourceEpoch,
  sourceStore,
  targetStore,
  onSourceSaved,
  onTargetSaved,
  onBackToWork,
  onReplaceSource,
  focused,
  onToggleFocus
}: ChapterWorkspaceProps): JSX.Element {
  const sourceEditor = useRef<TextEditorHandle>(null)
  const targetEditor = useRef<TextEditorHandle>(null)
  const [sourceStatus, setSourceStatus] = useState<SessionStatus>(IDLE)
  const [targetStatus, setTargetStatus] = useState<SessionStatus>(IDLE)
  const [unlocked, setUnlocked] = useState(false)
  const [reading, setReading] = useState(false)
  const [mode, setMode] = useState<'full' | 'sentence'>('full')
  const sentence = useRef<SentenceModeHandle>(null)
  const [readText, setReadText] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const confirmLeave = useConfirmLeave()
  const [imageStore] = useState<ImageStore>(() => ({
    insert: (file) => insertImageEmbed(work.id, file),
    get: (imageId) => window.mira.images.get(work.id, imageId)
  }))

  const handles = (): TextEditorHandle[] =>
    [sourceEditor.current, targetEditor.current].filter(
      (handle): handle is TextEditorHandle => handle !== null
    )

  /** Saves every side that has something unsaved; true when none of them failed. */
  const saveAll = useCallback(async (): Promise<boolean> => {
    const outcomes = await Promise.all(
      [sourceEditor.current, targetEditor.current].map(async (handle) =>
        handle?.isDirty() ? handle.save() : { kind: 'unchanged' as const }
      )
    )
    return outcomes.every((outcome) => outcome.kind !== 'failed')
  }, [])

  const dirty = sourceStatus.dirty || targetStatus.dirty
  const saving = sourceStatus.state === 'saving' || targetStatus.state === 'saving'

  /** Saves whatever the current mode holds unsaved: the two texts, or the cells of the rows. */
  const saveCurrent = useCallback(
    (): Promise<boolean> =>
      mode === 'sentence' ? (sentence.current?.commitAll() ?? Promise.resolve(true)) : saveAll(),
    [mode, saveAll]
  )

  // Ctrl+S (Cmd+S) saves from anywhere on the screen.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== 's' || event.altKey || event.shiftKey) return
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      void saveCurrent()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveCurrent])

  // Ctrl+K (Cmd+K) opens "Hỏi AI" in Toàn văn; Esc closes it. Illustration only, see AiPanel.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && mode === 'full') {
        event.preventDefault()
        setAiOpen((open) => !open)
      } else if (event.key === 'Escape' && aiOpen) {
        setAiOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, aiOpen])

  useRegisterLeaveGuard({
    isDirty: () =>
      mode === 'sentence'
        ? (sentence.current?.hasDrafts() ?? false)
        : handles().some((handle) => handle.isDirty()),
    save: saveCurrent,
    discard: async () => {
      if (mode === 'sentence') await sentence.current?.discard()
      else await Promise.all(handles().map((handle) => handle.discard()))
    }
  })

  /**
   * The two modes do not share unsaved typing, so changing mode first settles what the current one
   * holds: ask when the texts are unsaved, write the cells when leaving the rows. The other mode
   * then opens on what the store has.
   */
  async function switchMode(next: 'full' | 'sentence'): Promise<void> {
    if (next === mode) return
    if (next === 'sentence') {
      if (!(await confirmLeave({ reloadOnDiscard: true }))) return
    } else if (!(await (sentence.current?.commitAll() ?? Promise.resolve(true)))) {
      return
    }
    setUnlocked(false)
    setReading(false)
    setAiOpen(false)
    setMode(next)
  }

  function showReading(): void {
    setReadText(targetEditor.current?.getText() ?? '')
    setReading(true)
  }

  const sourceLanguage = languages[work.sourceLanguage]

  const focusLabel = focused ? 'Hiện điều hướng' : 'Tập trung'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Which chapter, whether it is safe, and the two controls used every few minutes. */}
      <header className="flex h-[42px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
        <h2 className="min-w-0 truncate text-[12.5px] font-semibold">
          {headingTitle(chapter)}{' '}
          <span className="font-normal text-ink-muted">
            · {work.title} · {sourceLanguage.short} → Việt · gốc {figures(source)}
            {target.content !== '' && ' · dịch ' + figures(target)}
          </span>
        </h2>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {mode === 'full' && (
            <Button
              variant="ghost-muted"
              size="icon"
              aria-pressed={aiOpen}
              aria-label="Hỏi AI (Ctrl+K)"
              title="Hỏi AI (Ctrl+K)"
              onClick={() => setAiOpen((open) => !open)}
            >
              <StarsIcon size={15} />
            </Button>
          )}
          <Button
            variant="ghost-muted"
            size="icon"
            aria-pressed={focused}
            aria-label={focusLabel}
            title={focusLabel}
            onClick={onToggleFocus}
          >
            {focused ? <MaximizeSquareIcon size={15} /> : <MinimizeSquareIcon size={15} />}
          </Button>
          {mode === 'full' && (
            <Button disabled={saving || !dirty} onClick={() => void saveAll()} title="Lưu (Ctrl+S)">
              Lưu
            </Button>
          )}
          <MenuRoot>
            <MenuTrigger
              aria-label="Thêm thao tác chương"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-control text-ink-muted outline-none hover:bg-selected hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-selected data-popup-open:text-ink"
            >
              <MenuDotsIcon size={15} />
            </MenuTrigger>
            <MenuPopup>
              <MenuItem
                onClick={() => {
                  void confirmLeave({ reloadOnDiscard: true }).then((proceed) => {
                    if (proceed) onReplaceSource()
                  })
                }}
              >
                <DocumentAddIcon size={14} className="text-ink-muted" />
                Thay bản gốc
              </MenuItem>
              <MenuItem onClick={onBackToWork}>
                <AltArrowLeftIcon size={14} className="text-ink-muted" />
                Về tác phẩm
              </MenuItem>
            </MenuPopup>
          </MenuRoot>
        </div>
      </header>

      {/* The mode, and the context the translator reads while working. One row, so the panes keep the height. */}
      <div className="flex h-[36px] shrink-0 items-center gap-3 border-b border-line px-2.5">
        <TabsRoot
          value={mode}
          aria-label="Chế độ soạn thảo"
          onValueChange={(value) => void switchMode(value as 'full' | 'sentence')}
        >
          <TabsList size="sm">
            <TabsTab size="sm" value="full">
              Toàn văn
            </TabsTab>
            <TabsTab size="sm" value="sentence">
              Từng câu
            </TabsTab>
          </TabsList>
        </TabsRoot>
        <span className="h-4 w-px shrink-0 bg-line" aria-hidden="true" />
        {/* One badge for the group, not one per label: the row has to fit in 36px. */}
        <div
          role="group"
          aria-label={'Ngữ cảnh dịch (' + SOON_LABEL + ')'}
          className="flex min-w-0 items-center gap-2.5 overflow-hidden text-[12px] text-ink-muted"
        >
          {['Thuật ngữ', 'Xưng hô', 'Văn phong'].map((label) => (
            <span key={label} aria-disabled="true" className="whitespace-nowrap">
              {label}
            </span>
          ))}
          <span className="shrink-0 rounded-[5px] bg-selected px-1.5 py-px text-[11px] text-ink">
            {SOON_LABEL}
          </span>
        </div>
      </div>

      {mode === 'sentence' ? (
        <div className="min-h-0 flex-1 p-3">
          <SentenceMode
            handleRef={sentence}
            workId={work.id}
            chapterId={chapter.id}
            source={source}
            target={target}
            sourceLang={work.sourceLanguage}
            onTargetChanged={onTargetSaved}
          />
        </div>
      ) : (
        <div
          className={
            aiOpen
              ? 'grid min-h-0 flex-1 grid-cols-[1fr_1fr_320px] divide-x divide-line'
              : 'grid min-h-0 flex-1 grid-cols-2 divide-x divide-line'
          }
        >
          <EditorPane
            title="Bản gốc"
            subtitle={sourceLanguage.name}
            status={sourceStatus}
            lockLabel={unlocked ? 'Đang sửa' : 'Đã khóa, chỉ đọc'}
            actions={
              <Button variant="outline" size="sm" onClick={() => setUnlocked((value) => !value)}>
                {unlocked ? 'Khóa lại' : 'Sửa bản gốc'}
              </Button>
            }
            notice={
              unlocked ? (
                <p
                  role="note"
                  className="rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-[1.55]"
                >
                  Bạn đang sửa bản gốc. Chỉ nên sửa lỗi chính tả hoặc sót chữ; bản dịch đã có không
                  tự đổi theo.
                </p>
              ) : undefined
            }
          >
            <TextEditor
              key={sourceEpoch}
              handleRef={sourceEditor}
              record={source}
              lang={work.sourceLanguage}
              label="Bản gốc của chương"
              store={sourceStore}
              readOnly={!unlocked}
              onSaved={onSourceSaved}
              onStatusChange={setSourceStatus}
            />
          </EditorPane>

          <EditorPane
            title="Bản dịch"
            subtitle="Tiếng Việt"
            status={targetStatus}
            actions={
              <div
                role="group"
                aria-label="Cách xem bản dịch"
                className="flex items-center gap-[2px] rounded-tab bg-control p-[2px]"
              >
                <Button
                  variant={reading ? 'ghost' : 'secondary'}
                  size="sm"
                  className="rounded-[7px]"
                  aria-pressed={!reading}
                  onClick={() => setReading(false)}
                >
                  Soạn thảo
                </Button>
                <Button
                  variant={reading ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-[7px]"
                  aria-pressed={reading}
                  onClick={showReading}
                >
                  Đọc
                </Button>
              </div>
            }
          >
            {reading && <ReadingView text={readText} lang="vi" label="Bản dịch của chương (đọc)" />}
            <div className={reading ? 'hidden' : 'h-full'}>
              <TextEditor
                handleRef={targetEditor}
                record={target}
                lang="vi"
                label="Bản dịch của chương"
                store={targetStore}
                livePreview
                images={imageStore}
                emptyHint="Chưa có bản dịch. Gõ bản dịch vào đây, hoặc dán bản dịch có sẵn."
                onSaved={onTargetSaved}
                onStatusChange={setTargetStatus}
              />
            </div>
          </EditorPane>

          {aiOpen && (
            <AiPanel
              contextLabel={headingTitle(chapter) + ' · Đoạn văn 2'}
              onClose={() => setAiOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
