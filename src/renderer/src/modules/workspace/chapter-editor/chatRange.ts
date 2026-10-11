import {
  EditorSelection,
  Transaction,
  type EditorState,
  type TransactionSpec
} from '@codemirror/state'
import { segmentsField } from './editorState'

/**
 * Xác định đoạn văn bản áp dụng cho lượt trao đổi AI và quy tắc đưa nội dung thay thế vào tài liệu.
 */

/** `auto` bám theo vùng chọn hoặc con trỏ; `chapter` áp dụng cho toàn bộ chương. */
export type TargetScope = 'auto' | 'chapter'

export interface TargetRange {
  from: number
  to: number
  /** Văn bản gốc tại thời điểm gửi câu hỏi để dùng làm neo đối chiếu. */
  text: string
  /** Danh sách ID các segment bị ảnh hưởng theo thứ tự trong tài liệu. */
  targetIds: string[]
  /** Đánh dấu xem phạm vi này là vùng chọn thực sự hay là cả đoạn/cả chương. */
  selected?: boolean
}

/** Xác định đoạn văn bản chứa `pos`: mở rộng lên và xuống cho đến khi gặp dòng trống. */
function paragraphAt(state: EditorState, pos: number): { from: number; to: number } {
  const line = state.doc.lineAt(pos)
  if (line.text.trim() === '') return { from: line.from, to: line.from }

  let first = line.number
  while (first > 1 && state.doc.line(first - 1).text.trim() !== '') first -= 1
  let last = line.number
  while (last < state.doc.lines && state.doc.line(last + 1).text.trim() !== '') last += 1

  return { from: state.doc.line(first).from, to: state.doc.line(last).to }
}

/**
 * Xác định phạm vi áp dụng cho lượt trao đổi AI:
 * Ưu tiên vùng chọn -> đoạn chứa con trỏ -> toàn bộ chương nếu được yêu cầu rõ ràng.
 */
export function targetRange(state: EditorState, scope: TargetScope = 'auto'): TargetRange {
  const selection = state.selection.main
  const span =
    scope === 'chapter'
      ? { from: 0, to: state.doc.length }
      : selection.empty
        ? paragraphAt(state, selection.head)
        : { from: selection.from, to: selection.to }

  return {
    from: span.from,
    to: span.to,
    selected: scope !== 'chapter' && !selection.empty,
    text: state.doc.sliceString(span.from, span.to),
    targetIds: state
      .field(segmentsField)
      // Phạm vi độ dài 0 vẫn thuộc về segment chứa nó nếu chạm vào ranh giới
      .filter((seg) => seg.id !== null && seg.from <= span.to && seg.to >= span.from)
      .map((seg) => seg.id as string)
  }
}

export type ApplyResult =
  /** Transaction sẵn sàng áp dụng thành một bước có thể hoàn tác. */
  | { kind: 'ready'; spec: TransactionSpec }
  /** Văn bản neo đã bị thay đổi hoặc không xác định rõ vị trí: từ chối áp dụng. */
  | { kind: 'stale' }

/** Tìm tất cả vị trí xuất hiện của `needle`, giới hạn tối đa 2 kết quả để nhận biết tính duy nhất. */
function occurrences(haystack: string, needle: string): number[] {
  const found: number[] = []
  let at = haystack.indexOf(needle)
  while (at !== -1 && found.length < 2) {
    found.push(at)
    at = haystack.indexOf(needle, at + 1)
  }
  return found
}

/**
 * Đưa đề xuất AI vào văn bản dựa trên nội dung neo (thay vì chỉ dựa vào chỉ số vị trí):
 * 1. Văn bản tại [from, to] vẫn khớp -> thay thế tại chỗ.
 * 2. Vị trí bị dịch chuyển nhưng chỉ xuất hiện duy nhất 1 lần -> thay thế tại vị trí mới.
 * 3. Văn bản đã bị sửa đổi hoặc xuất hiện nhiều lần -> trả về `stale` để tránh ghi đè sai.
 */
export function applyProposal(
  state: EditorState,
  range: TargetRange,
  replacement: string
): ApplyResult {
  // Neo rỗng chỉ áp dụng được khi tài liệu hoàn toàn trống
  if (range.text === '') {
    if (state.doc.length > 0) return { kind: 'stale' }
    return {
      kind: 'ready',
      spec: {
        changes: { from: 0, to: 0, insert: replacement },
        selection: EditorSelection.cursor(replacement.length),
        scrollIntoView: true,
        annotations: Transaction.userEvent.of('input.chat')
      }
    }
  }

  const spec = (from: number, to: number): ApplyResult => ({
    kind: 'ready',
    spec: {
      changes: { from, to, insert: replacement },
      selection: EditorSelection.cursor(from + replacement.length),
      scrollIntoView: true,
      // Đánh dấu userEvent là input.chat để gộp vào lịch sử hoàn tác
      annotations: Transaction.userEvent.of('input.chat')
    }
  })

  const within =
    range.from >= 0 && range.to <= state.doc.length
      ? state.doc.sliceString(range.from, range.to)
      : null
  if (within === range.text) return spec(range.from, range.to)

  const found = occurrences(state.doc.toString(), range.text)
  return found.length === 1 ? spec(found[0], found[0] + range.text.length) : { kind: 'stale' }
}
