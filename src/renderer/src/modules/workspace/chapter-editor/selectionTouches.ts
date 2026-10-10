import type { EditorView } from '@codemirror/view'

/**
 * Whether any selection range touches `[start, end]`, boundaries included — a caret sitting right at
 * an edge counts, because that is where a click that lands on the token's border ends up. Shared by
 * every decoration that shows raw syntax while the caret is in it and something else (an image, a
 * hidden `**`) once the caret has moved away.
 */
export function selectionTouches(view: EditorView, start: number, end: number): boolean {
  return view.state.selection.ranges.some((range) => range.to >= start && range.from <= end)
}
