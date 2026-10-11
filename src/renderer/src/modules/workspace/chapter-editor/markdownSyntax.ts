import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import type { syntaxTree } from '@codemirror/language'
import type { Extension, Text } from '@codemirror/state'

/**
 * Dữ liệu cú pháp Markdown được đọc từ cây cú pháp (syntax tree) phục vụ Live Preview và các lệnh định dạng.
 *
 * Cây cú pháp giúp phân biệt chính xác văn bản nhấn mạnh thực sự với các khối mã (code span),
 * ký tự thoát `\*`, định danh `snake_case` hoặc URL — tránh việc ẩn nhầm ký tự.
 *
 * `scanMarkdown` là hàm thuần túy (nhận cây cú pháp, tài liệu và các khoảng range; trả về dữ liệu kết quả),
 * giúp kiểm thử độc lập mà không cần môi trường DOM.
 */

export type SyntaxTree = ReturnType<typeof syntaxTree>

/**
 * Bỏ qua các cú pháp khối không phù hợp với văn bản tiểu thuyết dịch:
 * Thụt đầu dòng là cách tiểu thuyết đánh dấu đoạn văn chứ không phải khối mã;
 * dòng `---` bên dưới là dấu ngắt cảnh chứ không phải tiêu đề;
 * `[Tên]: lời thoại` không phải định nghĩa liên kết; và dòng bắt đầu bằng thẻ HTML
 * không bị coi là khối HTML. Việc bỏ qua các khối này giúp tránh nuốt cú pháp nội dòng.
 */
const DROPPED_BLOCKS = ['IndentedCode', 'SetextHeading', 'LinkReference', 'HTMLBlock']

/**
 * Hỗ trợ ngôn ngữ Markdown cho khung dịch. Thiết lập `addKeymap: false` để phím Enter
 * chỉ thêm ngắt dòng thông thường thay vì tự động tiếp tục danh sách hay trích dẫn.
 */
export function markdownSupport(): Extension {
  return markdown({
    base: markdownLanguage,
    addKeymap: false,
    completeHTMLTags: false,
    extensions: { remove: DROPPED_BLOCKS }
  })
}

export type InlineKind = 'bold' | 'italic' | 'strikethrough'

/** Một đoạn nhấn mạnh hoàn chỉnh: có đủ cả hai ký tự phân cách mở và đóng. */
export interface InlineSpan {
  kind: InlineKind
  /** Toàn bộ phạm vi đoạn, bao gồm cả các ký tự phân cách. */
  from: number
  to: number
  /** Phạm vi văn bản nằm giữa hai ký tự phân cách. */
  innerFrom: number
  innerTo: number
}

/** Tiền tố dòng (`#`, `>`, `-`, `1.`) và phần nội dung văn bản sau tiền tố đối với tiêu đề và trích dẫn. */
export interface LineMark {
  kind: 'heading' | 'quote' | 'list'
  /** Phạm vi tiền tố và các khoảng trắng theo sau. */
  markFrom: number
  markTo: number
  /** Phần còn lại của dòng; rỗng (`contentFrom === contentTo`) nếu không có nội dung cần định dạng. */
  contentFrom: number
  contentTo: number
  /** Cấp độ tiêu đề, từ 1 đến 3. */
  level?: 1 | 2 | 3
}

export interface MarkdownScan {
  inline: InlineSpan[]
  lines: LineMark[]
}

export interface DocRange {
  from: number
  to: number
}

const INLINE_NODES: Record<string, { kind: InlineKind; mark: string }> = {
  StrongEmphasis: { kind: 'bold', mark: 'EmphasisMark' },
  Emphasis: { kind: 'italic', mark: 'EmphasisMark' },
  Strikethrough: { kind: 'strikethrough', mark: 'StrikethroughMark' }
}

/** Chỉ định dạng các tiêu đề cấp 1 đến 3 (`#`, `##`, `###`); các cấp sâu hơn giữ nguyên văn bản thuần. */
const HEADING_NODE = /^ATXHeading([1-3])$/

function isBlank(char: string): boolean {
  return char === ' ' || char === '\t'
}

/** Vị trí ngay sau các khoảng trắng theo sau `pos` trên cùng một dòng. */
function skipBlanks(doc: Text, pos: number): number {
  const line = doc.lineAt(pos)
  let offset = pos - line.from
  while (offset < line.text.length && isBlank(line.text[offset])) offset++
  return line.from + offset
}

/**
 * Đọc các đoạn nhấn mạnh nội dòng và tiền tố dòng chạm vào bất kỳ khoảng nào trong `ranges`.
 * Các nút bắt đầu trước khoảng và kết thúc bên trong được trả về trọn vẹn, và chỉ trả về một lần.
 */
export function scanMarkdown(
  tree: SyntaxTree,
  doc: Text,
  ranges: readonly DocRange[]
): MarkdownScan {
  const inline: InlineSpan[] = []
  const lines: LineMark[] = []
  const seen = new Set<string>()
  const quotesByLine = new Map<number, LineMark[]>()

  for (const { from, to } of ranges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        const key = node.name + ':' + node.from + ':' + node.to
        const emphasis = INLINE_NODES[node.name]
        if (emphasis) {
          if (seen.has(key)) return
          seen.add(key)
          const marks = node.node.getChildren(emphasis.mark)
          if (marks.length < 2) return
          const open = marks[0]
          const close = marks[marks.length - 1]
          if (open.to >= close.from) return
          inline.push({
            kind: emphasis.kind,
            from: node.from,
            to: node.to,
            innerFrom: open.to,
            innerTo: close.from
          })
          return
        }

        const heading = HEADING_NODE.exec(node.name)
        if (heading) {
          if (seen.has(key)) return
          seen.add(key)
          const mark = node.node.getChild('HeaderMark')
          if (!mark) return
          const markTo = skipBlanks(doc, mark.to)
          lines.push({
            kind: 'heading',
            markFrom: mark.from,
            markTo,
            contentFrom: markTo,
            contentTo: Math.max(markTo, node.to),
            level: Number(heading[1]) as 1 | 2 | 3
          })
          return
        }

        if (node.name === 'QuoteMark') {
          if (seen.has(key)) return
          seen.add(key)
          // `>_<` và `>.<` là biểu cảm khuôn mặt, không phải trích dẫn: trích dẫn cần có khoảng trắng ngay sau `>`.
          if (!isBlank(doc.sliceString(node.to, node.to + 1))) return
          const line = doc.lineAt(node.from)
          const markTo = skipBlanks(doc, node.to)
          const mark: LineMark = {
            kind: 'quote',
            markFrom: node.from,
            markTo,
            contentFrom: markTo,
            contentTo: markTo
          }
          const onLine = quotesByLine.get(line.number)
          if (onLine) onLine.push(mark)
          else quotesByLine.set(line.number, [mark])
          return
        }

        if (node.name === 'ListMark') {
          if (seen.has(key)) return
          seen.add(key)
          const markTo = skipBlanks(doc, node.to)
          lines.push({
            kind: 'list',
            markFrom: node.from,
            markTo,
            contentFrom: markTo,
            contentTo: markTo
          })
        }
      }
    })
  }

  // Trong `> > text`, chỉ tiền tố cuối cùng mang nội dung văn bản, tránh vẽ thanh trích dẫn lặp lại nhiều lần.
  for (const [lineNumber, marks] of quotesByLine) {
    marks.sort((a, b) => a.markFrom - b.markFrom)
    const last = marks[marks.length - 1]
    last.contentTo = doc.line(lineNumber).to
    lines.push(...marks)
  }

  inline.sort((a, b) => a.from - b.from || b.to - a.to)
  lines.sort((a, b) => a.markFrom - b.markFrom)
  return { inline, lines }
}
