import { create } from 'zustand'
import { registerStoreReset } from '../../../lib/testing/resetStores'

/**
 * How the translator arranged the chapter panes: which of them are folded away, how wide the
 * source is,
 * and whether the two panes scroll together. One arrangement for every chapter and work, kept on this
 * device, because it follows the translator's screen and habits rather than the text.
 */
export interface PaneLayout {
  sourceCollapsed: boolean
  targetCollapsed: boolean
  /** Share of the editors' width the source pane takes when open, 0.2 to 0.8. */
  sourceRatio: number
  syncScroll: boolean
}

interface PaneLayoutStore extends PaneLayout {
  setSourceCollapsed(collapsed: boolean): void
  setTargetCollapsed(collapsed: boolean): void
  setSourceRatio(ratio: number): void
  setSyncScroll(sync: boolean): void
}

const KEY = 'mira.paneLayout'
export const MIN_SOURCE_RATIO = 0.2
export const MAX_SOURCE_RATIO = 0.8
const DEFAULTS: PaneLayout = {
  sourceCollapsed: false,
  targetCollapsed: false,
  sourceRatio: 0.5,
  syncScroll: true
}

export const clampRatio = (ratio: number): number =>
  Math.min(MAX_SOURCE_RATIO, Math.max(MIN_SOURCE_RATIO, ratio))

/** A per-device convenience: storage that throws, is empty or holds junk means the defaults. */
function read(): PaneLayout {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    const value: unknown = raw ? JSON.parse(raw) : null
    if (typeof value !== 'object' || value === null) return DEFAULTS
    const saved = value as Partial<Record<keyof PaneLayout, unknown>>
    return {
      sourceCollapsed:
        typeof saved.sourceCollapsed === 'boolean'
          ? saved.sourceCollapsed
          : DEFAULTS.sourceCollapsed,
      targetCollapsed:
        typeof saved.targetCollapsed === 'boolean'
          ? saved.targetCollapsed
          : DEFAULTS.targetCollapsed,
      sourceRatio:
        typeof saved.sourceRatio === 'number' && Number.isFinite(saved.sourceRatio)
          ? clampRatio(saved.sourceRatio)
          : DEFAULTS.sourceRatio,
      syncScroll: typeof saved.syncScroll === 'boolean' ? saved.syncScroll : DEFAULTS.syncScroll
    }
  } catch {
    return DEFAULTS
  }
}

function write(layout: PaneLayout): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
  } catch {
    // Not saved: the arrangement still holds until the app closes.
  }
}

export const usePaneLayoutStore = create<PaneLayoutStore>((set) => ({
  ...read(),
  setSourceCollapsed: (sourceCollapsed) => set({ sourceCollapsed }),
  setTargetCollapsed: (targetCollapsed) => set({ targetCollapsed }),
  setSourceRatio: (ratio) => set({ sourceRatio: clampRatio(ratio) }),
  setSyncScroll: (syncScroll) => set({ syncScroll })
}))

usePaneLayoutStore.subscribe((state) =>
  write({
    sourceCollapsed: state.sourceCollapsed,
    targetCollapsed: state.targetCollapsed,
    sourceRatio: state.sourceRatio,
    syncScroll: state.syncScroll
  })
)

registerStoreReset(() => {
  usePaneLayoutStore.setState(DEFAULTS)
})
