import { history, invertedEffects } from '@codemirror/commands'
import {
  EditorState,
  StateEffect,
  StateField,
  Transaction,
  type Extension,
  type TransactionSpec
} from '@codemirror/state'
import {
  applyEdits,
  resegment,
  segFromRecord,
  type Edit,
  type Seg
} from '../../../../../shared/segmentation/segmentMap'
import type { SegmentLanguage } from '../../../../../shared/segmentation/segmenter'
import type { SegmentRecord } from '../../../../../shared/contracts/text'

/**
 * Trạng thái CodeMirror quản lý các segment văn bản: lưu trữ danh sách segment,
 * cập nhật vị trí khi chỉnh sửa và khôi phục khi hoàn tác.
 */

/** Thay thế toàn bộ danh sách segment: dùng cho undo, redo, tách lại hoặc sau khi lưu. */
export const setSegments = StateEffect.define<Seg[]>()

export const segmentsField = StateField.define<Seg[]>({
  create: () => [],
  update(segs, tr) {
    let explicit: Seg[] | null = null
    for (const effect of tr.effects) if (effect.is(setSegments)) explicit = effect.value
    if (explicit !== null) return explicit
    if (!tr.docChanged) return segs
    const edits: Edit[] = []
    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      edits.push({ from: fromA, to: toA, insert: inserted.toString() })
    })
    return applyEdits(segs, edits)
  }
})

/** Lưu trữ văn bản của từng segment theo ID tại thời điểm lưu gần nhất để kiểm tra trạng thái sửa đổi. */
export interface SavedSegments {
  texts: ReadonlyMap<string, string>
}

export const setSaved = StateEffect.define<SavedSegments>()

export const savedField = StateField.define<SavedSegments>({
  create: () => ({ texts: new Map() }),
  update(saved, tr) {
    for (const effect of tr.effects) if (effect.is(setSaved)) return effect.value
    return saved
  }
})

export function savedTextsOf(content: string, segments: SegmentRecord[]): SavedSegments {
  return { texts: new Map(segments.map((seg) => [seg.id, content.slice(seg.start, seg.end)])) }
}

/** Khôi phục lại trạng thái danh sách segment khi người dùng hoàn tác (undo/redo). */
const restoreSegmentsOnUndo = invertedEffects.of((tr) =>
  tr.docChanged || tr.effects.some((effect) => effect.is(setSegments))
    ? [setSegments.of(tr.startState.field(segmentsField))]
    : []
)

export function editorExtensions(): Extension {
  return [history(), segmentsField, savedField, restoreSegmentsOnUndo]
}

export function createEditorState(options: {
  content: string
  segments: SegmentRecord[]
  extensions: Extension
}): EditorState {
  const { content, segments, extensions } = options
  return EditorState.create({
    doc: content,
    extensions: [
      editorExtensions(),
      segmentsField.init(() => segments.map(segFromRecord)),
      savedField.init(() => savedTextsOf(content, segments)),
      extensions
    ]
  })
}

/**
 * Tạo transaction để tách lại các segment bị thay đổi, hoặc null nếu không có thay đổi.
 * Không thêm bước này vào lịch sử hoàn tác (addToHistory = false).
 */
export function resegmentSpec(state: EditorState, lang: SegmentLanguage): TransactionSpec | null {
  const segs = state.field(segmentsField)
  const next = resegment(state.doc.toString(), segs, lang)
  if (next === segs) return null
  return { effects: setSegments.of(next), annotations: Transaction.addToHistory.of(false) }
}
