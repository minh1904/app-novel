import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'

/**
 * A light, Obsidian-style live preview for the translation: headings and bold text are styled
 * while still editable. Only mark decorations (background/size/weight on existing characters), the
 * same kind `segmentDecorations` uses: no widget or replace decoration ever sits next to the caret,
 * because that is a known way to break IME composition (Vietnamese Telex/VNI). So `#` and `**`
 * stay on screen, dimmed, instead of disappearing the way Obsidian hides them.
 */

const HEADING_RE = /^(#{1,3})(\s+)(?=\S)/
const BOLD_RE = /\*\*([^*\n]+)\*\*/g

const marker = Decoration.mark({ class: 'cm-livepreview-marker' })
const bold = Decoration.mark({ class: 'cm-livepreview-bold' })
const headingMarks = {
  1: Decoration.mark({ class: 'cm-livepreview-h1' }),
  2: Decoration.mark({ class: 'cm-livepreview-h2' }),
  3: Decoration.mark({ class: 'cm-livepreview-h3' })
} as const

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
      BOLD_RE.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = BOLD_RE.exec(line.text))) {
        const start = line.from + match.index
        if (start < covered) continue
        const innerFrom = start + 2
        const innerTo = innerFrom + match[1].length
        const end = innerTo + 2
        builder.add(start, innerFrom, marker)
        builder.add(innerFrom, innerTo, bold)
        builder.add(innerTo, end, marker)
        covered = end
      }
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
      if (update.docChanged || update.viewportChanged) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

const livePreviewTheme = EditorView.baseTheme({
  '.cm-livepreview-marker': { opacity: '0.45' },
  '.cm-livepreview-bold': { fontWeight: '700' },
  '.cm-livepreview-h1': { fontSize: '20px', fontWeight: '600', letterSpacing: '-0.02em' },
  '.cm-livepreview-h2': { fontSize: '17px', fontWeight: '600' },
  '.cm-livepreview-h3': { fontSize: '15px', fontWeight: '600' }
})

export function livePreviewDecorations(): Extension {
  return [livePreviewMarks, livePreviewTheme]
}
