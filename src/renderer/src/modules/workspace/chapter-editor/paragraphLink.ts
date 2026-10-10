import {
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
  type Text
} from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import {
  paragraphAt,
  splitParagraphs,
  type ParagraphSpan
} from '../../../../../shared/text/paragraphSpans'

/**
 * What ties the source pane to the translation pane: the paragraph number (ADR-005, one non-blank line
 * is one paragraph). Nothing else matches the two texts, so when the translation splits or joins
 * paragraphs the link drifts; that is the price of not aligning rows, and the panes still work on
 * their own.
 */

/** Where a pane is: a paragraph and how far down it the top of the view sits, 0 to 1. */
export interface ParagraphAnchor {
  index: number
  fraction: number
}

// The text is immutable per version, so the spans are worked out once per version, not per scroll.
const spansCache = new WeakMap<Text, ParagraphSpan[]>()

export function paragraphSpans(doc: Text): ParagraphSpan[] {
  let spans = spansCache.get(doc)
  if (!spans) {
    spans = splitParagraphs(doc.toString())
    spansCache.set(doc, spans)
  }
  return spans
}

/** The paragraph the caret sits in, or null on a blank line or in an empty text. */
export function caretParagraph(state: EditorState): number | null {
  const head = state.selection.main.head
  if (state.doc.lineAt(head).text.trim() === '') return null
  const spans = paragraphSpans(state.doc)
  return spans.length === 0 ? null : paragraphAt(spans, head)
}

const setLinked = StateEffect.define<number | null>()
const linkedLine = Decoration.line({ class: 'cm-linked-paragraph' })

const linkedField = StateField.define<{ index: number | null; decorations: DecorationSet }>({
  create: () => ({ index: null, decorations: Decoration.none }),
  update(value, tr) {
    let index = value.index
    for (const effect of tr.effects) if (effect.is(setLinked)) index = effect.value
    if (index === value.index && !tr.docChanged) return value
    const span = index === null ? undefined : paragraphSpans(tr.state.doc)[index]
    const decorations = span
      ? Decoration.set([linkedLine.range(tr.state.doc.lineAt(span.lineStart).from)])
      : Decoration.none
    return { index, decorations }
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations)
})

const linkedTheme = EditorView.baseTheme({
  '.cm-linked-paragraph': { backgroundColor: 'var(--mira-bg-selected)' }
})

/** Marks the paragraph the other pane's caret is in. */
export const paragraphLink = (): Extension => [linkedField, linkedTheme]

export function linkParagraph(view: EditorView, index: number | null): void {
  if (view.state.field(linkedField).index === index) return
  view.dispatch({ effects: setLinked.of(index) })
}

/** Height inside the document, from its top, that sits at the top of the visible pane. */
function viewTop(view: EditorView): number {
  return view.scrollDOM.getBoundingClientRect().top - view.documentTop
}

/** The heights inside the document where paragraph `index` starts and where the next one starts. */
function paragraphBand(view: EditorView, spans: ParagraphSpan[], index: number): [number, number] {
  const top = view.lineBlockAt(spans[index].lineStart).top
  const next = spans[index + 1]
  const bottom = next ? view.lineBlockAt(next.lineStart).top : view.contentHeight
  return [top, Math.max(bottom, top + 1)]
}

export function topAnchor(view: EditorView): ParagraphAnchor | null {
  const spans = paragraphSpans(view.state.doc)
  if (spans.length === 0) return null
  const height = viewTop(view)
  const index = paragraphAt(spans, view.lineBlockAtHeight(Math.max(0, height)).from)
  const [top, bottom] = paragraphBand(view, spans, index)
  const fraction = Math.min(1, Math.max(0, (height - top) / (bottom - top)))
  return { index, fraction }
}

/** Scrolls so the top of the pane sits at `anchor`; past the last paragraph it stops at the end. */
export function scrollToAnchor(view: EditorView, anchor: ParagraphAnchor): void {
  const spans = paragraphSpans(view.state.doc)
  if (spans.length === 0) return
  const index = Math.min(anchor.index, spans.length - 1)
  const fraction = anchor.index > index ? 1 : anchor.fraction
  const [top, bottom] = paragraphBand(view, spans, index)
  const offset = view.scrollDOM.scrollTop - viewTop(view)
  view.scrollDOM.scrollTop = top + fraction * (bottom - top) + offset
}
