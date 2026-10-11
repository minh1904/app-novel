import { describe, expect, it } from 'vitest'
import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import { undo } from '@codemirror/commands'
import { applyProposal, targetRange } from './chatRange'
import { createEditorState } from './editorState'
import type { SegmentRecord } from '../../../../../shared/contracts/text'

/**
 * Kiểm tra xác định phạm vi áp dụng và kiểm tra tính an toàn khi ghi đề xuất AI.
 */

const DOC = ['Đoạn một câu đầu.', '', 'Đoạn hai câu đầu. Đoạn hai câu sau.', '', 'Đoạn ba.'].join(
  '\n'
)

function segmentsFor(text: string, spans: Array<[number, number]>): SegmentRecord[] {
  return spans.map(([start, end], index) => ({
    id: 's' + index,
    position: index,
    start,
    end,
    textRev: 1,
    status: 'ok' as const,
    text: text.slice(start, end)
  }))
}

function stateOf(
  content = DOC,
  options: { at?: number; selection?: [number, number]; spans?: Array<[number, number]> } = {}
): EditorState {
  const base = createEditorState({
    content,
    segments: options.spans ? segmentsFor(content, options.spans) : [],
    // Tham số bắt buộc phải là một Extension hợp lệ
    extensions: []
  })
  const selection = options.selection
    ? EditorSelection.single(options.selection[0], options.selection[1])
    : EditorSelection.cursor(options.at ?? 0)
  return base.update({ selection }).state
}

/** Áp dụng transaction spec và trả về văn bản kết quả để đối chiếu trong test. */
function applied(state: EditorState, spec: TransactionSpec): string {
  return state.update(spec).state.doc.toString()
}

describe('targetRange', () => {
  it('a selection wins over everything', () => {
    const state = stateOf(DOC, { selection: [0, 8] })
    const range = targetRange(state)
    expect(range.text).toBe('Đoạn một')
    expect([range.from, range.to]).toEqual([0, 8])
  })

  it('with no selection it is the paragraph holding the caret', () => {
    const at = DOC.indexOf('Đoạn hai câu sau')
    const range = targetRange(stateOf(DOC, { at }))
    expect(range.text).toBe('Đoạn hai câu đầu. Đoạn hai câu sau.')
  })

  it('a paragraph spans its own lines but stops at the blank line', () => {
    const content = ['một', 'hai', '', 'ba'].join('\n')
    const range = targetRange(stateOf(content, { at: content.indexOf('hai') }))
    expect(range.text).toBe('một\nhai')
  })

  // Trường hợp đoạn rỗng: trả về phạm vi rỗng để panel hiển thị trạng thái tương ứng.
  it('a caret on a blank line gives an empty range, not the neighbours', () => {
    // Vị trí ngay sau dấu xuống dòng đầu tiên là dòng trống.
    const blank = DOC.indexOf('\n\n') + 1
    const range = targetRange(stateOf(DOC, { at: blank }))
    expect(range.text).toBe('')
    expect(range.from).toBe(range.to)
  })

  it('the whole chapter only when asked for by name', () => {
    const state = stateOf(DOC, { at: 0 })
    expect(targetRange(state, 'chapter').text).toBe(DOC)
    // Con trỏ ở chế độ tự động không được vượt quá phạm vi đoạn của chính nó.
    expect(targetRange(state, 'auto').text).toBe('Đoạn một câu đầu.')
  })

  it('lists the segments the range overlaps, in order', () => {
    const content = 'Một. Hai. Ba.'
    const state = stateOf(content, {
      selection: [0, 9],
      spans: [
        [0, 4],
        [5, 9],
        [10, 13]
      ]
    })
    expect(targetRange(state).targetIds).toEqual(['s0', 's1'])
  })

  it('a caret inside one segment still names that segment', () => {
    const content = 'Một. Hai.'
    const state = stateOf(content, {
      at: 2,
      spans: [
        [0, 4],
        [5, 9]
      ]
    })
    expect(targetRange(state).targetIds).toContain('s0')
  })
})

describe('applyProposal', () => {
  it('replaces the anchored text when it has not moved', () => {
    const state = stateOf(DOC, { at: DOC.indexOf('Đoạn ba') })
    const range = targetRange(state)
    const result = applyProposal(state, range, 'Đoạn ba, viết lại.')

    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') return
    expect(applied(state, result.spec)).toContain('Đoạn ba, viết lại.')
    expect(applied(state, result.spec)).not.toContain('Đoạn ba.')
  })

  // Nhập văn bản ở phía trên làm dịch chuyển vị trí, nhưng neo vẫn tồn tại duy nhất.
  it('finds the anchor again after the user typed above it', () => {
    const before = stateOf(DOC, { at: DOC.indexOf('Đoạn ba') })
    const range = targetRange(before)
    const after = before.update({ changes: { from: 0, insert: 'Thêm một dòng mới\n\n' } }).state

    const result = applyProposal(after, range, 'ĐÃ THAY')
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') return
    const text = applied(after, result.spec)
    expect(text).toContain('Thêm một dòng mới')
    expect(text).toContain('ĐÃ THAY')
    expect(text).not.toContain('Đoạn ba.')
  })

  it('refuses when the anchored text was edited', () => {
    const before = stateOf(DOC, { at: DOC.indexOf('Đoạn ba') })
    const range = targetRange(before)
    const at = DOC.indexOf('Đoạn ba')
    const after = before.update({ changes: { from: at, to: at + 7, insert: 'Đoạn BỐN' } }).state

    expect(applyProposal(after, range, 'ĐÃ THAY').kind).toBe('stale')
  })

  // Khi neo xuất hiện 2 lần, không thể xác định vị trí đích chính xác nên từ chối.
  it('refuses when the anchored text now appears twice', () => {
    const before = stateOf(DOC, { at: DOC.indexOf('Đoạn ba') })
    const range = targetRange(before)
    const after = before.update({ changes: { from: 0, insert: 'Đoạn ba.\n\n' } }).state

    expect(applyProposal(after, range, 'ĐÃ THAY').kind).toBe('stale')
  })

  it('refuses an empty anchor in a document that has text', () => {
    const state = stateOf(DOC, { at: 0 })
    expect(applyProposal(state, { from: 0, to: 0, text: '', targetIds: [] }, 'x').kind).toBe(
      'stale'
    )
  })

  // Lần dịch đầu tiên: tài liệu trống thì neo cũng trống, cho phép chèn nội dung trực tiếp.
  it('inserts into an empty document, where an empty anchor is unambiguous', () => {
    const state = stateOf('', { at: 0 })
    const result = applyProposal(state, { from: 0, to: 0, text: '', targetIds: [] }, 'Bản dịch mới')

    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') return
    expect(applied(state, result.spec)).toBe('Bản dịch mới')
  })

  it('one undo also reverses that first insert', () => {
    const state = stateOf('', { at: 0 })
    const result = applyProposal(state, { from: 0, to: 0, text: '', targetIds: [] }, 'Một\n\nHai')
    if (result.kind !== 'ready') throw new Error('expected ready')

    let current = state.update(result.spec).state
    undo({
      state: current,
      dispatch: (transaction) => {
        current = transaction.state
      }
    })
    expect(current.doc.toString()).toBe('')
  })

  it('refuses when the anchored text is gone entirely', () => {
    const before = stateOf(DOC, { at: DOC.indexOf('Đoạn ba') })
    const range = targetRange(before)
    const after = before.update({
      changes: { from: 0, to: before.doc.length, insert: 'khác hẳn' }
    }).state

    expect(applyProposal(after, range, 'ĐÃ THAY').kind).toBe('stale')
  })

  // Một lệnh dispatch duy nhất giúp khôi phục (undo) toàn bộ nội dung thay thế qua nhiều đoạn.
  it('one undo reverses a multi-paragraph replacement', () => {
    const state = stateOf(DOC, { at: 0 })
    const range = targetRange(state, 'chapter')
    const result = applyProposal(state, range, 'Một đoạn\n\nvà một đoạn nữa\n\nvà nữa')
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') return

    // Kiểm tra tính năng undo thông qua hệ thống history của editor.
    let current = state.update(result.spec).state
    expect(current.doc.toString()).not.toBe(DOC)

    undo({
      state: current,
      dispatch: (transaction) => {
        current = transaction.state
      }
    })
    expect(current.doc.toString()).toBe(DOC)
  })

  it('leaves the caret after the inserted text', () => {
    const state = stateOf(DOC, { at: DOC.indexOf('Đoạn ba') })
    const range = targetRange(state)
    const result = applyProposal(state, range, 'ngắn')
    if (result.kind !== 'ready') throw new Error('expected ready')

    const next = state.update(result.spec).state
    expect(next.selection.main.empty).toBe(true)
    expect(next.doc.sliceString(next.selection.main.head - 4, next.selection.main.head)).toBe(
      'ngắn'
    )
  })
})
