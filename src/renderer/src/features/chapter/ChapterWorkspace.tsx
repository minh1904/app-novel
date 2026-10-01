import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import type { ChapterItem } from '../../../../shared/chapters'
import type { TextRecord } from '../../../../shared/text'
import { Button } from '../../components/Button'
import { TabsList, TabsRoot, TabsTab } from '../../components/Tabs'
import type { SessionStatus, TextStore } from '../editor/editorSession'
import { useConfirmLeave, useRegisterLeaveGuard } from '../editor/leaveGuard'
import { ReadingView } from '../editor/ReadingView'
import { TextEditor, type TextEditorHandle } from '../editor/TextEditor'
import { languages, type Work } from '../library/works'
import { headingTitle } from '../work/chapterList'
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
  const confirmLeave = useConfirmLeave()

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
    setMode(next)
  }

  function showReading(): void {
    setReadText(targetEditor.current?.getText() ?? '')
    setReading(true)
  }

  const sourceLanguage = languages[work.sourceLanguage]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-6 pt-4 pb-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[20px] leading-[1.25] font-semibold tracking-[-0.04em] break-words">
            {headingTitle(chapter)}
          </h2>
          <p className="text-xs text-ink-muted">
            {work.title} · {sourceLanguage.short} → Việt ·{' '}
            <span className="tabular-nums">
              gốc {figures(source)}
              {target.content !== '' && ' · dịch ' + figures(target)}
            </span>
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <TabsRoot
            value={mode}
            aria-label="Chế độ soạn thảo"
            onValueChange={(value) => void switchMode(value as 'full' | 'sentence')}
          >
            <TabsList>
              <TabsTab value="full">Toàn văn</TabsTab>
              <TabsTab value="sentence">Từng câu</TabsTab>
            </TabsList>
          </TabsRoot>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              void confirmLeave({ reloadOnDiscard: true }).then((proceed) => {
                if (proceed) onReplaceSource()
              })
            }}
          >
            <DocumentAddIcon size={14} />
            Thay bản gốc
          </Button>
          <Button variant="secondary" size="lg" aria-pressed={focused} onClick={onToggleFocus}>
            {focused ? 'Hiện điều hướng' : 'Tập trung'}
          </Button>
          {mode === 'full' && (
            <Button
              size="lg"
              disabled={saving || !dirty}
              onClick={() => void saveAll()}
              title="Lưu (Ctrl+S)"
            >
              Lưu
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={onBackToWork}>
            <AltArrowLeftIcon size={14} />
            Về tác phẩm
          </Button>
        </div>
      </header>

      {mode === 'sentence' ? (
        <div className="min-h-0 flex-1">
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
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
          <EditorPane
            title="Bản gốc"
            subtitle={sourceLanguage.name}
            status={sourceStatus}
            lockLabel={unlocked ? 'Đang sửa' : 'Đã khóa, chỉ đọc'}
            actions={
              <Button variant="outline" onClick={() => setUnlocked((value) => !value)}>
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
              <div role="group" aria-label="Cách xem bản dịch" className="flex items-center gap-1">
                <Button
                  variant={reading ? 'ghost' : 'secondary'}
                  aria-pressed={!reading}
                  onClick={() => setReading(false)}
                >
                  Soạn thảo
                </Button>
                <Button
                  variant={reading ? 'secondary' : 'ghost'}
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
                emptyHint="Chưa có bản dịch. Gõ bản dịch vào đây, hoặc dán bản dịch có sẵn."
                onSaved={onTargetSaved}
                onStatusChange={setTargetStatus}
              />
            </div>
          </EditorPane>
        </div>
      )}
    </div>
  )
}
