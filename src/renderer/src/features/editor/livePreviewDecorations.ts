import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import { selectionTouches } from './selectionTouches'

/**
 * A light, Obsidian-style live preview for the translation. Headings, quotes and lists stay as
 * dimmed-marker mark decorations always (`#`, `>`, list markers never disappear — hiding a list's `-`
 * entirely would leave no sign it is a list at all, and these are block prefixes a line either has or
 * doesn't, not something worth a show/hide transition).
 *
 * Bold, italic and strikethrough delimiters (`**`, `*`, `_`, `~~`) DO hide, the way Obsidian hides
 * them, once the caret and selection are not touching that span — `selectionTouches` below decides
 * per span, the same rule `imageEmbedDecorations` uses for images. This is still IME-safe for the
 * same reason images are: the delimiters only ever hide for a span that is *complete* (the closing
 * delimiter has already been typed) and that the caret has *left*. While composing inside the span —
 * which is the entire window an input method can be mid-composition — the span is incomplete or the
 * caret is still in it, so nothing hides; during an active composition the whole plugin skips
 * rebuilding regardless (`update.view.composing`), same as every other decoration here. Headings,
 * quotes and lists are left as plain dimmed markers rather than given the same hide treatment,
 * matching `source-editor` D7's general caution: narrower exposure, easier to verify by hand.
 */

export const HEADING_RE = /^(#{1,3})(\s+)(?=\S)/
export const QUOTE_RE = /^(>)(\s+)(?=\S)/
export const LIST_RE = /^([-*+]|\d+\.)(\s+)(?=\S)/
/**
 * One pass over bold, strikethrough and italic (star or underscore) together, tried in this order at
 * each position, so `**bold**` is never mistaken for two nested italics and a skipped category never
 * leaves a stale high-water mark for the next one (each line is scanned once, not once per category).
 */
export const INLINE_RE = /\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|\*([^\s*][^*\n]*?)\*|_([^\s_][^_\n]*?)_/g

const marker = Decoration.mark({ class: 'cm-livepreview-marker' })
/** No widget: an empty replace just removes the delimiter from the layout, nothing fills its place. */
const hidden = Decoration.replace({})
const bold = Decoration.mark({ class: 'cm-livepreview-bold' })
const italic = Decoration.mark({ class: 'cm-livepreview-italic' })
const strikethrough = Decoration.mark({ class: 'cm-livepreview-strikethrough' })
const quoteContent = Decoration.mark({ class: 'cm-livepreview-quote' })
const headingMarks = {
  1: Decoration.mark({ class: 'cm-livepreview-h1' }),
  2: Decoration.mark({ class: 'cm-livepreview-h2' }),
  3: Decoration.mark({ class: 'cm-livepreview-h3' })
} as const

/** Which inline mark a match of `INLINE_RE` is, and how long its delimiter is on each side. */
function inlineMarkOf(match: RegExpExecArray): { inner: string; mark: Decoration; delim: number } {
  if (match[1] !== undefined) return { inner: match[1], mark: bold, delim: 2 }
  if (match[2] !== undefined) return { inner: match[2], mark: strikethrough, delim: 2 }
  if (match[3] !== undefined) return { inner: match[3], mark: italic, delim: 1 }
  return { inner: match[4], mark: italic, delim: 1 }
}

function addInline(
  view: EditorView,
  builder: RangeSetBuilder<Decoration>,
  line: { from: number; text: string },
  fromIndex: number,
  covered: number
): number {
  INLINE_RE.lastIndex = fromIndex
  let match: RegExpExecArray | null
  let next = covered
  while ((match = INLINE_RE.exec(line.text))) {
    const start = line.from + match.index
    if (start < next) continue
    const { inner, mark, delim } = inlineMarkOf(match)
    const innerFrom = start + delim
    const innerTo = innerFrom + inner.length
    const end = innerTo + delim
    const delimiter = selectionTouches(view, start, end) ? marker : hidden
    builder.add(start, innerFrom, delimiter)
    builder.add(innerFrom, innerTo, mark)
    builder.add(innerTo, end, delimiter)
    next = end
  }
  return next
}

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let covered = 0
  for (const { from, to } of view.visibleRanges) {
    const firstLine = view.state.doc.lineAt(Math.max(from, covered)).number
    const lastLine = view.state.doc.lineAt(to).number
    for (let number = firstLine; number <= lastLine; number++) {
      const line = view.state.doc.line(number)
      if (line.to <= covered) continue
      const headingMatch = HEADING_RE.exec(line.text)
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3
        const prefixEnd = line.from + headingMatch[0].length
        builder.add(Math.max(line.from, covered), prefixEnd, marker)
        builder.add(prefixEnd, line.to, headingMarks[level])
        covered = line.to
        continue
      }
      const quoteMatch = QUOTE_RE.exec(line.text)
      if (quoteMatch) {
        const prefixEnd = line.from + quoteMatch[0].length
        builder.add(Math.max(line.from, covered), prefixEnd, marker)
        builder.add(prefixEnd, line.to, quoteContent)
        covered = line.to
        continue
      }
      const listMatch = LIST_RE.exec(line.text)
      if (listMatch) {
        const prefixEnd = line.from + listMatch[0].length
        builder.add(Math.max(line.from, covered), prefixEnd, marker)
        covered = line.to
        continue
      }
      covered = addInline(view, builder, line, Math.max(0, covered - line.from), covered)
    }
  }
  return builder.finish()
}

const livePreviewMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = build(view)
    }

    update(update: ViewUpdate): void {
      // While an input method composes, leave the marks where they are (only moved with the text).
      if (update.view.composing || update.view.compositionStarted) {
        this.decorations = this.decorations.map(update.changes)
        return
      }
      // A caret move alone (no text change) can cross a span's boundary — arrow keys, a click — so
      // that alone must also re-show or re-hide its delimiters, not just edits.
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

const livePreviewTheme = EditorView.baseTheme({
  '.cm-livepreview-marker': { opacity: '0.45' },
  '.cm-livepreview-bold': { fontWeight: '700' },
  '.cm-livepreview-italic': { fontStyle: 'italic' },
  '.cm-livepreview-strikethrough': { textDecoration: 'line-through' },
  '.cm-livepreview-quote': {
    borderLeft: '2px solid var(--text-muted)',
    paddingLeft: '8px',
    marginLeft: '2px',
    color: 'var(--text-muted)'
  },
  '.cm-livepreview-h1': { fontSize: '20px', fontWeight: '600', letterSpacing: '-0.02em' },
  '.cm-livepreview-h2': { fontSize: '17px', fontWeight: '600' },
  '.cm-livepreview-h3': { fontSize: '15px', fontWeight: '600' }
})

export function livePreviewDecorations(): Extension {
  return [livePreviewMarks, livePreviewTheme]
}
