import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { ProposalReview } from './proposalReview'

describe('proposal preview decoration', () => {
  const preview = {
    from: 4, to: 7, before: 'Hai', after: 'Mới', label: 'Đề xuất đoạn 2',
    onAccept: () => {}, onDeny: () => {}
  }

  it('opens and closes without changing the canonical text or undo history', () => {
    const review = new ProposalReview()
    const base = EditorState.create({ doc: 'Một\nHai', extensions: [review.extension()] })
    const opened = base.update(review.start(preview)).state
    expect(review.isActive(opened)).toBe(true)
    expect(opened.doc.toString()).toBe('Một\nHai')
    const closed = opened.update(review.stop()).state
    expect(review.isActive(closed)).toBe(false)
    expect(closed.doc.toString()).toBe('Một\nHai')
  })

  it('discards a stale preview when the editor text changes', () => {
    const review = new ProposalReview()
    const base = EditorState.create({ doc: 'Một\nHai', extensions: [review.extension()] })
    const opened = base.update(review.start(preview)).state
    const edited = opened.update({ changes: { from: 0, insert: 'X' } }).state
    expect(review.isActive(edited)).toBe(false)
    expect(edited.doc.toString()).toBe('XMột\nHai')
  })
})
