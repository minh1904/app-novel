import { create } from 'zustand'
import { registerStoreReset } from '../../../lib/testing/resetStores'

/**
 * Trạng thái bố cục các khung soạn thảo chương: thu gọn khung nguồn/đích, tỷ lệ độ rộng
 * và trạng thái cuộn đồng bộ. Lưu trữ theo thiết bị để phù hợp với thói quen và kích thước màn hình.
 */
export interface PaneLayout {
  sourceCollapsed: boolean
  targetCollapsed: boolean
  /** Tỷ lệ chiều rộng của khung bản gốc (từ 0.2 đến 0.8). */
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

/** Đọc cấu hình bố cục từ localStorage; nếu lỗi hoặc chưa có dữ liệu thì dùng giá trị mặc định. */
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
    // Bỏ qua lỗi ghi localStorage; bố cục vẫn duy trì trong phiên làm việc hiện tại.
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
