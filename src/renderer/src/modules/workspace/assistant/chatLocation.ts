import type { ChatLocation } from '../../../../../shared/contracts/aiChat'
import { paragraphAt, splitParagraphs } from '../../../../../shared/text/paragraphSpans'

/**
 * Xác định vị trí đoạn văn hiện tại của người dùng để cung cấp ngữ cảnh cho công cụ trợ lý AI.
 *
 * Lưu số thứ tự đoạn văn của con trỏ và vùng chọn theo chỉ số bắt đầu từ 1, tương thích với cách chia đoạn của các công cụ.
 */

/** Vị trí con trỏ hoặc vùng chọn trong một khung soạn thảo, tính theo chỉ số ký tự. */
export interface PaneCaret {
  from: number
  to: number
  /** Đánh dấu có vùng chọn thực sự thay vì chỉ là vị trí đặt con trỏ. */
  selected: boolean
}

export interface LocationInput {
  sourceText: string
  targetText: string
  source: PaneCaret | null
  target: PaneCaret | null
  /** Khung soạn thảo được thao tác gần nhất để ưu tiên lấy vùng chọn. */
  active: 'source' | 'target'
}

/** Trả về số thứ tự đoạn văn (bắt đầu từ 1) chứa vị trí `offset`, hoặc `null` nếu không có đoạn nào. */
function paragraphOf(text: string, offset: number): number | null {
  const spans = splitParagraphs(text)
  if (spans.length === 0) return null
  return paragraphAt(spans, Math.max(0, Math.min(offset, text.length))) + 1
}

export function buildLocation(input: LocationInput): ChatLocation {
  const caret = (text: string, pane: PaneCaret | null): number | null =>
    pane === null ? null : paragraphOf(text, pane.from)
  const pane = input.active === 'source' ? input.source : input.target
  const text = input.active === 'source' ? input.sourceText : input.targetText
  let selection: ChatLocation['selection'] = null
  if (pane !== null && pane.selected && pane.to > pane.from) {
    const from = paragraphOf(text, pane.from)
    // Xét ký tự ngay trước điểm kết thúc để loại trừ trường hợp vùng chọn dừng ở đầu dòng tiếp theo.
    const to = paragraphOf(text, pane.to - 1)
    if (from !== null && to !== null)
      selection = { side: input.active, from, to: Math.max(from, to) }
  }
  return {
    caret: {
      source: caret(input.sourceText, input.source),
      target: caret(input.targetText, input.target)
    },
    selection
  }
}

const sideName = (side: 'source' | 'target'): string => (side === 'source' ? 'bản gốc' : 'bản dịch')

/** Tạo chuỗi mô tả vị trí hiện tại hiển thị trên tiêu đề bảng trợ lý. */
export function locationLabel(location: ChatLocation): string {
  const { selection, caret } = location
  if (selection !== null) {
    return selection.from === selection.to
      ? `đang chọn đoạn ${selection.from} ${sideName(selection.side)}`
      : `đang chọn đoạn ${selection.from}–${selection.to} ${sideName(selection.side)}`
  }
  if (caret.target !== null) return `đoạn ${caret.target} bản dịch`
  if (caret.source !== null) return `đoạn ${caret.source} bản gốc`
  return 'chưa đặt con trỏ'
}
