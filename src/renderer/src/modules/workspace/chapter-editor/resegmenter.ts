import type { EditorState, Extension, TransactionSpec } from '@codemirror/state'
import { ViewPlugin } from '@codemirror/view'
import type { SegmentLanguage } from '../../../../../shared/segmentation/segmenter'
import { resegmentSpec } from './editorState'

/**
 * Xử lý tự động tách lại segment sau khi chỉnh sửa văn bản.
 * Chờ người dùng gõ xong và bộ gõ IME hoàn tất để tránh mất hoặc trùng ký tự.
 */

/** Giao diện rút gọn của EditorView phục vụ kiểm thử đơn vị. */
export interface ViewLike {
  readonly state: EditorState
  readonly composing: boolean
  readonly compositionStarted: boolean
  dispatch(spec: TransactionSpec): void
}

export const isComposing = (view: ViewLike): boolean => view.composing || view.compositionStarted

/** Thực hiện tách lại segment ngay nếu không bận bộ gõ IME. */
export function resegmentNow(view: ViewLike, lang: SegmentLanguage): 'done' | 'composing' {
  if (isComposing(view)) return 'composing'
  const spec = resegmentSpec(view.state, lang)
  if (spec !== null) view.dispatch(spec)
  return 'done'
}

/** Chờ cho đến khi bộ gõ IME hoàn tất nhập ký tự. */
export function afterComposition(view: ViewLike, pollMs = 30): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      if (isComposing(view)) setTimeout(check, pollMs)
      else resolve()
    }
    check()
  })
}

export interface Timers {
  set(callback: () => void, ms: number): unknown
  clear(handle: unknown): void
}

const realTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
}

/** Tự động tách lại segment khi người dùng ngừng gõ sau một khoảng thời gian chờ `delay` ms. */
export class IdleResegmenter {
  private handle: unknown = null

  constructor(
    private readonly view: ViewLike,
    private readonly lang: SegmentLanguage,
    private readonly delay = 800,
    private readonly timers: Timers = realTimers,
    /** Trả về true nếu tài nguyên đang bị khóa (ví dụ: đang lưu dữ liệu). */
    private readonly isBlocked: () => boolean = () => false
  ) {}

  /** Gọi mỗi khi có thay đổi văn bản để đếm lại thời gian chờ. */
  touch(): void {
    if (this.handle !== null) this.timers.clear(this.handle)
    this.handle = this.timers.set(() => {
      this.handle = null
      if (this.isBlocked() || resegmentNow(this.view, this.lang) === 'composing') this.touch()
    }, this.delay)
  }

  destroy(): void {
    if (this.handle !== null) this.timers.clear(this.handle)
    this.handle = null
  }
}

export function idleResegment(
  lang: SegmentLanguage,
  delay = 800,
  isBlocked: () => boolean = () => false
): Extension {
  return ViewPlugin.define((view) => {
    const idle = new IdleResegmenter(view, lang, delay, undefined, isBlocked)
    return {
      update(update) {
        if (update.docChanged) idle.touch()
      },
      destroy() {
        idle.destroy()
      }
    }
  })
}
