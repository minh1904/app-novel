import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import type { Seg } from '../../../../../shared/segmentation/segmentMap'
import { savedField, segmentsField } from './editorState'

/**
 * Hiển thị các segment trong văn bản thông qua lớp đánh dấu nền khi di chuột.
 */

/** Chỉ số của segment đầu tiên bắt đầu tại hoặc sau vị trí `offset`. */
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

/** Segment được xem là đã sửa nếu là segment mới hoặc nội dung khác với bản lưu. */
export function isEdited(state: EditorState, seg: Seg): boolean {
  if (seg.id === null) return true
  return state.field(savedField).texts.get(seg.id) !== state.doc.sliceString(seg.from, seg.to)
}

/** Kiểm tra xem thay đổi có ảnh hưởng đến ranh giới hoặc trạng thái đã sửa của segment hay không. */
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
    // Segment bắt đầu trước khoảng hiển thị nhưng kéo dài vào trong khoảng
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
      // Khi bộ gõ IME đang soạn thảo, giữ nguyên vị trí đánh dấu và chỉ dịch chuyển theo văn bản
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
  '.cm-segment:hover': {
    backgroundColor: 'color-mix(in srgb, var(--mira-text) 6%, transparent)'
  },
  '.cm-segment-edited': {
    textDecoration: 'underline dotted',
    textDecorationColor: 'var(--mira-info)',
    textUnderlineOffset: '4px'
  }
})

export function segmentDecorations(): Extension {
  return [segmentMarks, segmentTheme]
}
