import type { EditorState, TransactionSpec } from '@codemirror/state'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { segment } from '../../../../shared/algorithms/segmenter'
import { createEditorState, segmentsField } from './editorState'
import { IdleResegmenter, afterComposition, resegmentNow, type ViewLike } from './resegmenter'

/** A view with no browser behind it, which records every transaction it is given. */
class FakeView implements ViewLike {
  state: EditorState
  composing = false
  compositionStarted = false
  dispatched: TransactionSpec[] = []

  constructor(content: string) {
    this.state = createEditorState({
      content,
      segments: segment(content, 'en').map((range, index) => ({
        id: 's' + index,
        start: range.start,
        end: range.end,
        textRev: 1,
        status: 'ok' as const
      })),
      extensions: []
    })
  }

  dispatch(spec: TransactionSpec): void {
    this.dispatched.push(spec)
    this.state = this.state.update(spec).state
  }

  type(from: number, insert: string): void {
    this.state = this.state.update({ changes: { from, insert } }).state
  }
}

const disturbed = (): FakeView => {
  const view = new FakeView('Một.\n\nHai.')
  view.type(5, 'Mới.')
  return view
}

describe('splitting again while an input method composes', () => {
  it('does nothing, and says so, while composing', () => {
    const view = disturbed()
    const before = view.state.field(segmentsField)
    view.composing = true
    expect(resegmentNow(view, 'en')).toBe('composing')
    expect(view.dispatched).toEqual([])
    expect(view.state.field(segmentsField)).toBe(before)
  })

  it('also waits when a composition has started but not begun to update', () => {
    const view = disturbed()
    view.compositionStarted = true
    expect(resegmentNow(view, 'en')).toBe('composing')
    expect(view.dispatched).toEqual([])
  })

  it('splits once the composition has ended', () => {
    const view = disturbed()
    expect(resegmentNow(view, 'en')).toBe('done')
    expect(view.dispatched).toHaveLength(1)
    expect(view.state.field(segmentsField).some((seg) => seg.id === null)).toBe(true)
  })

  it('never changes the text, whatever it does', () => {
    const view = disturbed()
    const text = view.state.doc.toString()
    resegmentNow(view, 'en')
    expect(view.state.doc.toString()).toBe(text)
  })
})

describe('idle splitting', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits for the user to stop typing', () => {
    const view = disturbed()
    const idle = new IdleResegmenter(view, 'en', 800)
    idle.touch()
    vi.advanceTimersByTime(500)
    idle.touch()
    vi.advanceTimersByTime(500)
    expect(view.dispatched).toEqual([])
    vi.advanceTimersByTime(300)
    expect(view.dispatched).toHaveLength(1)
  })

  it('puts it off while composing and does it when the composition ends', () => {
    const view = disturbed()
    const text = view.state.doc.toString()
    const idle = new IdleResegmenter(view, 'en', 800)
    view.composing = true
    idle.touch()
    vi.advanceTimersByTime(800 * 3)
    expect(view.dispatched).toEqual([])
    expect(view.state.doc.toString()).toBe(text)
    view.composing = false
    vi.advanceTimersByTime(800)
    expect(view.dispatched).toHaveLength(1)
    idle.destroy()
  })

  it('stops when destroyed', () => {
    const view = disturbed()
    const idle = new IdleResegmenter(view, 'en', 800)
    idle.touch()
    idle.destroy()
    vi.advanceTimersByTime(5000)
    expect(view.dispatched).toEqual([])
  })

  it('lets a save wait out a composition', async () => {
    const view = new FakeView('Một.')
    view.composing = true
    let done = false
    const waiting = afterComposition(view, 10).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(50)
    expect(done).toBe(false)
    view.composing = false
    await vi.advanceTimersByTimeAsync(20)
    await waiting
    expect(done).toBe(true)
  })
})
