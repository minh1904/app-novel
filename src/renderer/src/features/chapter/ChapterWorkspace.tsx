import { useCallback, useContext, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import { MaximizeSquareIcon } from '@solar-icons/react/linear/maximize-square'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import { MinimizeSquareIcon } from '@solar-icons/react/linear/minimize-square'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { UploadMinimalisticIcon } from '@solar-icons/react/linear/upload-minimalistic'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type { TextRecord } from '../../../../shared/contracts/text'
import { TopBarActions } from '../../app/TopBarActions'
import { WorkTabActiveContext } from '../../app/topBarSlot'
import { Button } from '../../components/Button'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import { TabsList, TabsRoot, TabsTab } from '../../components/Tabs'
import type { SessionStatus, TextStore } from '../editor/editorSession'
import { insertImageEmbed } from '../editor/imageEmbed'
import type { ImageStore } from '../editor/imageEmbedDecorations'
import { useConfirmLeave, useRegisterLeaveGuard } from '../editor/leaveGuard'
import type { TargetRange } from '../editor/chatRange'
import { TextEditor, type TextEditorHandle } from '../editor/TextEditor'
import { ExportDialog } from '../export/ExportDialog'
import { languages, type Work } from '../library/works'
import { headingTitle } from '../work/chapterList'
import { SOON_LABEL } from '../work/mockFeatures'
import { AiPanel } from './AiPanel'
import type { ChatEditor } from './useAiChat'
import { AiTranslateDialog } from './AiTranslateDialog'
import { EditorPane } from './EditorPane'
import { SentenceMode, type SentenceModeHandle } from './SentenceMode'

const IDLE: SessionStatus = { state: 'saved', message: null, dirty: false }

/**
 * Tab "Từng câu" bị ẩn khỏi giao diện và sẽ bị gỡ cùng dữ liệu câu (ADR-005,
 * docs/handbook/decisions/0005-ai-first-proposals-no-sentence-mode.md). Mã của mode còn lại (state,
 * switchMode, SentenceMode) chỉ vì đường dịch hiện vẫn ghi theo hàng; nó bị xóa trong change gỡ segment,
 * không bật lại.
 */
const SENTENCE_MODE_ENABLED = false

export interface ChapterWorkspaceProps {
  work: Work
  chapter: ChapterItem
  source: TextRecord
  target: TextRecord
  /** Changes when the source was replaced from outside, which is when the source editor reopens. */
  sourceEpoch: number
  /** Changes when the translation was rewritten from outside (AI dịch chương): the editor reopens. */
  targetEpoch: number
  sourceStore: TextStore
  targetStore: TextStore
  onSourceSaved(record: TextRecord): void
  onTargetSaved(record: TextRecord): void
  onBackToWork(): void
  onReplaceSource(): void
  /** Nhận bản dịch AI vừa ghi, để trình soạn mở lại trên bản mới. */
  onTargetReplaced(record: TextRecord): void
  /** Nơi khai kết nối AI, cho hộp thoại dịch khi chưa có kết nối nào. */
  onOpenSettings(): void
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
  targetEpoch,
  sourceStore,
  targetStore,
  onSourceSaved,
  onTargetSaved,
  onBackToWork,
  onReplaceSource,
  onTargetReplaced,
  onOpenSettings,
  focused,
  onToggleFocus
}: ChapterWorkspaceProps): JSX.Element {
  const tabActive = useContext(WorkTabActiveContext)
  const sourceEditor = useRef<TextEditorHandle>(null)
  const targetEditor = useRef<TextEditorHandle>(null)
  const [sourceStatus, setSourceStatus] = useState<SessionStatus>(IDLE)
  const [targetStatus, setTargetStatus] = useState<SessionStatus>(IDLE)
  const [unlocked, setUnlocked] = useState(false)
  const [mode, setMode] = useState<'full' | 'sentence'>('full')
  const sentence = useRef<SentenceModeHandle>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiWidth, setAiWidth] = useState(420)
  const [exportOpen, setExportOpen] = useState(false)
  // The stretch the AI panel is about, reported by the translation pane as the caret moves. Without
  // it the panel would be about nothing in particular.
  const [aiRange, setAiRange] = useState<TargetRange | null>(null)
  /**
   * The two panes as the AI panel sees them: stable objects whose methods reach into the refs when
   * called.
   *
   * Not `targetEditor.current` passed down directly — reading a ref during render is both a React
   * violation and wrong in practice, because the ref filling in does not cause a re-render, so the
   * panel could hold `null` for the pane that is right there. Reading **live** also matters on its
   * own: the panel sends the text on screen, which is not always the text in storage.
   */
  const sourceText = useMemo(
    () => ({
      getText: (): string => sourceEditor.current?.getText() ?? '',
      isDirty: (): boolean => sourceEditor.current?.isDirty() ?? false
    }),
    []
  )
  const targetChat = useMemo<ChatEditor>(
    () => ({
      getText: () => targetEditor.current?.getText() ?? '',
      isDirty: () => targetEditor.current?.isDirty() ?? false,
      reload: async () => {
        await targetEditor.current?.discard()
      },
      targetRange: (scope) => targetEditor.current?.targetRange(scope) ?? null,
      reviewProposal: (range, replacement, onAccept, onDeny, label) =>
        targetEditor.current?.reviewProposal(range, replacement, onAccept, onDeny, label) ??
        'stale',
      endReview: () => targetEditor.current?.endReview()
    }),
    []
  )
  const [translateOpen, setTranslateOpen] = useState(false)
  const translateOpener = useRef<HTMLElement | null>(null)
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

  // Ctrl+S (Cmd+S) saves from anywhere on the screen. `defaultPrevented` lets a more specific
  // handler (inside an editor, a dialog) claim the key first; neither editor binds Mod-S today, but
  // the check costs nothing and keeps every global shortcut in this file consistent.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!tabActive) return
      if (event.defaultPrevented) return
      if (event.key.toLowerCase() !== 's' || event.altKey || event.shiftKey) return
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      void saveCurrent()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveCurrent, tabActive])

  /**
   * One way in, used by both the button and Ctrl+K.
   *
   * Seeds the range on the way in: the caret may not have moved since the editor opened, so without
   * this the panel would start out about nothing until the translator clicks somewhere.
   */
  const toggleAi = useCallback((): void => {
    setAiOpen((open) => {
      if (!open) setAiRange(targetEditor.current?.targetRange() ?? null)
      return !open
    })
  }, [])

  // Ctrl+K (Cmd+K) opens "Hỏi AI" in Toàn văn; Esc closes it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!tabActive) return
      if (event.defaultPrevented) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && mode === 'full') {
        event.preventDefault()
        toggleAi()
      } else if (event.key === 'Escape' && aiOpen) {
        setAiOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, aiOpen, toggleAi, tabActive])

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
    setAiOpen(false)
    setMode(next)
  }

  const sourceLanguage = languages[work.sourceLanguage]

  const focusLabel = focused ? 'Hiện điều hướng' : 'Tập trung'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Ask AI, focus, save and the chapter menu sit in the window's top bar, in the same row as the
          window buttons. They still belong to this screen: the bar only gives them a place. */}
      <TopBarActions>
        {mode === 'full' && (
          <Button
            variant="ghost-muted"
            size="icon"
            aria-pressed={aiOpen}
            aria-label="Hỏi AI (Ctrl+K)"
            title="Hỏi AI (Ctrl+K)"
            onClick={toggleAi}
          >
            <StarsIcon size={16} />
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
          {focused ? <MaximizeSquareIcon size={16} /> : <MinimizeSquareIcon size={16} />}
        </Button>
        {mode === 'full' && (
          // Quiet while there is nothing to save, solid once there is: in a bar of icons a solid
          // button that does nothing is the loudest thing in it.
          <Button
            variant={dirty ? 'default' : 'secondary'}
            disabled={saving || !dirty}
            onClick={() => void saveAll()}
            title="Lưu (Ctrl+S)"
          >
            Lưu
          </Button>
        )}
        <MenuRoot>
          <MenuTrigger
            aria-label="Thêm thao tác chương"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-control text-ink-muted outline-none hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-selected data-popup-open:text-ink"
          >
            <MenuDotsIcon size={16} />
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
            <MenuItem
              onClick={() => {
                translateOpener.current =
                  document.activeElement instanceof HTMLElement ? document.activeElement : null
                // Bản dịch đang có chữ chưa lưu thì xử lý trước: AI ghi thẳng vào kho.
                void confirmLeave({ reloadOnDiscard: true }).then((proceed) => {
                  if (proceed) setTranslateOpen(true)
                })
              }}
            >
              <StarsIcon size={14} className="text-ink-muted" />
              Dịch bằng AI
            </MenuItem>
            <MenuItem onClick={() => setExportOpen(true)}>
              <UploadMinimalisticIcon size={14} className="text-ink-muted" />
              Xuất chương…
            </MenuItem>
            <MenuItem onClick={onBackToWork}>
              <AltArrowLeftIcon size={14} className="text-ink-muted" />
              Về tác phẩm
            </MenuItem>
          </MenuPopup>
        </MenuRoot>
      </TopBarActions>

      {/* Which chapter, then the mode and the context the translator reads while working. One row, so the panes keep the height. */}
      <div className="flex h-[36px] shrink-0 items-center gap-3 border-b border-line bg-canvas px-2.5">
        <h2 className="min-w-0 flex-1 truncate text-ui-sm font-semibold">
          {headingTitle(chapter)}{' '}
          <span className="font-normal text-ink-muted">
            · {work.title} · {sourceLanguage.short} → Việt · gốc {figures(source)}
            {target.content !== '' && ' · dịch ' + figures(target)}
          </span>
        </h2>
        {SENTENCE_MODE_ENABLED && (
          <>
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
          </>
        )}
        {/* One badge for the group, not one per label: the row has to fit in 36px. */}
        <div
          role="group"
          aria-label={'Ngữ cảnh dịch (' + SOON_LABEL + ')'}
          className="flex min-w-0 items-center gap-2.5 overflow-hidden text-ui-xs text-ink-muted"
        >
          {['Thuật ngữ', 'Xưng hô', 'Văn phong'].map((label) => (
            <span key={label} aria-disabled="true" className="whitespace-nowrap">
              {label}
            </span>
          ))}
          <span className="shrink-0 rounded-item bg-selected px-1.5 py-px text-ui-xs text-ink">
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
              ? 'grid min-h-0 flex-1 divide-x divide-line'
              : 'grid min-h-0 flex-1 grid-cols-2 divide-x divide-line'
          }
          style={
            aiOpen ? { gridTemplateColumns: `minmax(0,1fr) minmax(0,1fr) ${aiWidth}px` } : undefined
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
                  className="rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-ui-xs leading-normal"
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
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                Xuất chương
              </Button>
            }
          >
            <TextEditor
              key={targetEpoch}
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
              onTargetChange={setAiRange}
            />
          </EditorPane>

          <div className={aiOpen ? 'min-h-0' : 'hidden'}>
            {tabActive && (
              <AiPanel
                workId={work.id}
                chapterId={chapter.id}
                chapterLabel={headingTitle(chapter)}
                sourceLang={work.sourceLanguage}
                source={sourceText}
                target={targetChat}
                autoRange={aiRange}
                width={aiWidth}
                onWidthChange={setAiWidth}
                onClose={() => setAiOpen(false)}
                onOpenSettings={onOpenSettings}
              />
            )}
          </div>
        </div>
      )}

      <AiTranslateDialog
        open={translateOpen}
        onOpenChange={setTranslateOpen}
        workId={work.id}
        chapterId={chapter.id}
        onOpenSettings={onOpenSettings}
        onWritten={onTargetReplaced}
        finalFocus={translateOpener}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        workId={work.id}
        workTitle={work.title}
        chapterId={chapter.id}
        chapterTitle={chapter.title}
        chapterNumber={chapter.number}
      />
    </div>
  )
}
