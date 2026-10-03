import { describe, expect, it } from 'vitest'
import { getOriginalDoc, originalDocChangeEffect } from '@codemirror/merge'
import { ChangeSet, type EditorState } from '@codemirror/state'
import { ReviewMode, reviewFinished } from './chatReview'
import { createEditorState } from './editorState'

/**
 * Reviewing a proposal inside the pane.
 *
 * Scope of what is proved here, stated plainly: `reviewFinished` is tested, the accept/reject buttons
 * are **not**. Those need a real `EditorView`, and this repo runs tests in node with no DOM. So the
 * step "accepting a chunk raises the original up to the new text, rejecting puts the new text back"
 * stays an **assumption about `@codemirror/merge`**, taken from its documentation; the tests below
 * simulate both outcomes by hand. Confirming the real buttons belongs to task 10.2, the manual pass —
 * the same gap that `ai-settings-visual-check` already records for the rest of this feature.
 */

const ORIGINAL = ['Đoạn một.', '', 'Đoạn hai.', '', 'Đoạn ba.'].join('\n')
const PROPOSED = ['Đoạn một.', '', 'Đoạn hai đã sửa.', '', 'Đoạn ba.'].join('\n')

function reviewing(doc: string, original: string): { state: EditorState; review: ReviewMode } {
  const review = new ReviewMode()
  const base = createEditorState({ content: doc, segments: [], extensions: review.extension() })
  return { state: base.update(review.start(original)).state, review }
}

describe('ReviewMode', () => {
  it('is off until a review starts', () => {
    const review = new ReviewMode()
    const state = createEditorState({
      content: ORIGINAL,
      segments: [],
      extensions: review.extension()
    })
    expect(review.isActive(state)).toBe(false)
  })

  it('turns on without touching the text', () => {
    const { state, review } = reviewing(PROPOSED, ORIGINAL)

    expect(review.isActive(state)).toBe(true)
    // Starting a review changes nothing: the proposal was already written in.
    expect(state.doc.toString()).toBe(PROPOSED)
    expect(getOriginalDoc(state).toString()).toBe(ORIGINAL)
  })

  it('turns back off again', () => {
    const { state, review } = reviewing(PROPOSED, ORIGINAL)
    const stopped = state.update(review.stop()).state
    expect(review.isActive(stopped)).toBe(false)
  })

  /**
   * The undo history has to survive a review, because "undo the whole thing" is the escape hatch when
   * a proposal turns out to be wrong. That is why review mode lives in a compartment rather than
   * rebuilding the editor state.
   */
  it('keeps the document history across starting and stopping', () => {
    const review = new ReviewMode()
    const base = createEditorState({
      content: ORIGINAL,
      segments: [],
      extensions: review.extension()
    })
    const typed = base.update({ changes: { from: 0, insert: 'X' } }).state
    const started = typed.update(review.start(ORIGINAL)).state
    const stopped = started.update(review.stop()).state

    // Same state lineage throughout: nothing was rebuilt from scratch underneath.
    expect(stopped.doc.toString()).toBe('X' + ORIGINAL)
  })
})

describe('reviewFinished', () => {
  it('is false while the two sides still differ', () => {
    const { state } = reviewing(PROPOSED, ORIGINAL)
    expect(reviewFinished(state)).toBe(false)
  })

  // What rejecting everything leaves behind: the document back at the original.
  it('is true when the document returns to the original', () => {
    const { state } = reviewing(PROPOSED, ORIGINAL)
    const at = PROPOSED.indexOf('Đoạn hai đã sửa.')
    const reverted = state.update({
      changes: { from: at, to: at + 'Đoạn hai đã sửa.'.length, insert: 'Đoạn hai.' }
    }).state

    expect(reverted.doc.toString()).toBe(ORIGINAL)
    expect(reviewFinished(reverted)).toBe(true)
  })

  // What accepting everything leaves behind: the original raised to the new text.
  it('is true when the original is raised to the document', () => {
    const { state } = reviewing(PROPOSED, ORIGINAL)
    // Built against the **original** document's length, not the editor's: the effect describes a
    // change to the thing being compared against, and `state.changes()` would size it to the doc.
    const toProposed = ChangeSet.of(
      { from: 0, to: ORIGINAL.length, insert: PROPOSED },
      ORIGINAL.length
    )
    const accepted = state.update({ effects: originalDocChangeEffect(state, toProposed) }).state

    expect(getOriginalDoc(accepted).toString()).toBe(PROPOSED)
    expect(reviewFinished(accepted)).toBe(true)
  })

  it('is true for a proposal that changed nothing', () => {
    const { state } = reviewing(ORIGINAL, ORIGINAL)
    expect(reviewFinished(state)).toBe(true)
  })
})
