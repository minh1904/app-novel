import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import type { Seg } from '../../../../shared/segmentation/segmentMap'
import { savedField, segmentsField } from './editorState'

/**
 * How segments show in the text. Only the lines on screen are looked at, and nothing is ever
 * inserted into a line (no widgets): an element next to the caret is a known way to disturb an
 * input method, so segments are marked by background classes on the text only — no line-number
 * gutter, to keep the pane for prose rather than code.
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

/** Whether a change could have moved segment boundaries or edited-state, not just scrolled. */
const segmentsChanged = (update: ViewUpdate): boolean =>
  update.docChanged ||
  update.startState.field(segmentsField) !== update.state.field(segmentsField) ||
  update.startState.field(savedField) !== update.state.field(savedField)

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
      if (update.docChanged || update.viewportChanged || segmentsChanged(update)) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

export const segmentTheme = EditorView.baseTheme({
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
  return [segmentMarks, segmentTheme]
}
