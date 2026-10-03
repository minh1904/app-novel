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
import type { SegmentLanguage } from '../../../../shared/algorithms/segmenter'
import type { TextRecord } from '../../../../shared/contracts/text'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { applyProposal, targetRange, type TargetRange, type TargetScope } from './chatRange'
import { ReviewMode, reviewFinished } from './chatReview'
import { createEditorState } from './editorState'
import {
  EditorSession,
  type SaveOutcome,
  type SessionStatus,
  type TextStore
} from './editorSession'
import { toggleBold, toggleItalic } from './formatCommands'
import { imageEmbedDecorations, type ImageStore } from './imageEmbedDecorations'
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
  // No border or radius of its own: the pane is square and flush against the one next to it.
  '&': {
    height: '100%',
    fontSize: '14px',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent'
  },
  // No ring on focus: the blinking caret is the focus signal here, same as a code editor's pane
  // (unlike a button or field, where a ring is the only way to tell focus moved there at all).
  '&.cm-focused': { outline: 'none' },
  // Scrolling stays enabled; only the visible track/thumb are suppressed, so the pane keeps its
  // flush edge instead of a bar fighting the border next to it.
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.7',
    overflow: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  '.cm-scroller::-webkit-scrollbar': { display: 'none' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--text-primary)' },
  '.cm-line': { padding: '0 8px' },
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

/** Only attached when `images` is set (the translation pane): paste or drop a file to embed it. */
function imagePasteDrop(images: ImageStore, onResult: (message: string | null) => void): Extension {
  function firstImageFile(list: FileList | null | undefined): File | null {
    if (!list) return null
    for (const file of Array.from(list)) {
      if (file.type.startsWith('image/')) return file
    }
    return null
  }

  function insertAt(view: EditorView, pos: number, file: File): void {
    onResult(null)
    void images.insert(file).then((result) => {
      if (!result.ok) {
        onResult(result.error.message)
        return
      }
      view.dispatch({ changes: { from: pos, to: pos, insert: result.value } })
    })
  }

  return EditorView.domEventHandlers({
    paste(event, view) {
      const file = firstImageFile(event.clipboardData?.files)
      if (!file) return false
      event.preventDefault()
      insertAt(view, view.state.selection.main.from, file)
      return true
    },
    drop(event, view) {
      const file = firstImageFile(event.dataTransfer?.files)
      if (!file) return false
      event.preventDefault()
      const pos =
        view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.from
      insertAt(view, pos, file)
      return true
    }
  })
}

export interface TextEditorHandle {
  /** Saves now, waiting out an input method; used before leaving the screen. */
  save(): Promise<SaveOutcome>
  isDirty(): boolean
  /** Throws the unsaved typing away and shows the stored text again. */
  discard(): Promise<void>
  /** The text as it is now, saved or not. */
  getText(): string
  /** The stretch an AI turn would be about: the selection, else the paragraph at the caret. */
  targetRange(scope?: TargetScope): TargetRange | null
  /**
   * Writes a proposal in as one undoable step, or refuses when the anchored text has changed since
   * it was asked for. Refusing is the point: this is the one path that can overwrite the user's own
   * typing, so it never guesses where the text went.
   */
  applyProposal(range: TargetRange, replacement: string): 'applied' | 'stale'
  /**
   * Puts a proposal into the pane as a **reviewable layer**: the changed stretches are marked in
   * place, each with its own accept and reject control, instead of being written outright.
   *
   * Same staleness rules as `applyProposal` — a proposal whose anchor moved on is refused here too,
   * because showing a diff against text the question was never about is its own kind of wrong.
   */
  reviewProposal(range: TargetRange, replacement: string): 'reviewing' | 'stale'
  /** Drops an unfinished review, leaving whatever the translator has already accepted. */
  endReview(): void
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
  /** When set, this pane accepts pasted/dropped images and shows `![[id]]` embeds as pictures. */
  images?: ImageStore
  /** A save went through (or the stored text was reloaded): the figures on the screen follow it. */
  onSaved(record: TextRecord): void
  onStatusChange?(status: SessionStatus): void
  /** The caret or selection moved: the stretch an AI turn would be about changed with it. */
  onTargetChange?(range: TargetRange): void
  /** Every chunk of a review has been accepted or rejected, so the review is over. */
  onReviewDone?(): void
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
  images,
  onSaved,
  onStatusChange,
  onTargetChange,
  onReviewDone,
  handleRef
}: TextEditorProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const [lock] = useState(() => new Compartment())
  const [session, setSession] = useState<EditorSession | null>(null)
  const sessionRef = useRef<EditorSession | null>(null)
  const [confirmReload, setConfirmReload] = useState(false)
  const [empty, setEmpty] = useState(record.content === '')
  const [imageError, setImageError] = useState<string | null>(null)
  const hintId = useId()
  const [review] = useState(() => new ReviewMode())
  const latest = useRef({ onSaved, onStatusChange, onTargetChange, onReviewDone, readOnly })
  useEffect(() => {
    latest.current = { onSaved, onStatusChange, onTargetChange, onReviewDone, readOnly }
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
      getText: () => view.current?.state.doc.toString() ?? '',
      targetRange: (scope) => {
        const editor = view.current
        return editor ? targetRange(editor.state, scope) : null
      },
      reviewProposal: (range, replacement) => {
        const editor = view.current
        if (!editor) return 'stale'
        const result = applyProposal(editor.state, range, replacement)
        if (result.kind === 'stale') return 'stale'
        // The text as it stands now becomes the thing the proposal is shown against, so it has to be
        // captured before the change lands.
        const original = editor.state.doc.toString()
        editor.dispatch(result.spec)
        editor.dispatch(review.start(original))
        editor.focus()
        return 'reviewing'
      },
      endReview: () => {
        const editor = view.current
        if (editor && review.isActive(editor.state)) editor.dispatch(review.stop())
      },
      applyProposal: (range, replacement) => {
        const editor = view.current
        if (!editor) return 'stale'
        const result = applyProposal(editor.state, range, replacement)
        if (result.kind === 'stale') return 'stale'
        editor.dispatch(result.spec)
        // Focus follows the text: the caret now sits after what was written, and the translator keeps
        // typing from there instead of having to click back into the pane.
        editor.focus()
        return 'applied'
      }
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
          review.extension(),
          EditorView.updateListener.of((update) => {
            sessionRef.current?.onUpdate(update)
            if (update.docChanged) setEmpty(update.state.doc.length === 0)
            // The AI panel has to follow the caret to be about anything at all, and only the editor
            // knows when it moved. Fired on selection as well as text, because moving the caret
            // changes which paragraph a question is about without changing a character.
            if (update.selectionSet || update.docChanged) {
              latest.current.onTargetChange?.(targetRange(update.state))
            }
            // A review ends itself once nothing is left to decide, so the translator never has to
            // dismiss a bar that has no more work in it.
            if (
              update.docChanged &&
              review.isActive(update.state) &&
              reviewFinished(update.state)
            ) {
              update.view.dispatch(review.stop())
              latest.current.onReviewDone?.()
            }
          }),
          segmentDecorations(),
          ...(livePreview
            ? [
                livePreviewDecorations(),
                keymap.of([
                  { key: 'Mod-b', run: toggleBold },
                  { key: 'Mod-i', run: toggleItalic }
                ])
              ]
            : []),
          ...(images ? [imageEmbedDecorations(images), imagePasteDrop(images, setImageError)] : []),
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

      {imageError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-control border border-error/40 bg-error/10 px-3 py-2 text-xs leading-[1.55]"
        >
          <span>{imageError}</span>
          <Button variant="outline" onClick={() => setImageError(null)}>
            Đã hiểu
          </Button>
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
          <Button onClick={() => void reload()}>Tải lại bản đã lưu</Button>
        </div>
      </Dialog>
    </div>
  )
}
