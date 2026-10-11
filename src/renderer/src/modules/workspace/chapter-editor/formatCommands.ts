import { syntaxTree } from '@codemirror/language'
import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import type { Command } from '@codemirror/view'
import { scanMarkdown, type InlineKind, type InlineSpan } from './markdownSyntax'

/**
 * Thao tác bọc hoặc gỡ bỏ ký tự phân cách (`**`, `*`, `~~`...) cho một vùng chọn.
 * Hàm thuần túy giúp kiểm thử dễ dàng mà không cần môi trường DOM.
 */
export interface WrapEdit {
  from: number
  to: number
  insert: string
  selFrom: number
  selTo: number
}

/**
 * Tìm đoạn nhỏ nhất thuộc loại `kind` chứa trọn vẹn `[from, to]`, bao gồm cả mép biên.
 * Bỏ qua đoạn trải dài qua dấu xuống dòng vì thao tác bật/tắt không vượt quá dòng hiện tại.
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
 * Bật/tắt ký tự định dạng: nếu vùng chọn hoặc con trỏ nằm trong đoạn đã định dạng thì gỡ bỏ ký tự bọc;
 * ngược lại bọc vùng chọn (hoặc chèn cặp ký tự trống nếu chưa chọn gì).
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
 * Tạo danh sách thay đổi và vùng chọn mới để bật/tắt định dạng trên từng phạm vi chọn.
 */
export function toggleWrapChanges(
  state: EditorState,
  delim: string,
  kind: InlineKind
): TransactionSpec {
  const { doc } = state
  const tree = syntaxTree(state)
  return state.changeByRange((range) => {
    // Mở rộng 1 ký tự mỗi bên để con trỏ đặt sát ký tự phân cách vẫn nhận biết được span
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

/** Tạo lệnh phím tắt bật/tắt ký tự phân cách trên vùng chọn. */
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

/** Phím tắt Ctrl/Cmd-B: bật/tắt chữ đậm (`**bold**`) trên vùng chọn. */
export const toggleBold = wrapCommand('**', 'bold')
/** Phím tắt Ctrl/Cmd-I: bật/tắt chữ nghiêng (`*italic*`) trên vùng chọn. */
export const toggleItalic = wrapCommand('*', 'italic')
