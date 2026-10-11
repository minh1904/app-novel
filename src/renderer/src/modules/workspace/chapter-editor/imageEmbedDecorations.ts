import { Facet, RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import type { Result } from '../../../../../shared/contracts/result'
import { IMAGE_MIN_WIDTH } from '../../../../../shared/contracts/images'
import { selectionTouches } from './selectionTouches'

/**
 * Ảnh nhúng trong bản dịch (`![[id]]` hoặc `![[id|width]]` khi thay đổi kích thước) được hiển thị
 * thành ảnh thật trong chế độ xem trực tiếp. Sử dụng decoration dạng widget thay vì mark.
 * Widget chỉ bao phủ token hoàn chỉnh (`![[` … `]]`) khi con trỏ và vùng chọn không chạm vào,
 * đảm bảo không xung đột với bộ gõ IME. Khi con trỏ chạm vào token, cú pháp hiển thị lại ở dạng văn bản thuần.
 */

export interface ImageStore {
  /** Nén, tải lên và trả về cú pháp nhúng Markdown (`![[id]]`), hoặc trả về lỗi nếu không thành công. */
  insert(file: File): Promise<Result<string>>
  /** Trả về dữ liệu ảnh dưới dạng data URL, hoặc null nếu không tồn tại. */
  get(imageId: string): Promise<Result<string | null>>
}

export const imageStoreFacet = Facet.define<ImageStore, ImageStore | null>({
  combine: (values) => values[0] ?? null
})

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export const EMBED_RE = new RegExp('!\\[\\[(' + UUID + ')(?:\\|(\\d+))?\\]\\]', 'gi')

type CacheEntry = 'loading' | 'error' | string

const imageLoaded = StateEffect.define<{ id: string; src: 'error' | string }>()

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Thay thế hoặc thêm hậu tố `|width` vào token nhúng ảnh và cập nhật vào tài liệu. */
function writeWidth(view: EditorView, from: number, to: number, id: string, width: number): void {
  view.dispatch({ changes: { from, to, insert: '![[' + id + '|' + Math.round(width) + ']]' } })
}

class ImageWidget extends WidgetType {
  constructor(
    private readonly id: string,
    private readonly width: number | null,
    private readonly src: CacheEntry,
    private readonly from: number,
    private readonly to: number
  ) {
    super()
  }

  eq(other: ImageWidget): boolean {
    return (
      other.id === this.id &&
      other.width === this.width &&
      other.src === this.src &&
      other.from === this.from &&
      other.to === this.to
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'cm-image-embed'

    if (this.src === 'loading') {
      wrap.classList.add('cm-image-embed-placeholder')
      wrap.textContent = 'Đang tải ảnh…'
      return wrap
    }
    if (this.src === 'error') {
      wrap.classList.add('cm-image-embed-placeholder', 'cm-image-embed-error')
      wrap.textContent = 'Không tìm thấy ảnh'
      return wrap
    }

    const img = document.createElement('img')
    img.src = this.src
    img.alt = ''
    img.draggable = false
    if (this.width !== null) img.style.width = this.width + 'px'
    wrap.appendChild(img)

    const handle = document.createElement('span')
    handle.className = 'cm-image-embed-handle'
    handle.setAttribute('aria-hidden', 'true')
    wrap.appendChild(handle)

    let startX = 0
    let startWidth = 0
    let finalWidth = this.width

    const onPointerMove = (event: PointerEvent): void => {
      const max = Math.max(IMAGE_MIN_WIDTH, view.contentDOM.clientWidth)
      finalWidth = clamp(startWidth + (event.clientX - startX), IMAGE_MIN_WIDTH, max)
      img.style.width = finalWidth + 'px'
    }
    const onPointerUp = (): void => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      if (finalWidth !== null && finalWidth !== this.width) {
        writeWidth(view, this.from, this.to, this.id, finalWidth)
      }
    }
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      startX = event.clientX
      startWidth = img.getBoundingClientRect().width
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    })

    return wrap
  }

  ignoreEvent(): boolean {
    return false
  }
}

function build(
  view: EditorView,
  cache: Map<string, CacheEntry>,
  requestLoad: (id: string) => void
): DecorationSet {
  const store = view.state.facet(imageStoreFacet)
  const builder = new RangeSetBuilder<Decoration>()
  let covered = 0
  for (const { from, to } of view.visibleRanges) {
    if (to <= covered) continue
    const scanFrom = Math.max(from, covered)
    const text = view.state.sliceDoc(scanFrom, to)
    EMBED_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = EMBED_RE.exec(text))) {
      const start = scanFrom + match.index
      if (start < covered) continue
      const end = start + match[0].length
      covered = end
      if (store === null || selectionTouches(view, start, end)) continue

      const id = match[1].toLowerCase()
      const width = match[2] ? Number(match[2]) : null
      let entry = cache.get(id)
      if (entry === undefined) {
        entry = 'loading'
        cache.set(id, entry)
        requestLoad(id)
      }
      builder.add(
        start,
        end,
        Decoration.replace({ widget: new ImageWidget(id, width, entry, start, end) })
      )
    }
  }
  return builder.finish()
}

const imageMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    private readonly cache = new Map<string, CacheEntry>()

    constructor(private readonly view: EditorView) {
      this.decorations = build(view, this.cache, this.requestLoad)
    }

    requestLoad = (id: string): void => {
      const store = this.view.state.facet(imageStoreFacet)
      if (!store) return
      void store.get(id).then((result) => {
        const src = result.ok ? (result.value ?? 'error') : 'error'
        this.view.dispatch({ effects: imageLoaded.of({ id, src }) })
      })
    }

    update(update: ViewUpdate): void {
      let loaded = false
      for (const tr of update.transactions) {
        for (const effect of tr.effects) {
          if (effect.is(imageLoaded)) {
            this.cache.set(effect.value.id, effect.value.src)
            loaded = true
          }
        }
      }
      if (update.view.composing || update.view.compositionStarted) {
        this.decorations = this.decorations.map(update.changes)
        return
      }
      if (update.docChanged || update.viewportChanged || update.selectionSet || loaded) {
        this.decorations = build(update.view, this.cache, this.requestLoad)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

const imageTheme = EditorView.baseTheme({
  '.cm-image-embed': { position: 'relative', display: 'inline-block', verticalAlign: 'middle' },
  '.cm-image-embed img': {
    display: 'block',
    maxWidth: '100%',
    borderRadius: 'var(--mira-radius-xs)'
  },
  '.cm-image-embed-placeholder': {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 'var(--mira-radius-xs)',
    border: '1px dashed var(--mira-text-muted)',
    color: 'var(--mira-text-muted)',
    fontSize: '12px'
  },
  '.cm-image-embed-error': { borderColor: 'var(--mira-error)' },
  '.cm-image-embed-handle': {
    position: 'absolute',
    right: '-3px',
    bottom: '-3px',
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    background: 'var(--mira-ring)',
    cursor: 'nwse-resize',
    opacity: '0',
    transition: 'opacity 120ms'
  },
  '.cm-image-embed:hover .cm-image-embed-handle': { opacity: '1' }
})

export function imageEmbedDecorations(store: ImageStore): Extension {
  return [imageStoreFacet.of(store), imageMarks, imageTheme]
}
