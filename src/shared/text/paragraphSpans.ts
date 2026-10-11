/**
 * Định nghĩa đoạn văn: mỗi dòng không trống được coi là một đoạn.
 * Dùng chung giữa các công cụ chat ở main (đếm đoạn) và renderer (định vị con trỏ).
 */

/** Một đoạn văn: một dòng không trống (`paragraphUnits`). */
export interface ParagraphSpan {
  /**
   * Phần cắt của `content` thuộc về đoạn này: từ đầu dòng của đoạn đến đầu dòng của đoạn tiếp theo
   * (đoạn đầu tiên bao gồm các dòng trống trước nó, đoạn cuối cùng kéo dài đến hết văn bản).
   * Các trang được cắt theo các mốc này khi ghép lại sẽ khôi phục chính xác `content`.
   */
  start: number
  end: number
  /** Vị trí của chính dòng đó trong `content`, dùng cho trích đoạn. */
  lineStart: number
  lineEnd: number
}

export function splitParagraphs(content: string): ParagraphSpan[] {
  const lines: Array<{ start: number; end: number }> = []
  const pattern = /[^\r\n]*(\r\n|\r|\n|$)/g
  for (let match = pattern.exec(content); match !== null; match = pattern.exec(content)) {
    const text = match[0].replace(/[\r\n]+$/, '')
    if (text.trim() !== '') lines.push({ start: match.index, end: match.index + text.length })
    if (match[0] === '' || pattern.lastIndex >= content.length) break
  }
  return lines.map((line, index) => ({
    start: index === 0 ? 0 : line.start,
    end: index === lines.length - 1 ? content.length : lines[index + 1].start,
    lineStart: line.start,
    lineEnd: line.end
  }))
}

/** Chỉ số đoạn văn (bắt đầu từ 0) chứa vị trí `offset`; trả về đoạn cuối cùng nếu offset ở cuối văn bản. */
export function paragraphAt(spans: ParagraphSpan[], offset: number): number {
  let low = 0
  let high = spans.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (spans[middle].start <= offset) low = middle
    else high = middle - 1
  }
  return low
}
