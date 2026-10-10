import { redo, undo } from '@codemirror/commands'
import { type EditorState, Transaction, type TransactionSpec } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { segment, type SegmentLanguage } from '../../../../../shared/segmentation/segmenter'
import type { SegmentRecord } from '../../../../../shared/contracts/text'
import { createEditorState, resegmentSpec, segmentsField, setSegments } from './editorState'

function open(content: string, lang: SegmentLanguage = 'en'): EditorState {
  const segments: SegmentRecord[] = segment(content, lang).map((range, index) => ({
    id: 's' + index,
    start: range.start,
    end: range.end,
    textRev: 1,
    status: 'ok'
  }))
  return createEditorState({ content, segments, extensions: [] })
}

const run = (state: EditorState, spec: TransactionSpec): EditorState => state.update(spec).state

function step(state: EditorState, command: typeof undo): EditorState {
  let next = state
  command({
    state,
    dispatch: (tr) => {
      next = tr.state
    }
  })
  return next
}

const segs = (state: EditorState): Array<[string | null, string]> =>
  state.field(segmentsField).map((seg) => [seg.id, state.doc.sliceString(seg.from, seg.to)])

describe('segments follow the text', () => {
  it('shift and grow with typing, keeping IDs', () => {
    let state = open('Một câu. Hai câu.')
    state = run(state, { changes: { from: 4, insert: 'nữa ' }, userEvent: 'input.type' })
    expect(segs(state)).toEqual([
      ['s0', 'Một nữa câu.'],
      ['s1', 'Hai câu.']
    ])
  })

  it('treat CRLF and CR in pasted text as one line break each', () => {
    const state = run(open('Một.'), { changes: { from: 4, insert: '\r\nHai.\rBa.' } })
    expect(state.doc.toString()).toBe('Một.\nHai.\nBa.')
  })
})

describe('undo and redo bring back the IDs', () => {
  const original = 'Trời mưa to. Anh ở nhà. Cô đi ra ngoài.'

  it('after a delete that merged two segments', () => {
    const before = open(original)
    const from = original.indexOf('to.')
    const to = original.indexOf('ở nhà')
    const deleted = run(before, { changes: { from, to }, userEvent: 'delete.selection' })
    expect(segs(deleted)).toEqual([
      ['s0', 'Trời mưa ở nhà.'],
      ['s2', 'Cô đi ra ngoài.']
    ])

    const undone = step(deleted, undo)
    expect(undone.doc.toString()).toBe(original)
    expect(segs(undone)).toEqual(segs(before))

    const redone = step(undone, redo)
    expect(segs(redone)).toEqual(segs(deleted))
  })

  it('after a delete that removed a whole segment', () => {
    const before = open(original)
    const seg = before.field(segmentsField)[1]
    const deleted = run(before, {
      changes: { from: seg.from, to: seg.to + 1 },
      userEvent: 'delete'
    })
    expect(deleted.field(segmentsField).map((s) => s.id)).toEqual(['s0', 's2'])
    expect(segs(step(deleted, undo))).toEqual(segs(before))
  })

  it('in one step even when the edit was split again in between', () => {
    const before = open('Trời mưa to.')
    const pasted = run(before, {
      changes: { from: 5, insert: 'a.\nb.\nc. ' },
      userEvent: 'input.paste'
    })
    const spec = resegmentSpec(pasted, 'en')
    expect(spec).not.toBeNull()
    const split = run(pasted, spec as TransactionSpec)
    expect(split.field(segmentsField).length).toBeGreaterThan(1)
    expect(split.doc.toString()).toBe(pasted.doc.toString())

    const undone = step(split, undo)
    expect(undone.doc.toString()).toBe('Trời mưa to.')
    expect(segs(undone)).toEqual([['s0', 'Trời mưa to.']])
    // One step was enough: there is nothing left to undo.
    expect(step(undone, undo)).toBe(undone)
  })

  it('after the segments were given IDs by a save', () => {
    const before = open('Một.\n\nHai.')
    const typed = run(before, { changes: { from: 5, insert: 'Mới.' }, userEvent: 'input.type' })
    const split = run(typed, resegmentSpec(typed, 'en') as TransactionSpec)
    expect(segs(split)[1]).toEqual([null, 'Mới.'])

    const saved = run(split, {
      effects: setSegments.of(
        split.field(segmentsField).map((s) => (s.id === null ? { ...s, id: 'n1' } : s))
      ),
      annotations: Transaction.addToHistory.of(false)
    })
    const undone = step(saved, undo)
    expect(segs(undone)).toEqual(segs(before))
    // Redo gets the segments as they were when undo started, with the ID the save gave.
    expect(segs(step(undone, redo))).toEqual(segs(saved))
  })
})

describe('resegmentSpec', () => {
  it('is null when nothing is disturbed', () => {
    expect(resegmentSpec(open('Một. Hai.\nBa.'), 'en')).toBeNull()
  })

  it('changes no text and is not an undo step', () => {
    const typed = run(open('Một.\n\nHai.'), { changes: { from: 5, insert: 'Mới.' } })
    const spec = resegmentSpec(typed, 'en') as TransactionSpec
    const tr = typed.update(spec)
    expect(tr.docChanged).toBe(false)
    expect(tr.annotation(Transaction.addToHistory)).toBe(false)
  })
})
