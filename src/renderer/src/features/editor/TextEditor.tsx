import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type Ref
} from 'react'
import { historyKeymap, insertNewline, standardKeymap } from '@codemirror/commands'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { SegmentLanguage } from '../../../../shared/segmenter'
import type { TextRecord } from '../../../../shared/text'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { createEditorState } from './editorState'
import {
  EditorSession,
  type SaveOutcome,
  type SessionStatus,
  type TextStore
} from './editorSession'
import { livePreviewDecorations } from './livePreviewDecorations'
import { idleResegment } from './resegmenter'
import { segmentDecorations } from './segmentDecorations'

/**
 * The text of one chapter side in CodeMirror 6, for the source and the translation alike. Plain
 * editing only: no auto-indent or auto-closing, because the text is prose (a full-width space at
 * the start of a line must not be copied onto the next one), and Tab leaves the field instead of
 * inserting a character. The saving, conflicts and the undo history belong to the editor; what
 * surrounds it (title, status line, save button) belongs to the screen.
 */
const theme = EditorView.theme({
  // No border of its own: the pane around it is the box, so the two would read as nested frames.
  '&': {
    height: '100%',
    fontSize: '14px',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    borderRadius: 'var(--radius-control)'
  },
  '&.cm-focused': {
    outline: 'none',
    boxShadow: 'inset 0 0 0 2px color-mix(in srgb, var(--focus-ring) 40%, transparent)'
  },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.7', overflow: 'auto' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--text-primary)' },
  '.cm-line': { padding: '0 16px 0 4px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--surface-selected)'
  }
})

// Enter must add a bare line break; the standard binding would copy the indentation of the line above.
const bindings = [
  { key: 'Enter', run: insertNewline },
  ...standardKeymap.filter((binding) => binding.key !== 'Enter'),
  ...historyKeymap
]

/** Read only keeps the caret, selection, copy and scrolling, and stops typing, pasting and dropping. */
const lockExtension = (readOnly: boolean): Extension => [
  EditorState.readOnly.of(readOnly),
  EditorView.contentAttributes.of({ 'aria-readonly': String(readOnly) })
]

export interface TextEditorHandle {
  /** Saves now, waiting out an input method; used before leaving the screen. */
  save(): Promise<SaveOutcome>
  isDirty(): boolean
  /** Throws the unsaved typing away and shows the stored text again. */
  discard(): Promise<void>
  /** The text as it is now, saved or not. */
  getText(): string
}

export interface TextEditorProps {
  /** The text and segments to open; read once when mounted, so remount (key) to load another. */
  record: TextRecord
  /** BCP 47 tag of the text, so the browser picks the right font and the sentences split right. */
  lang: SegmentLanguage
  /** Accessible name of the text field. */
  label: string
  store: TextStore
  /** Locks the text without rebuilding the editor, so history, caret and unsaved typing stay. */
  readOnly?: boolean
  /** Shown over the empty text; it is not part of the text and goes when the first character does. */
  emptyHint?: string
  /** Styles `#` headings and `**bold**` inline while still editable; read once like `lang`. */
  livePreview?: boolean
  /** A save went through (or the stored text was reloaded): the figures on the screen follow it. */
  onSaved(record: TextRecord): void
  onStatusChange?(status: SessionStatus): void
  handleRef?: Ref<TextEditorHandle>
}

const IDLE: SessionStatus = { state: 'saved', message: null, dirty: false }
const noSubscribe = (): (() => void) => () => {}

export function TextEditor({
  record,
  lang,
  label,
  store,
  readOnly = false,
  emptyHint,
  livePreview = false,
  onSaved,
  onStatusChange,
  handleRef
}: TextEditorProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const [lock] = useState(() => new Compartment())
  const [session, setSession] = useState<EditorSession | null>(null)
  const sessionRef = useRef<EditorSession | null>(null)
  const [confirmReload, setConfirmReload] = useState(false)
  const [empty, setEmpty] = useState(record.content === '')
  const hintId = useId()
  const latest = useRef({ onSaved, onStatusChange, readOnly })
  useEffect(() => {
    latest.current = { onSaved, onStatusChange, readOnly }
  })

  const status = useSyncExternalStore(
    session ? session.subscribe : noSubscribe,
    session ? session.getStatus : () => IDLE
  )

  const save = useCallback(async (): Promise<SaveOutcome> => {
    const current = sessionRef.current
    if (!current) return { kind: 'unchanged' }
    const outcome = await current.save()
    if (outcome.kind === 'saved') latest.current.onSaved(outcome.record)
    return outcome
  }, [])

  useImperativeHandle(
    handleRef,
    () => ({
      save,
      isDirty: () => sessionRef.current?.dirty ?? false,
      discard: async () => {
        const loaded = await sessionRef.current?.reload()
        if (loaded) latest.current.onSaved(loaded)
      },
      getText: () => view.current?.state.doc.toString() ?? ''
    }),
    [save]
  )

  useEffect(() => {
    if (!host.current) return
    const makeState = (opened: TextRecord): EditorState =>
      createEditorState({
        content: opened.content,
        segments: opened.segments,
        extensions: [
          keymap.of(bindings),
          EditorView.lineWrapping,
          EditorState.allowMultipleSelections.of(false),
          EditorView.contentAttributes.of({
            lang,
            'aria-label': label,
            'aria-multiline': 'true',
            ...(emptyHint === undefined ? {} : { 'aria-describedby': hintId }),
            spellcheck: 'false',
            autocorrect: 'off',
            autocapitalize: 'off'
          }),
          lock.of(lockExtension(latest.current.readOnly)),
          EditorView.updateListener.of((update) => {
            sessionRef.current?.onUpdate(update)
            if (update.docChanged) setEmpty(update.state.doc.length === 0)
          }),
          segmentDecorations(),
          ...(livePreview ? [livePreviewDecorations()] : []),
          idleResegment(lang, 800, () => sessionRef.current?.saving ?? false),
          theme
        ]
      })

    const editor = new EditorView({ parent: host.current, state: makeState(record) })
    view.current = editor
    const created = new EditorSession(editor, store, lang, makeState, record)
    sessionRef.current = created
    setSession(created)
    return () => {
      sessionRef.current = null
      view.current = null
      editor.destroy()
    }
    // The text is read once; the screen remounts this component (key) to load another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    view.current?.dispatch({ effects: lock.reconfigure(lockExtension(readOnly)) })
  }, [readOnly, lock])

  useEffect(() => {
    latest.current.onStatusChange?.(status)
  }, [status])

  async function reload(): Promise<void> {
    setConfirmReload(false)
    const loaded = await sessionRef.current?.reload()
    if (loaded) latest.current.onSaved(loaded)
  }

  function copyMine(): void {
    const text = view.current?.state.doc.toString() ?? ''
    void navigator.clipboard.writeText(text)
  }

  const showHint = empty && emptyHint !== undefined

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      {status.state === 'conflict' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs leading-[1.55]"
        >
          <strong className="font-semibold">Văn bản đã đổi ở nơi khác.</strong>
          <span>{status.message}</span>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={copyMine}>
              Sao chép văn bản của tôi
            </Button>
            <Button variant="outline" onClick={() => setConfirmReload(true)}>
              Tải lại bản đã lưu
            </Button>
          </div>
        </div>
      )}
      {status.state === 'error' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border border-error/40 bg-error/10 px-3 py-2.5 text-xs leading-[1.55]"
        >
          <span>{status.message}</span>
          <div>
            <Button variant="outline" onClick={() => void save()}>
              Thử lại
            </Button>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={host} className="h-full min-w-0" />
        {showHint && (
          <p
            id={hintId}
            className="pointer-events-none absolute top-3 right-4 left-[52px] text-[14px] leading-[1.7] text-ink-muted"
          >
            {emptyHint}
          </p>
        )}
      </div>

      <Dialog
        open={confirmReload}
        onOpenChange={setConfirmReload}
        title="Tải lại bản đã lưu?"
        description="Những chỗ bạn đã sửa mà chưa lưu sẽ bị bỏ. Bạn có thể bấm “Sao chép văn bản của tôi” trước để giữ lại."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReload(false)}>
            Hủy
          </Button>
          <Button onClick={() => void reload()}>
            Tải lại bản đã lưu
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
