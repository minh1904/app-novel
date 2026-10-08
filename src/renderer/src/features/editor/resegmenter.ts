import type { EditorState, Extension, TransactionSpec } from '@codemirror/state'
import { ViewPlugin } from '@codemirror/view'
import type { SegmentLanguage } from '../../../../shared/segmentation/segmenter'
import { resegmentSpec } from './editorState'

/**
 * When the segments of an edited text are split again. Never while the input method holds text it
 * has not committed: changing anything the browser is composing in is what loses or doubles
 * characters, so the work waits until the composition ends.
 */

/** The part of an `EditorView` this needs, so the rules can be tested without a browser. */
export interface ViewLike {
  readonly state: EditorState
  readonly composing: boolean
  readonly compositionStarted: boolean
  dispatch(spec: TransactionSpec): void
}

export const isComposing = (view: ViewLike): boolean => view.composing || view.compositionStarted

/** Splits again now unless a composition is under way; says which. */
export function resegmentNow(view: ViewLike, lang: SegmentLanguage): 'done' | 'composing' {
  if (isComposing(view)) return 'composing'
  const spec = resegmentSpec(view.state, lang)
  if (spec !== null) view.dispatch(spec)
  return 'done'
}

/** Resolves once no composition is under way (at once when none is). */
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

/** Splits again after the user has stopped typing for `delay` ms, and again later if a composition was under way. */
export class IdleResegmenter {
  private handle: unknown = null

  constructor(
    private readonly view: ViewLike,
    private readonly lang: SegmentLanguage,
    private readonly delay = 800,
    private readonly timers: Timers = realTimers,
    /** True while something else (a save) is using the segments: try again later. */
    private readonly isBlocked: () => boolean = () => false
  ) {}

  /** Call on every edit: the clock starts over. */
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
