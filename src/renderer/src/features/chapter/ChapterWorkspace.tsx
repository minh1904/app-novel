import { useCallback, useContext, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import { MaximizeSquareIcon } from '@solar-icons/react/linear/maximize-square'
import { LockKeyholeMinimalisticIcon } from '@solar-icons/react/linear/lock-keyhole-minimalistic'
import { LockKeyholeMinimalisticUnlockedIcon } from '@solar-icons/react/linear/lock-keyhole-minimalistic-unlocked'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { MinimizeSquareIcon } from '@solar-icons/react/linear/minimize-square'
import { LinkMinimalistic2Icon } from '@solar-icons/react/linear/link-minimalistic-2'
import { SidebarCloseIcon } from '@solar-icons/react/linear/sidebar-close'
import { SidebarOpenIcon } from '@solar-icons/react/linear/sidebar-open'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { UploadMinimalisticIcon } from '@solar-icons/react/linear/upload-minimalistic'
import { splitParagraphs } from '../../../../shared/text/paragraphSpans'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type { TextRecord } from '../../../../shared/contracts/text'
import { TopBarActions, TopBarTitle } from '../../app/TopBarActions'
import { WorkTabActiveContext } from '../../app/topBarSlot'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { Button, LinkButton } from '../../components/ui/Button'
import { CompactButton } from '../../components/ui/CompactButton'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/ui/DropdownMenu'
import { TabsList, TabsRoot, TabsTab } from '../../components/ui/Tabs'
import type { SessionStatus, TextStore } from '../editor/editorSession'
import { insertImageEmbed } from '../editor/imageEmbed'
import type { ImageStore } from '../editor/imageEmbedDecorations'
import { useConfirmLeave, useRegisterLeaveGuard } from '../editor/leaveGuard'
import type { TargetRange } from '../editor/chatRange'
import type { ParagraphAnchor } from '../editor/paragraphLink'
import { TextEditor, type TextEditorHandle } from '../editor/TextEditor'
import { ExportDialog } from '../export/ExportDialog'
import { languages, type Work } from '../library/works'
import { usePaneLayoutStore } from '../../stores/paneLayoutStore'
import { useUiStore } from '../../stores/uiStore'
import { headingTitle } from '../work/chapterList'
import { contextArea } from '../work/workAreas'
import { AiPanel } from './chat/AiPanel'
import type { ChatEditor } from './chat/useAiChat'
import { AiTranslateDialog } from './translate/AiTranslateDialog'
import { ChapterStatusBar } from './ChapterStatusBar'
import { EditorPane } from './EditorPane'
import { PaneDivider } from './PaneDivider'
import { SentenceMode, type SentenceModeHandle } from './SentenceMode'

const IDLE: SessionStatus = { state: 'saved', message: null, dirty: false }

/**
 * Below this width a pane of prose reads badly. Opening the AI panel folds the source away when the
 * two editors would otherwise drop under it, and brings it back when the panel closes.
 */
const MIN_EDITOR_WIDTH = 420

type Side = 'source' | 'target'

const SOURCE_SHORTCUT = 'Ctrl+\\'
const TARGET_SHORTCUT = 'Ctrl+Shift+\\'

/**
 * Tab "Từng câu" bị ẩn khỏi giao diện và sẽ bị gỡ cùng dữ liệu câu (ADR-005, nay chỉ còn trong lịch sử
 * git ở commit 501be2a). Mã của mode còn lại (state,
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

const otherSide = (side: Side): Side => (side === 'source' ? 'target' : 'source')

/**
 * How far the chapter is, in the paragraphs the translator sees (ADR-005). The work, the languages and
 * the character counts are left to the breadcrumb, the pane headers and the status bar.
 */
const paragraphFigures = (source: TextRecord, target: TextRecord): string => {
  const sourceCount = splitParagraphs(source.content).length.toLocaleString('vi')
  if (target.content.trim() === '') return sourceCount + ' đoạn gốc, chưa dịch'
  const targetCount = splitParagraphs(target.content).length.toLocaleString('vi')
  return sourceCount + ' đoạn gốc · ' + targetCount + ' đoạn dịch'
}

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
  const [translation, setTranslation] = useState(target.content)
  const [unlocked, setUnlocked] = useState(false)
  const [mode, setMode] = useState<'full' | 'sentence'>('full')
  const sentence = useRef<SentenceModeHandle>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiWidth, setAiWidth] = useState(420)
  const sourceCollapsed = usePaneLayoutStore((state) => state.sourceCollapsed)
  const sourceRatio = usePaneLayoutStore((state) => state.sourceRatio)
  const syncScroll = usePaneLayoutStore((state) => state.syncScroll)
  // Folded for the AI panel only, so it is not remembered as the translator's own choice.
  const [aiFolded, setAiFolded] = useState(false)
  const sourceHidden = sourceCollapsed || aiFolded
  // The AI panel reads and marks up the translation, so the translation stays open while it is.
  const targetHidden = usePaneLayoutStore((state) => state.targetCollapsed) && !aiOpen
  const panes = useRef<HTMLDivElement>(null)
  const editors = useRef<HTMLDivElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  // Where the caret is in each pane, and which pane was touched last: the AI panel turns these into the
  // user's position (change `agentic-chat`), so "đoạn này" means the paragraph the caret is in.
  const [aiSourceRange, setAiSourceRange] = useState<TargetRange | null>(null)
  const [aiRange, setAiRange] = useState<TargetRange | null>(null)
  const [aiSide, setAiSide] = useState<'source' | 'target'>('target')
  const onSourceCaret = useCallback((range: TargetRange) => {
    setAiSourceRange(range)
    setAiSide('source')
  }, [])
  const onTargetCaret = useCallback((range: TargetRange) => {
    setAiRange(range)
    setAiSide('target')
  }, [])

  /**
   * The pane the translator last scrolled, clicked or typed in. Only that pane drives the other one,
   * so the scroll it causes over there does not bounce back.
   */
  const driver = useRef<Side>('target')
  const caretParagraphs = useRef<Record<Side, number | null>>({ source: null, target: null })
  const editorOf = useCallback(
    (side: Side): TextEditorHandle | null =>
      side === 'source' ? sourceEditor.current : targetEditor.current,
    []
  )

  /** The paragraph the caret is in shows in the other pane; the pane with the caret needs no mark. */
  const showLink = useCallback(
    (side: Side): void => {
      editorOf(side)?.linkParagraph(null)
      editorOf(otherSide(side))?.linkParagraph(caretParagraphs.current[side])
    },
    [editorOf]
  )
  const onSourceParagraph = useCallback(
    (index: number | null) => {
      caretParagraphs.current.source = index
      showLink('source')
    },
    [showLink]
  )
  const onTargetParagraph = useCallback(
    (index: number | null) => {
      caretParagraphs.current.target = index
      showLink('target')
    },
    [showLink]
  )

  const syncOn = useRef(false)
  syncOn.current = syncScroll && !sourceHidden && !targetHidden
  const onSourceScroll = useCallback(
    (anchor: ParagraphAnchor) => {
      if (syncOn.current && driver.current === 'source') editorOf('target')?.scrollToAnchor(anchor)
    },
    [editorOf]
  )
  const onTargetScroll = useCallback(
    (anchor: ParagraphAnchor) => {
      if (syncOn.current && driver.current === 'target') editorOf('source')?.scrollToAnchor(anchor)
    },
    [editorOf]
  )
  /** Handlers for a pane's wrapper: touching the pane in any way makes it the driver. */
  const driveFrom = (side: Side) => {
    const drive = (): void => {
      driver.current = side
    }
    return {
      onPointerDown: drive,
      onWheel: drive,
      onKeyDown: drive,
      onFocus: () => {
        drive()
        showLink(side)
      }
    }
  }

  const toggleSource = useCallback((): void => {
    foldedByHand = true
    const layout = usePaneLayoutStore.getState()
    if (layout.sourceCollapsed || aiFolded) {
      setAiFolded(false)
      layout.setSourceCollapsed(false)
    } else {
      layout.setSourceCollapsed(true)
    }
  }, [aiFolded])

  const toggleTarget = useCallback((): void => {
    foldedByHand = true
    const layout = usePaneLayoutStore.getState()
    layout.setTargetCollapsed(!layout.targetCollapsed)
  }, [])
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Measured when the panel opens or closes, not while it is dragged wider.
  useEffect(() => {
    if (!aiOpen) {
      setAiFolded(false)
      return
    }
    const width = panes.current?.clientWidth ?? 0
    if (width - aiWidth < 2 * MIN_EDITOR_WIDTH) setAiFolded(true)
  }, [aiOpen])

  // Ctrl+\ (Cmd+\) folds the source pane away or brings it back; with Shift, the translation pane.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!tabActive || event.defaultPrevented || mode !== 'full') return
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (event.code !== 'Backslash') return
      if (event.shiftKey && aiOpen) return
      event.preventDefault()
      if (event.shiftKey) toggleTarget()
      else toggleSource()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, tabActive, aiOpen, toggleSource, toggleTarget])

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
      <TopBarTitle onBack={onBackToWork} backLabel={`Về tác phẩm: ${work.title}`} size="sm">
        <Breadcrumb
          items={[
            { label: work.title, onClick: onBackToWork, title: `Về tác phẩm: ${work.title}` },
            { label: headingTitle(chapter) }
          ]}
        />
      </TopBarTitle>

      {/* Ask AI, focus and the chapter menu sit in the window's top bar, in the same row as the
          window buttons. They still belong to this screen: the bar only gives them a place. */}
      <TopBarActions>
        {mode === 'full' && (
          <CompactButton
            aria-pressed={aiOpen}
            aria-label="Hỏi AI (Ctrl+K)"
            title="Hỏi AI (Ctrl+K)"
            onClick={toggleAi}
            icon={<StarsIcon size={16} />}
          />
        )}
        <CompactButton
          aria-pressed={focused}
          aria-label={focusLabel}
          title={focusLabel}
          onClick={onToggleFocus}
          icon={focused ? <MaximizeSquareIcon size={16} /> : <MinimizeSquareIcon size={16} />}
        />
        <MenuRoot>
          <MenuTrigger
            render={
              <CompactButton aria-label="Thêm thao tác chương" icon={<MenuDotsIcon size={16} />} />
            }
          />
          <MenuPopup>
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
              <StarsIcon size={14} className="text-subtle" />
              Dịch bằng AI
            </MenuItem>
            <MenuItem
              onClick={() => {
                // Export reads the stored translation, so typing that has not autosaved yet goes first.
                void (targetEditor.current?.save() ?? Promise.resolve()).finally(() =>
                  setExportOpen(true)
                )
              }}
            >
              <UploadMinimalisticIcon size={14} className="text-subtle" />
              Xuất chương…
            </MenuItem>
            <MenuItem onClick={onBackToWork}>
              <AltArrowLeftIcon size={14} className="text-subtle" />
              Về tác phẩm
            </MenuItem>
          </MenuPopup>
        </MenuRoot>
      </TopBarActions>

      {/* Which chapter, then the mode and the context the translator reads while working. One row, so the panes keep the height. */}
      <div className="flex h-(--mira-header-height) shrink-0 items-center gap-3 border-b border-default bg-surface px-2.5">
        <h2 className="min-w-0 flex-1 truncate text-body-sm font-semibold">
          {headingTitle(chapter)}{' '}
          <span className="font-normal text-subtle">· {paragraphFigures(source, target)}</span>
        </h2>
        {SENTENCE_MODE_ENABLED && (
          <>
            <TabsRoot
              value={mode}
              aria-label="Chế độ soạn thảo"
              onValueChange={(value) => void switchMode(value as 'full' | 'sentence')}
            >
              <TabsList variant="pill">
                <TabsTab variant="pill" value="full">
                  Toàn văn
                </TabsTab>
                <TabsTab variant="pill" value="sentence">
                  Từng câu
                </TabsTab>
              </TabsList>
            </TabsRoot>
            <span className="h-4 w-px shrink-0 bg-line" aria-hidden="true" />
          </>
        )}
        {/* Glossary and addressing live in the work's Ngữ cảnh area; this opens it there. */}
        <LinkButton
          color="neutral"
          className="shrink-0"
          onClick={() => {
            useUiStore.getState().setWorkArea(work.id, contextArea.id)
            onBackToWork()
          }}
        >
          Thuật ngữ · Xưng hô
        </LinkButton>
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
        <div ref={panes} className="flex min-h-0 flex-1">
          {sourceHidden && (
            <FoldedPane
              label="Bản gốc"
              action={'Hiện bản gốc (' + SOURCE_SHORTCUT + ')'}
              side="left"
              onOpen={toggleSource}
            />
          )}
          <div ref={editors} className="flex min-h-0 min-w-0 flex-1">
            <div
              className={sourceHidden ? 'hidden' : 'flex min-h-0 min-w-0'}
              style={{ flex: `${targetHidden ? 1 : sourceRatio} 1 0` }}
              {...driveFrom('source')}
            >
              <EditorPane
                title="Bản gốc"
                subtitle={sourceLanguage.name}
                status={sourceStatus}
                lockLabel={unlocked ? 'Đang sửa' : 'Đã khóa, chỉ đọc'}
                lockIcon={
                  unlocked ? (
                    <LockKeyholeMinimalisticUnlockedIcon
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-warning"
                    />
                  ) : (
                    <LockKeyholeMinimalisticIcon
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-subtle"
                    />
                  )
                }
                actions={
                  <>
                    <CompactButton
                      aria-pressed={syncScroll}
                      aria-label="Cuộn cùng bản dịch"
                      title={
                        syncScroll
                          ? 'Đang cuộn cùng bản dịch theo số đoạn. Bấm để cuộn riêng'
                          : 'Cuộn cùng bản dịch theo số đoạn'
                      }
                      onClick={() => usePaneLayoutStore.getState().setSyncScroll(!syncScroll)}
                      icon={<LinkMinimalistic2Icon size={16} />}
                    />
                    {/* Changing the source is rare and outside the translating work, so both ways
                        to do it wait in this menu instead of sitting on the bar. */}
                    <MenuRoot>
                      <MenuTrigger
                        render={
                          <CompactButton
                            aria-label="Thao tác với bản gốc"
                            icon={<MenuDotsIcon size={16} />}
                          />
                        }
                      />
                      <MenuPopup align="end">
                        <MenuItem onClick={() => setUnlocked((value) => !value)}>
                          {unlocked ? (
                            <LockKeyholeMinimalisticIcon size={14} className="text-subtle" />
                          ) : (
                            <PenNewSquareIcon size={14} className="text-subtle" />
                          )}
                          {unlocked ? 'Khóa lại bản gốc' : 'Sửa bản gốc'}
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            void confirmLeave({ reloadOnDiscard: true }).then((proceed) => {
                              if (proceed) onReplaceSource()
                            })
                          }}
                        >
                          <DocumentAddIcon size={14} className="text-subtle" />
                          Thay bản gốc…
                        </MenuItem>
                      </MenuPopup>
                    </MenuRoot>
                    <CompactButton
                      aria-label={'Thu gọn bản gốc (' + SOURCE_SHORTCUT + ')'}
                      title={'Thu gọn bản gốc (' + SOURCE_SHORTCUT + ')'}
                      onClick={toggleSource}
                      icon={<SidebarCloseIcon size={16} />}
                    />
                  </>
                }
                notice={
                  unlocked ? (
                    <div
                      role="note"
                      className="flex items-start gap-3 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-body-xs leading-normal"
                    >
                      <p className="min-w-0 flex-1">
                        Bạn đang sửa bản gốc. Chỉ nên sửa lỗi chính tả hoặc sót chữ; bản dịch đã có
                        không tự đổi theo.
                      </p>
                      <Button className="shrink-0" onClick={() => setUnlocked(false)}>
                        Khóa lại
                      </Button>
                    </div>
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
                  onTargetChange={onSourceCaret}
                  onParagraphChange={onSourceParagraph}
                  onScroll={onSourceScroll}
                />
              </EditorPane>
            </div>

            {!sourceHidden && !targetHidden && (
              <PaneDivider
                ratio={sourceRatio}
                container={editors}
                onRatioChange={usePaneLayoutStore.getState().setSourceRatio}
              />
            )}

            <div
              className={targetHidden ? 'hidden' : 'flex min-h-0 min-w-0'}
              style={{ flex: `${sourceHidden ? 1 : 1 - sourceRatio} 1 0` }}
              {...driveFrom('target')}
            >
              <EditorPane
                title="Bản dịch"
                subtitle="Tiếng Việt"
                status={targetStatus}
                actions={
                  <CompactButton
                    aria-label={'Thu gọn bản dịch (' + TARGET_SHORTCUT + ')'}
                    title={
                      aiOpen
                        ? 'Hỏi AI đang dùng bản dịch; đóng Hỏi AI để thu gọn'
                        : 'Thu gọn bản dịch (' + TARGET_SHORTCUT + ')'
                    }
                    disabled={aiOpen}
                    onClick={toggleTarget}
                    icon={<SidebarCloseIcon size={16} className="-scale-x-100" />}
                  />
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
                  onTargetChange={onTargetCaret}
                  onTextChange={setTranslation}
                  onParagraphChange={onTargetParagraph}
                  onScroll={onTargetScroll}
                />
              </EditorPane>
            </div>
            {/* Both folded: the space says so and offers both ways back, rather than sitting blank. */}
            {sourceHidden && targetHidden && (
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-subtle px-6 text-center">
                <p className="text-body-sm text-subtle">Bản gốc và bản dịch đang thu gọn.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={toggleSource}>Hiện bản gốc</Button>
                  <Button onClick={toggleTarget}>Hiện bản dịch</Button>
                </div>
              </div>
            )}
            {targetHidden && (
              <FoldedPane
                label="Bản dịch"
                action={'Hiện bản dịch (' + TARGET_SHORTCUT + ')'}
                side="right"
                onOpen={toggleTarget}
              />
            )}
          </div>

          <div
            className={aiOpen ? 'min-h-0 shrink-0 border-l border-default' : 'hidden'}
            style={{ width: aiWidth }}
          >
            {tabActive && (
              <AiPanel
                workId={work.id}
                chapterId={chapter.id}
                chapterLabel={headingTitle(chapter)}
                sourceLang={work.sourceLanguage}
                source={sourceText}
                target={targetChat}
                sourceCaret={
                  aiSourceRange && {
                    from: aiSourceRange.from,
                    to: aiSourceRange.to,
                    selected: aiSourceRange.selected === true
                  }
                }
                targetCaret={
                  aiRange && {
                    from: aiRange.from,
                    to: aiRange.to,
                    selected: aiRange.selected === true
                  }
                }
                activeSide={aiSide}
                width={aiWidth}
                onWidthChange={setAiWidth}
                onClose={() => setAiOpen(false)}
                onOpenSettings={onOpenSettings}
              />
            )}
          </div>
        </div>
      )}

      {mode === 'full' && (
        <ChapterStatusBar
          workId={work.id}
          chapterId={chapter.id}
          translation={translation}
          statuses={[sourceStatus, targetStatus]}
          onOpenProposals={() => {
            if (!aiOpen) toggleAi()
          }}
        />
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
        // The list may be behind the text on screen, so the pane says whether there is a translation.
        chapter={{ ...chapter, hasTarget: translation.trim() !== '' }}
      />
    </div>
  )
}

/**
 * A pane folded to a 32px strip at the edge it sits on: its name written down the strip and one
 * button to bring it back. The text stays mounted behind it, so nothing typed is lost.
 */
/**
 * Set by a fold the person asked for, and read once by the strip that appears: a pane that opens the
 * screen already folded must not take the focus.
 */
let foldedByHand = false

function FoldedPane({
  label,
  action,
  side,
  onOpen
}: {
  label: string
  /** The button's name, with its shortcut. */
  action: string
  side: 'left' | 'right'
  onOpen(): void
}): JSX.Element {
  // Folding hides the pane that held the focus (its fold button, or the editor under Ctrl+), which
  // drops keyboard focus to <body>. When that happened, the strip's open button takes it instead.
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!foldedByHand) return
    foldedByHand = false
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement
      const lost =
        active === null ||
        active === document.body ||
        (active instanceof HTMLElement && !active.checkVisibility())
      if (lost) strip.current?.querySelector<HTMLElement>('button')?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div
      ref={strip}
      className={
        'flex w-8 shrink-0 flex-col items-center gap-2 border-default bg-surface py-3 ' +
        (side === 'left' ? 'border-r' : 'border-l')
      }
    >
      <CompactButton
        aria-label={action}
        title={action}
        onClick={onOpen}
        icon={
          <SidebarOpenIcon size={16} className={side === 'right' ? '-scale-x-100' : undefined} />
        }
      />
      <span
        aria-hidden="true"
        className="text-body-xs font-semibold text-subtle [writing-mode:vertical-rl]"
      >
        {label}
      </span>
    </div>
  )
}
