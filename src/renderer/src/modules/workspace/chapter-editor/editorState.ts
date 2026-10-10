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
 * The editor state around the shared segment rules: one field holds the segments, every edit moves
 * them through `applyEdits`, and the undo history restores the segment set along with the text.
 */

/** Replaces the whole segment set; what undo, redo, splitting again and a finished save use. */
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

/** What the store holds: the text of each segment by ID, so "edited" means "differs from saved". */
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

/**
 * Undo restores the text but cannot know which segment IDs an edit removed or merged, so every
 * change records the segment set it started from as the effect that undoes it. Redo gets the set
 * the undo started from, the same way.
 */
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
 * The transaction that splits again the lines an edit disturbed, or null when nothing needs it. It
 * changes no text and is not an undo step: undoing the edit before it restores text and segments in
 * one go.
 */
export function resegmentSpec(state: EditorState, lang: SegmentLanguage): TransactionSpec | null {
  const segs = state.field(segmentsField)
  const next = resegment(state.doc.toString(), segs, lang)
  if (next === segs) return null
  return { effects: setSegments.of(next), annotations: Transaction.addToHistory.of(false) }
}
