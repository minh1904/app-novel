import { syntaxTree } from '@codemirror/language'
import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import type { Command } from '@codemirror/view'
import { scanMarkdown, type InlineKind, type InlineSpan } from './markdownSyntax'

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

/**
 * The innermost span of `kind` that fully contains `[from, to]`, edges included (a caret right at a
 * delimiter is still "in" the span). A span that runs over a line break is skipped: the toggle never
 * reaches past the line the selection is on.
 */
function enclosingSpan(
  spans: readonly InlineSpan[],
  slice: (from: number, to: number) => string,
  kind: InlineKind,
  from: number,
  to: number
): InlineSpan | null {
  let best: InlineSpan | null = null
  for (const span of spans) {
    if (span.kind !== kind || span.from > from || to > span.to) continue
    if (slice(span.from, span.to).includes('\n')) continue
    if (best === null || span.to - span.from < best.to - best.from) best = span
  }
  return best
}

/**
 * Selecting exactly "delimXdelim", or just having the caret somewhere inside an existing span of
 * that kind (selected or not), unwraps that span and selects the plain text left behind. Anything
 * else wraps the given selection; an empty selection gets an empty pair with the caret in the middle.
 *
 * `spans` are the emphasis spans around the selection, read from the Markdown syntax tree. Because
 * they come from the parser, a `*` inside a `**bold**` is never mistaken for an italic delimiter, and
 * an `_italic_` unwraps as readily as a `*italic*`. A bold with no italic inside it gets a new empty
 * pair at the caret instead — it clutters the text but never deletes a delimiter the user did not
 * ask to remove.
 */
export function wrapToggleEdit(params: {
  spans: readonly InlineSpan[]
  slice: (from: number, to: number) => string
  from: number
  to: number
  delim: string
  kind: InlineKind
}): WrapEdit {
  const { spans, slice, from, to, delim, kind } = params
  const enclosing = enclosingSpan(spans, slice, kind, from, to)
  if (enclosing) {
    return {
      from: enclosing.from,
      to: enclosing.to,
      insert: slice(enclosing.innerFrom, enclosing.innerTo),
      selFrom: enclosing.from,
      selTo: enclosing.from + (enclosing.innerTo - enclosing.innerFrom)
    }
  }
  const selected = slice(from, to)
  return {
    from,
    to,
    insert: delim + selected + delim,
    selFrom: from + delim.length,
    selTo: to + delim.length
  }
}

/**
 * The changes and new selection for toggling one delimiter on every selection range. Split out of
 * the command so it can be applied to a plain `EditorState` in a test.
 *
 * `changeByRange` wants each new range in the coordinates of the document *after* its own change, so
 * `WrapEdit.selFrom`/`selTo` are given that way (an unwrapped span starts where the old span did).
 */
export function toggleWrapChanges(
  state: EditorState,
  delim: string,
  kind: InlineKind
): TransactionSpec {
  const { doc } = state
  const tree = syntaxTree(state)
  return state.changeByRange((range) => {
    // One character of slack on each side, so a caret that sits right at a delimiter finds its span.
    const { inline } = scanMarkdown(tree, doc, [
      { from: Math.max(0, range.from - 1), to: Math.min(doc.length, range.to + 1) }
    ])
    const edit = wrapToggleEdit({
      spans: inline,
      slice: (from, to) => doc.sliceString(from, to),
      from: range.from,
      to: range.to,
      delim,
      kind
    })
    return {
      changes: { from: edit.from, to: edit.to, insert: edit.insert },
      range: EditorSelection.range(edit.selFrom, edit.selTo)
    }
  })
}

/** Builds a Ctrl/Cmd-<key> command that toggles one delimiter on the selection, Word/Notion-style. */
function wrapCommand(delim: string, kind: InlineKind): Command {
  return (view) => {
    view.dispatch(
      view.state.update(toggleWrapChanges(view.state, delim, kind), {
        scrollIntoView: true,
        userEvent: 'input'
      })
    )
    return true
  }
}

/** Ctrl/Cmd-B: toggle `**bold**` on the selection. */
export const toggleBold = wrapCommand('**', 'bold')
/** Ctrl/Cmd-I: toggle `*italic*` on the selection. */
export const toggleItalic = wrapCommand('*', 'italic')
