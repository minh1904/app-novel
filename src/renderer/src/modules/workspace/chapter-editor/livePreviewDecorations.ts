import { syntaxTree } from '@codemirror/language'
import type { Extension, Range, Text } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import {
  markdownSupport,
  scanMarkdown,
  type DocRange,
  type InlineKind,
  type SyntaxTree
} from './markdownSyntax'
import { selectionTouches } from './selectionTouches'

/**
 * Xem trước trực tiếp (Live Preview) cho bản dịch. Tiêu đề, trích dẫn và danh sách luôn giữ
 * ký tự đánh dấu làm mờ (`#`, `>`, ký tự đầu dòng danh sách không bị ẩn hoàn toàn).
 *
 * Các ký tự phân cách in đậm, in nghiêng và gạch ngang (`**`, `*`, `_`, `~~`) sẽ được ẩn khi
 * con trỏ và vùng chọn không chạm vào đoạn văn bản đó — `selectionTouches` quyết định theo từng đoạn.
 * Đảm bảo an toàn với bộ gõ IME: ký tự phân cách chỉ ẩn khi đoạn đã hoàn chỉnh và con trỏ đã rời đi.
 * Khi đang gõ bộ gõ IME trong đoạn, plugin bỏ qua việc dựng lại (`update.view.composing`).
 *
 * Các thành phần cú pháp được đọc từ cây cú pháp Markdown (`markdownSyntax.ts`) thay vì biểu thức chính quy,
 * giúp các đoạn mã, ký tự thoát, `snake_case` và URL không bị ảnh hưởng.
 */

/** Một decoration cần vẽ trước khi chuyển thành CodeMirror `Decoration`. */
export type PlanKind = 'marker' | 'hidden' | 'quote' | 'h1' | 'h2' | 'h3' | InlineKind

export interface PlanItem {
  from: number
  to: number
  kind: PlanKind
}

const HEADING_KINDS = { 1: 'h1', 2: 'h2', 3: 'h3' } as const

/**
 * Xác định các decoration cần vẽ trên các vùng `ranges`: ký tự phân cách nào hiển thị (làm mờ) và ký tự nào ẩn.
 * Hàm thuần túy — `touches` biểu thị trạng thái vùng chọn có chạm vào đoạn hay không, giúp kiểm thử dễ dàng.
 */
export function planLivePreview(
  tree: SyntaxTree,
  doc: Text,
  ranges: readonly DocRange[],
  touches: (from: number, to: number) => boolean
): PlanItem[] {
  const { inline, lines } = scanMarkdown(tree, doc, ranges)
  const plan: PlanItem[] = []

  for (const line of lines) {
    if (line.markFrom < line.markTo)
      plan.push({ from: line.markFrom, to: line.markTo, kind: 'marker' })
    if (line.contentFrom >= line.contentTo) continue
    if (line.kind === 'heading' && line.level) {
      plan.push({ from: line.contentFrom, to: line.contentTo, kind: HEADING_KINDS[line.level] })
    } else if (line.kind === 'quote') {
      plan.push({ from: line.contentFrom, to: line.contentTo, kind: 'quote' })
    }
  }

  for (const span of inline) {
    const delimiter: PlanKind = touches(span.from, span.to) ? 'marker' : 'hidden'
    plan.push({ from: span.from, to: span.innerFrom, kind: delimiter })
    plan.push({ from: span.innerFrom, to: span.innerTo, kind: span.kind })
    plan.push({ from: span.innerTo, to: span.to, kind: delimiter })
  }
  return plan
}

const DECORATIONS: Record<PlanKind, Decoration> = {
  marker: Decoration.mark({ class: 'cm-livepreview-marker' }),
  /** Không dùng widget: replace rỗng loại bỏ ký tự phân cách khỏi layout mà không thêm phần tử thay thế. */
  hidden: Decoration.replace({}),
  bold: Decoration.mark({ class: 'cm-livepreview-bold' }),
  italic: Decoration.mark({ class: 'cm-livepreview-italic' }),
  strikethrough: Decoration.mark({ class: 'cm-livepreview-strikethrough' }),
  quote: Decoration.mark({ class: 'cm-livepreview-quote' }),
  h1: Decoration.mark({ class: 'cm-livepreview-h1' }),
  h2: Decoration.mark({ class: 'cm-livepreview-h2' }),
  h3: Decoration.mark({ class: 'cm-livepreview-h3' })
}

function build(view: EditorView): DecorationSet {
  const plan = planLivePreview(
    syntaxTree(view.state),
    view.state.doc,
    view.visibleRanges,
    (from, to) => selectionTouches(view, from, to)
  )
  const ranges: Range<Decoration>[] = []
  for (const item of plan) {
    if (item.from < item.to) ranges.push(DECORATIONS[item.kind].range(item.from, item.to))
  }
  return Decoration.set(ranges, true)
}

const livePreviewMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = build(view)
    }

    update(update: ViewUpdate): void {
      // Khi bộ gõ IME đang soạn thảo, giữ nguyên vị trí các mark theo thay đổi văn bản.
      if (update.view.composing || update.view.compositionStarted) {
        this.decorations = this.decorations.map(update.changes)
        return
      }
      // Di chuyển con trỏ có thể vượt qua ranh giới của đoạn, do đó cần cập nhật lại hiển thị
      // ký tự phân cách ngay cả khi văn bản không đổi. Parser phân tích nền cũng có thể cập nhật
      // cây cú pháp cho tài liệu lớn, đòi hỏi phải dựng lại decoration.
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

const livePreviewTheme = EditorView.baseTheme({
  '.cm-livepreview-marker': { opacity: '0.45' },
  '.cm-livepreview-bold': { fontWeight: '700' },
  '.cm-livepreview-italic': { fontStyle: 'italic' },
  '.cm-livepreview-strikethrough': { textDecoration: 'line-through' },
  '.cm-livepreview-quote': {
    borderLeft: '2px solid var(--mira-text-muted)',
    paddingLeft: '8px',
    marginLeft: '2px',
    color: 'var(--mira-text-muted)'
  },
  // Tỉ lệ kích thước tiêu đề tương đối so với cỡ chữ 16px: 1.618 / 1.462 / 1.318 em.
  '.cm-livepreview-h1': {
    fontSize: '1.618em',
    fontWeight: '700',
    lineHeight: '1.2',
    letterSpacing: '-0.015em'
  },
  '.cm-livepreview-h2': { fontSize: '1.462em', fontWeight: '600', lineHeight: '1.2' },
  '.cm-livepreview-h3': { fontSize: '1.318em', fontWeight: '600', lineHeight: '1.3' }
})

export function livePreviewDecorations(): Extension {
  return [markdownSupport(), livePreviewMarks, livePreviewTheme]
}
