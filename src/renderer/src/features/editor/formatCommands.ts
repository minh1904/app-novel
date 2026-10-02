import { EditorSelection } from '@codemirror/state'
import type { Command } from '@codemirror/view'

/**
 * What wrapping or unwrapping a delimiter (`**`, `*`, `~~`...) does to one selection range — pure,
 * so it is testable without an `EditorView` (the `node` test environment has no DOM).
 */
export interface WrapEdit {
  from: number
  to: number
  insert: string
  selFrom: number
  selTo: number
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A `delim…delim` span on `line` (absolute offset `lineFrom`) that fully contains `[from, to]`. */
function enclosingWrap(
  line: string,
  lineFrom: number,
  from: number,
  to: number,
  delim: string
): { start: number; end: number; inner: string } | null {
  const d = escapeRegExp(delim)
  // The delimiter's own first character can't appear inside it unescaped — same rule `INLINE_RE`
  // in livePreviewDecorations.ts uses to tell `**bold**` apart from a lone `*`.
  const re = new RegExp(d + '([^' + escapeRegExp(delim[0]) + '\\n]+)' + d, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(line))) {
    const start = lineFrom + match.index
    const end = start + match[0].length
    if (start <= from && to <= end) return { start, end, inner: match[1] }
  }
  return null
}

/**
 * Selecting exactly "delimXdelim", or just having the caret somewhere inside an existing wrapped
 * span (selected or not), unwraps that span and selects the plain text left behind. Anything else
 * wraps the given selection; an empty selection gets an empty pair with the caret in the middle.
 */
export function wrapToggleEdit(params: {
  line: string
  lineFrom: number
  from: number
  to: number
  selected: string
  delim: string
}): WrapEdit {
  const { line, lineFrom, from, to, selected, delim } = params
  // A lone "*" must not match inside an existing "**bold**" — one of its two stars would parse as
  // a false italic delimiter and stripping it would corrupt the bold markers instead of leaving
  // them alone. Nested bold+italic is an explicit non-goal; falling through to wrap is the safe
  // outcome (it clutters the text but never deletes a delimiter the user did not ask to remove).
  const shadowedByBold = delim === '*' && enclosingWrap(line, lineFrom, from, to, '**') !== null
  const enclosing = shadowedByBold ? null : enclosingWrap(line, lineFrom, from, to, delim)
  if (enclosing) {
    const innerFrom = enclosing.start + delim.length
    return {
      from: enclosing.start,
      to: enclosing.end,
      insert: enclosing.inner,
      selFrom: innerFrom,
      selTo: innerFrom + enclosing.inner.length
    }
  }
  return {
    from,
    to,
    insert: delim + selected + delim,
    selFrom: from + delim.length,
    selTo: to + delim.length
  }
}

/** Builds a Ctrl/Cmd-<key> command that toggles one delimiter on the selection, Word/Notion-style. */
function wrapCommand(delim: string): Command {
  return (view) => {
    const update = view.state.changeByRange((range) => {
      const line = view.state.doc.lineAt(range.from)
      const edit = wrapToggleEdit({
        line: line.text,
        lineFrom: line.from,
        from: range.from,
        to: range.to,
        selected: view.state.sliceDoc(range.from, range.to),
        delim
      })
      return {
        changes: { from: edit.from, to: edit.to, insert: edit.insert },
        range: EditorSelection.range(edit.selFrom, edit.selTo)
      }
    })
    view.dispatch(view.state.update(update, { scrollIntoView: true, userEvent: 'input' }))
    return true
  }
}

/** Ctrl/Cmd-B: toggle `**bold**` on the selection. */
export const toggleBold = wrapCommand('**')
/** Ctrl/Cmd-I: toggle `*italic*` on the selection. */
export const toggleItalic = wrapCommand('*')
