import type { EditorView } from '@codemirror/view'

/**
 * Kiểm tra xem có vùng chọn nào chạm vào khoảng `[start, end]` (tính cả biên) hay không.
 */
export function selectionTouches(view: EditorView, start: number, end: number): boolean {
  return view.state.selection.ranges.some((range) => range.to >= start && range.from <= end)
}
