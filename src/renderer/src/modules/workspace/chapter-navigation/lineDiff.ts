/**
 * So sánh khác biệt theo dòng giữa hai văn bản dựa trên thuật toán LCS.
 */

export type DiffKind = 'same' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffKind
  text: string
}

/**
 * Tách văn bản thành danh sách dòng: chuỗi rỗng trả về mảng rỗng (không tạo dòng trống).
 */
function linesOf(text: string): string[] {
  return text === '' ? [] : text.split('\n')
}

/** Bảng độ dài của dãy con chung dài nhất (LCS) giữa các dòng. */
function lcsTable(before: string[], after: string[]): number[][] {
  const table: number[][] = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0)
  )
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      table[i][j] =
        before[i] === after[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  return table
}

/**
 * Trả về danh sách các dòng diff giữa `after` và `before` theo thứ tự đọc.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const left = linesOf(before)
  const right = linesOf(after)
  if (before === after) return left.map((text) => ({ kind: 'same', text }))
  const table = lcsTable(left, right)

  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      lines.push({ kind: 'same', text: left[i] })
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ kind: 'removed', text: left[i] })
      i += 1
    } else {
      lines.push({ kind: 'added', text: right[j] })
      j += 1
    }
  }
  while (i < left.length) lines.push({ kind: 'removed', text: left[i++] })
  while (j < right.length) lines.push({ kind: 'added', text: right[j++] })
  return lines
}

/** Tóm tắt số dòng được thêm và số dòng bị xóa để hiển thị phía trên phần diff. */
export function diffSummary(lines: DiffLine[]): { added: number; removed: number } {
  return {
    added: lines.filter((line) => line.kind === 'added').length,
    removed: lines.filter((line) => line.kind === 'removed').length
  }
}
