import {
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
  type Text
} from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import {
  paragraphAt,
  splitParagraphs,
  type ParagraphSpan
} from '../../../../../shared/text/paragraphSpans'

/**
 * Liên kết vị trí giữa khung bản gốc và khung bản dịch theo số thứ tự đoạn (mỗi dòng không rỗng là một đoạn).
 */

/** Vị trí tương đối của khung nhìn: chỉ số đoạn và tỷ lệ cuộn trong đoạn từ 0 đến 1. */
export interface ParagraphAnchor {
  index: number
  fraction: number
}

// Văn bản không thay đổi theo từng phiên bản, cache spans theo đối tượng Text
const spansCache = new WeakMap<Text, ParagraphSpan[]>()

export function paragraphSpans(doc: Text): ParagraphSpan[] {
  let spans = spansCache.get(doc)
  if (!spans) {
    spans = splitParagraphs(doc.toString())
    spansCache.set(doc, spans)
  }
  return spans
}

/** Chỉ số đoạn chứa con trỏ soạn thảo, hoặc null nếu ở dòng trống hoặc văn bản rỗng. */
export function caretParagraph(state: EditorState): number | null {
  const head = state.selection.main.head
  if (state.doc.lineAt(head).text.trim() === '') return null
  const spans = paragraphSpans(state.doc)
  return spans.length === 0 ? null : paragraphAt(spans, head)
}

const setLinked = StateEffect.define<number | null>()
const linkedLine = Decoration.line({ class: 'cm-linked-paragraph' })

const linkedField = StateField.define<{ index: number | null; decorations: DecorationSet }>({
  create: () => ({ index: null, decorations: Decoration.none }),
  update(value, tr) {
    let index = value.index
    for (const effect of tr.effects) if (effect.is(setLinked)) index = effect.value
    if (index === value.index && !tr.docChanged) return value
    const span = index === null ? undefined : paragraphSpans(tr.state.doc)[index]
    const decorations = span
      ? Decoration.set([linkedLine.range(tr.state.doc.lineAt(span.lineStart).from)])
      : Decoration.none
    return { index, decorations }
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations)
})

const linkedTheme = EditorView.baseTheme({
  '.cm-linked-paragraph': { backgroundColor: 'var(--mira-bg-selected)' }
})

/** Đánh dấu đoạn tương ứng với con trỏ của khung bên cạnh. */
export const paragraphLink = (): Extension => [linkedField, linkedTheme]

export function linkParagraph(view: EditorView, index: number | null): void {
  if (view.state.field(linkedField).index === index) return
  view.dispatch({ effects: setLinked.of(index) })
}

/** Chiều cao từ đỉnh tài liệu đến mép trên của khung nhìn hiển thị. */
function viewTop(view: EditorView): number {
  return view.scrollDOM.getBoundingClientRect().top - view.documentTop
}

/** Tọa độ y bắt đầu của đoạn hiện tại và đoạn tiếp theo trong tài liệu. */
function paragraphBand(view: EditorView, spans: ParagraphSpan[], index: number): [number, number] {
  const top = view.lineBlockAt(spans[index].lineStart).top
  const next = spans[index + 1]
  const bottom = next ? view.lineBlockAt(next.lineStart).top : view.contentHeight
  return [top, Math.max(bottom, top + 1)]
}

export function topAnchor(view: EditorView): ParagraphAnchor | null {
  const spans = paragraphSpans(view.state.doc)
  if (spans.length === 0) return null
  const height = viewTop(view)
  const index = paragraphAt(spans, view.lineBlockAtHeight(Math.max(0, height)).from)
  const [top, bottom] = paragraphBand(view, spans, index)
  const fraction = Math.min(1, Math.max(0, (height - top) / (bottom - top)))
  return { index, fraction }
}

/** Cuộn để mép trên của khung nhìn khớp với neo đoạn; dừng ở cuối tài liệu nếu vượt quá. */
export function scrollToAnchor(view: EditorView, anchor: ParagraphAnchor): void {
  const spans = paragraphSpans(view.state.doc)
  if (spans.length === 0) return
  const index = Math.min(anchor.index, spans.length - 1)
  const fraction = anchor.index > index ? 1 : anchor.fraction
  const [top, bottom] = paragraphBand(view, spans, index)
  const offset = view.scrollDOM.scrollTop - viewTop(view)
  view.scrollDOM.scrollTop = top + fraction * (bottom - top) + offset
}
