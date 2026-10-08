import { syntaxTree } from '@codemirror/language'
import type { Extension, Range, Text } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import {
  markdownSupport,
  scanMarkdown,
  type DocRange,
  type InlineKind,
  type SyntaxTree
} from './markdownSyntax'
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
 * delimiter has already been typed — the Markdown parser only reports a span once it is closed) and
 * that the caret has *left*. While composing inside the span — which is the entire window an input
 * method can be mid-composition — the span is incomplete or the caret is still in it, so nothing
 * hides; during an active composition the whole plugin skips rebuilding regardless
 * (`update.view.composing`), same as every other decoration here. Headings, quotes and lists are left
 * as plain dimmed markers rather than given the same hide treatment, matching `source-editor` D7's
 * general caution: narrower exposure, easier to verify by hand.
 *
 * What counts as emphasis, a heading, a quote or a list comes from the Markdown syntax tree
 * (`markdownSyntax.ts`), not from regular expressions, so code spans, escapes, `snake_case` and URLs
 * are left alone.
 */

/** One decoration to draw, before it is turned into a CodeMirror `Decoration`. */
export type PlanKind = 'marker' | 'hidden' | 'quote' | 'h1' | 'h2' | 'h3' | InlineKind

export interface PlanItem {
  from: number
  to: number
  kind: PlanKind
}

const HEADING_KINDS = { 1: 'h1', 2: 'h2', 3: 'h3' } as const

/**
 * Decides what to draw over `ranges`: which delimiters stay visible (dimmed) and which hide. Pure —
 * `touches` stands in for "does the selection touch this stretch", so the hide/show rule that the
 * IME safety rests on can be tested without an `EditorView`.
 */
export function planLivePreview(
  tree: SyntaxTree,
  doc: Text,
  ranges: readonly DocRange[],
  touches: (from: number, to: number) => boolean
): PlanItem[] {
  const { inline, lines } = scanMarkdown(tree, doc, ranges)
  const plan: PlanItem[] = []

  for (const line of lines) {
    if (line.markFrom < line.markTo)
      plan.push({ from: line.markFrom, to: line.markTo, kind: 'marker' })
    if (line.contentFrom >= line.contentTo) continue
    if (line.kind === 'heading' && line.level) {
      plan.push({ from: line.contentFrom, to: line.contentTo, kind: HEADING_KINDS[line.level] })
    } else if (line.kind === 'quote') {
      plan.push({ from: line.contentFrom, to: line.contentTo, kind: 'quote' })
    }
  }

  for (const span of inline) {
    const delimiter: PlanKind = touches(span.from, span.to) ? 'marker' : 'hidden'
    plan.push({ from: span.from, to: span.innerFrom, kind: delimiter })
    plan.push({ from: span.innerFrom, to: span.innerTo, kind: span.kind })
    plan.push({ from: span.innerTo, to: span.to, kind: delimiter })
  }
  return plan
}

const DECORATIONS: Record<PlanKind, Decoration> = {
  marker: Decoration.mark({ class: 'cm-livepreview-marker' }),
  /** No widget: an empty replace just removes the delimiter from the layout, nothing fills its place. */
  hidden: Decoration.replace({}),
  bold: Decoration.mark({ class: 'cm-livepreview-bold' }),
  italic: Decoration.mark({ class: 'cm-livepreview-italic' }),
  strikethrough: Decoration.mark({ class: 'cm-livepreview-strikethrough' }),
  quote: Decoration.mark({ class: 'cm-livepreview-quote' }),
  h1: Decoration.mark({ class: 'cm-livepreview-h1' }),
  h2: Decoration.mark({ class: 'cm-livepreview-h2' }),
  h3: Decoration.mark({ class: 'cm-livepreview-h3' })
}

function build(view: EditorView): DecorationSet {
  const plan = planLivePreview(
    syntaxTree(view.state),
    view.state.doc,
    view.visibleRanges,
    (from, to) => selectionTouches(view, from, to)
  )
  const ranges: Range<Decoration>[] = []
  for (const item of plan) {
    if (item.from < item.to) ranges.push(DECORATIONS[item.kind].range(item.from, item.to))
  }
  return Decoration.set(ranges, true)
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
      // that alone must also re-show or re-hide its delimiters, not just edits. The parser also works
      // in the background, so a new tree for an unchanged document (a long chapter filling in below
      // the first screen) needs a rebuild as well.
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
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
    borderLeft: '2px solid var(--mira-text-muted)',
    paddingLeft: '8px',
    marginLeft: '2px',
    color: 'var(--mira-text-muted)'
  },
  // Obsidian's heading scale, relative to the 16px text: 1.618 / 1.462 / 1.318 em.
  '.cm-livepreview-h1': {
    fontSize: '1.618em',
    fontWeight: '700',
    lineHeight: '1.2',
    letterSpacing: '-0.015em'
  },
  '.cm-livepreview-h2': { fontSize: '1.462em', fontWeight: '600', lineHeight: '1.2' },
  '.cm-livepreview-h3': { fontSize: '1.318em', fontWeight: '600', lineHeight: '1.3' }
})

export function livePreviewDecorations(): Extension {
  return [markdownSupport(), livePreviewMarks, livePreviewTheme]
}
