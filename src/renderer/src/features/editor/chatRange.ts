import { EditorSelection, Transaction, type EditorState, type TransactionSpec } from '@codemirror/state'
import { segmentsField } from './editorState'

/**
 * Which stretch of the translation an AI turn is about, and how its answer gets in.
 *
 * Pure functions over `EditorState`, so both rules can be tested without a browser — and both are
 * rules worth testing, because each one has a failure mode that costs the user real work: a range
 * that silently means "the whole chapter", and a replacement written over text they typed after
 * asking.
 */

/** `auto` follows the selection or the caret; `chapter` is only ever an explicit request. */
export type TargetScope = 'auto' | 'chapter'

export interface TargetRange {
  from: number
  to: number
  /** The text as it was when the question was sent. Kept verbatim: it is the anchor on apply. */
  text: string
  /** Translation segments overlapping the range, in document order. */
  targetIds: string[]
}

/** The paragraph around `pos`: up and down to a blank line. A blank line is its own empty range. */
function paragraphAt(state: EditorState, pos: number): { from: number; to: number } {
  const line = state.doc.lineAt(pos)
  if (line.text.trim() === '') return { from: line.from, to: line.from }

  let first = line.number
  while (first > 1 && state.doc.line(first - 1).text.trim() !== '') first -= 1
  let last = line.number
  while (last < state.doc.lines && state.doc.line(last + 1).text.trim() !== '') last += 1

  return { from: state.doc.line(first).from, to: state.doc.line(last).to }
}

/**
 * The stretch a turn is about.
 *
 * Three rules, in order: a selection wins; with no selection it is the paragraph holding the caret;
 * the whole chapter happens only when asked for by name. The missing fourth rule is deliberate —
 * defaulting to the whole pane would turn "this line reads stiffly" into a full-chapter rewrite.
 */
export function targetRange(state: EditorState, scope: TargetScope = 'auto'): TargetRange {
  const selection = state.selection.main
  const span =
    scope === 'chapter'
      ? { from: 0, to: state.doc.length }
      : selection.empty
        ? paragraphAt(state, selection.head)
        : { from: selection.from, to: selection.to }

  return {
    from: span.from,
    to: span.to,
    text: state.doc.sliceString(span.from, span.to),
    targetIds: state
      .field(segmentsField)
      // A zero-length range still belongs to the segment it sits inside, so touching counts.
      .filter((seg) => seg.id !== null && seg.from <= span.to && seg.to >= span.from)
      .map((seg) => seg.id as string)
  }
}

export type ApplyResult =
  /** Dispatch this and the replacement is in, as one undoable step. */
  | { kind: 'ready'; spec: TransactionSpec }
  /** The anchored text is gone or ambiguous: say so, write nothing. */
  | { kind: 'stale' }

/** Every offset where `needle` occurs, capped at two — only "exactly one" matters. */
function occurrences(haystack: string, needle: string): number[] {
  const found: number[] = []
  let at = haystack.indexOf(needle)
  while (at !== -1 && found.length < 2) {
    found.push(at)
    at = haystack.indexOf(needle, at + 1)
  }
  return found
}

/**
 * How a proposal gets into the text, and when it must not.
 *
 * Anchored by **content, not position**: the panel never sees the editor's `ChangeSet`, so offsets
 * it captured when the question was sent mean nothing once the user has typed above them. Three
 * tiers, and the last one refuses:
 *
 *   1. The text at `[from, to]` is still what was sent — replace it.
 *   2. It moved but still occurs **exactly once** — replace it there. (Typing above shifted it.)
 *   3. Gone, changed, or now ambiguous — `stale`. Never guess.
 *
 * This is the only place in the chat feature that can destroy the user's writing, so it is the one
 * place that prefers doing nothing over doing something reasonable.
 */
export function applyProposal(
  state: EditorState,
  range: TargetRange,
  replacement: string
): ApplyResult {
  // An empty anchor matches everywhere and therefore nowhere — except in an empty document, where
  // there is nothing it could be confused with and nothing to lose. That is the first translation of
  // a chapter, which is exactly the case this feature exists for.
  if (range.text === '') {
    if (state.doc.length > 0) return { kind: 'stale' }
    return {
      kind: 'ready',
      spec: {
        changes: { from: 0, to: 0, insert: replacement },
        selection: EditorSelection.cursor(replacement.length),
        scrollIntoView: true,
        annotations: Transaction.userEvent.of('input.chat')
      }
    }
  }

  const spec = (from: number, to: number): ApplyResult => ({
    kind: 'ready',
    spec: {
      changes: { from, to, insert: replacement },
      selection: EditorSelection.cursor(from + replacement.length),
      scrollIntoView: true,
      // One transaction, one history entry: a single undo puts the chapter back as it was. Naming
      // the event `input.chat` also keeps it out of the way of CodeMirror's input-grouping.
      annotations: Transaction.userEvent.of('input.chat')
    }
  })

  const within =
    range.from >= 0 && range.to <= state.doc.length
      ? state.doc.sliceString(range.from, range.to)
      : null
  if (within === range.text) return spec(range.from, range.to)

  const found = occurrences(state.doc.toString(), range.text)
  return found.length === 1 ? spec(found[0], found[0] + range.text.length) : { kind: 'stale' }
}
