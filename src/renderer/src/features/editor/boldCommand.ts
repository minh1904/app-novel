import { EditorSelection } from '@codemirror/state'
import type { Command } from '@codemirror/view'

/**
 * What `**` wrapping or unwrapping does to one selection range — pure, so it is testable without an
 * `EditorView` (the `node` test environment has no DOM).
 */
export interface BoldEdit {
  from: number
  to: number
  insert: string
  selFrom: number
  selTo: number
}

const BOLD_RE = /\*\*([^*\n]+)\*\*/g

/** A `**bold**` span on `line` (absolute offset `lineFrom`) that fully contains `[from, to]`. */
function enclosingBold(
  line: string,
  lineFrom: number,
  from: number,
  to: number
): { start: number; end: number; inner: string } | null {
  BOLD_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = BOLD_RE.exec(line))) {
    const start = lineFrom + match.index
    const end = start + match[0].length
    if (start <= from && to <= end) return { start, end, inner: match[1] }
  }
  return null
}

/**
 * Selecting exactly "**text**", or just having the caret somewhere inside an existing bold span
 * (selected or not), unwraps that span and selects the plain text that is left. Anything else wraps
 * the given selection in `**…**`; an empty selection gets an empty pair with the caret in the middle.
 */
export function boldToggleEdit(params: {
  line: string
  lineFrom: number
  from: number
  to: number
  selected: string
}): BoldEdit {
  const { line, lineFrom, from, to, selected } = params
  const enclosing = enclosingBold(line, lineFrom, from, to)
  if (enclosing) {
    const innerFrom = enclosing.start + 2
    return {
      from: enclosing.start,
      to: enclosing.end,
      insert: enclosing.inner,
      selFrom: innerFrom,
      selTo: innerFrom + enclosing.inner.length
    }
  }
  return { from, to, insert: '**' + selected + '**', selFrom: from + 2, selTo: to + 2 }
}

/** Ctrl/Cmd-B in the translation pane: toggle `**bold**` on the selection, same as Word or Notion. */
export const toggleBold: Command = (view) => {
  const update = view.state.changeByRange((range) => {
    const line = view.state.doc.lineAt(range.from)
    const edit = boldToggleEdit({
      line: line.text,
      lineFrom: line.from,
      from: range.from,
      to: range.to,
      selected: view.state.sliceDoc(range.from, range.to)
    })
    return {
      changes: { from: edit.from, to: edit.to, insert: edit.insert },
      range: EditorSelection.range(edit.selFrom, edit.selTo)
    }
  })
  view.dispatch(view.state.update(update, { scrollIntoView: true, userEvent: 'input' }))
  return true
}
