import type { ChatLocation } from '../../../../../shared/contracts/aiChat'
import { paragraphAt, splitParagraphs } from '../../../../../shared/text/paragraphSpans'

/**
 * Where the user is, in the numbers the chat tools use (D1 of change `agentic-chat`).
 *
 * A turn no longer carries text. It carries this: the paragraph each caret is in and the paragraphs
 * selected, counted from 1 with the same split the tools count with (`splitParagraphs`), so "đoạn 5" here
 * and "đoạn 5" in `read_chapter` are the same paragraph. Pure, so the counting can be tested without an
 * editor.
 */

/** A caret or selection in one pane, as character offsets into that pane's text. */
export interface PaneCaret {
  from: number
  to: number
  /** A real selection, not the paragraph around a caret. */
  selected: boolean
}

export interface LocationInput {
  sourceText: string
  targetText: string
  source: PaneCaret | null
  target: PaneCaret | null
  /** The pane the user touched last: its selection is the one that counts. */
  active: 'source' | 'target'
}

/** The 1-based paragraph holding `offset`, or `null` for a pane with no paragraph at all. */
function paragraphOf(text: string, offset: number): number | null {
  const spans = splitParagraphs(text)
  if (spans.length === 0) return null
  return paragraphAt(spans, Math.max(0, Math.min(offset, text.length))) + 1
}

export function buildLocation(input: LocationInput): ChatLocation {
  const caret = (text: string, pane: PaneCaret | null): number | null =>
    pane === null ? null : paragraphOf(text, pane.from)
  const pane = input.active === 'source' ? input.source : input.target
  const text = input.active === 'source' ? input.sourceText : input.targetText
  let selection: ChatLocation['selection'] = null
  if (pane !== null && pane.selected && pane.to > pane.from) {
    const from = paragraphOf(text, pane.from)
    // The character just before the end: a selection that stops at the start of a line is not in it.
    const to = paragraphOf(text, pane.to - 1)
    if (from !== null && to !== null)
      selection = { side: input.active, from, to: Math.max(from, to) }
  }
  return {
    caret: {
      source: caret(input.sourceText, input.source),
      target: caret(input.targetText, input.target)
    },
    selection
  }
}

const sideName = (side: 'source' | 'target'): string => (side === 'source' ? 'bản gốc' : 'bản dịch')

/** The panel header's words for a location: what "đoạn này" means right now. */
export function locationLabel(location: ChatLocation): string {
  const { selection, caret } = location
  if (selection !== null) {
    return selection.from === selection.to
      ? `đang chọn đoạn ${selection.from} ${sideName(selection.side)}`
      : `đang chọn đoạn ${selection.from}–${selection.to} ${sideName(selection.side)}`
  }
  if (caret.target !== null) return `đoạn ${caret.target} bản dịch`
  if (caret.source !== null) return `đoạn ${caret.source} bản gốc`
  return 'chưa đặt con trỏ'
}
