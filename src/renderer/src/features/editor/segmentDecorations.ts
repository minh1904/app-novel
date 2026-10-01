import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  GutterMarker,
  ViewPlugin,
  gutter,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import type { Seg } from '../../../../shared/segmentMap'
import { savedField, segmentsField } from './editorState'

/**
 * How segments show in the text. Only the lines on screen are looked at, and nothing is ever
 * inserted into a line (no widgets): an element next to the caret is a known way to disturb an
 * input method, so the segments are marked by a gutter and by background classes on the text.
 */

/** Index of the first segment that starts at or after `offset`, or segs.length. */
export function firstStartingAt(segs: readonly Seg[], offset: number): number {
  let low = 0
  let high = segs.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (segs[mid].from < offset) low = mid + 1
    else high = mid
  }
  return low
}

/** A segment is edited when it is new or its text is not what the store holds for its ID. */
export function isEdited(state: EditorState, seg: Seg): boolean {
  if (seg.id === null) return true
  return state.field(savedField).texts.get(seg.id) !== state.doc.sliceString(seg.from, seg.to)
}

class NumberMarker extends GutterMarker {
  constructor(
    private readonly number: number,
    private readonly edited: boolean
  ) {
    super()
  }

  eq(other: GutterMarker): boolean {
    return (
      other instanceof NumberMarker && other.number === this.number && other.edited === this.edited
    )
  }

  toDOM(): Node {
    const element = document.createElement('span')
    element.textContent = String(this.number)
    if (this.edited) element.className = 'cm-segment-number-edited'
    return element
  }
}

const gutterChanged = (update: ViewUpdate): boolean =>
  update.docChanged ||
  update.startState.field(segmentsField) !== update.state.field(segmentsField) ||
  update.startState.field(savedField) !== update.state.field(savedField)

/**
 * The ordinary line number of every line, in the text's own font and size. A line often holds
 * several sentences, so numbering segments here would skip numbers (3, then 8); the segments show
 * as shading in the text instead. A number is marked when a segment that starts on its line was edited.
 */
const lineNumbers = gutter({
  class: 'cm-segment-gutter',
  lineMarker(view, line) {
    const segs = view.state.field(segmentsField)
    let edited = false
    for (
      let i = firstStartingAt(segs, line.from);
      i < segs.length && segs[i].from <= line.to;
      i++
    ) {
      if (isEdited(view.state, segs[i])) {
        edited = true
        break
      }
    }
    return new NumberMarker(view.state.doc.lineAt(line.from).number, edited)
  },
  lineMarkerChange: gutterChanged,
  initialSpacer: () => new NumberMarker(88888, false)
})

const odd = Decoration.mark({ class: 'cm-segment cm-segment-odd' })
const even = Decoration.mark({ class: 'cm-segment' })
const oddEdited = Decoration.mark({ class: 'cm-segment cm-segment-odd cm-segment-edited' })
const evenEdited = Decoration.mark({ class: 'cm-segment cm-segment-edited' })

function build(view: EditorView): DecorationSet {
  const segs = view.state.field(segmentsField)
  const builder = new RangeSetBuilder<Decoration>()
  let covered = 0
  for (const { from, to } of view.visibleRanges) {
    let index = firstStartingAt(segs, Math.max(from, covered))
    // A segment that begins before the first visible position but runs into it.
    if (index > 0 && segs[index - 1].to > Math.max(from, covered)) index--
    for (; index < segs.length && segs[index].from < to; index++) {
      const seg = segs[index]
      if (seg.from < covered || seg.to <= seg.from) continue
      const edited = isEdited(view.state, seg)
      const mark = index % 2 === 1 ? (edited ? oddEdited : odd) : edited ? evenEdited : even
      builder.add(seg.from, seg.to, mark)
      covered = seg.to
    }
  }
  return builder.finish()
}

const segmentMarks = ViewPlugin.fromClass(
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
      if (update.docChanged || update.viewportChanged || gutterChanged(update)) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

export const segmentTheme = EditorView.baseTheme({
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)'
  },
  '.cm-segment-gutter .cm-gutterElement': {
    padding: '0 8px 0 12px',
    textAlign: 'right'
  },
  '.cm-segment-number-edited': { color: 'var(--status-info)', fontWeight: '600' },
  '.cm-segment': { borderRadius: '3px' },
  '.cm-segment-odd': {
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)'
  },
  '.cm-segment-edited': {
    textDecoration: 'underline dotted',
    textDecorationColor: 'var(--status-info)',
    textUnderlineOffset: '4px'
  }
})

export function segmentDecorations(): Extension {
  return [lineNumbers, segmentMarks, segmentTheme]
}
