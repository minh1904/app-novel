import { create } from 'zustand'
import type { WorkspaceState, WorkspaceTab } from '../../../shared/contracts/workspace'
import type { LibrarySection } from '../features/library/LibrarySidebar'
import type { LeaveGuardRegistry } from '../features/editor/leaveGuard'
import { registerStoreReset } from './resetStores'

export type Theme = 'light' | 'dark'

export type View =
  | { name: 'library'; section: LibrarySection }
  | { name: 'create' }
  | { name: 'work'; workId: string }
  | { name: 'chapter'; workId: string; chapterId: string }
  | { name: 'settings' }

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function applyThemeEffect(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
  if (typeof window !== 'undefined' && window.mira?.setChromeTheme) {
    window.mira.setChromeTheme(theme).catch(() => undefined)
  }
}

function viewOf(tab: WorkspaceTab): View {
  return tab.location.name === 'chapter'
    ? { name: 'chapter', workId: tab.workId, chapterId: tab.location.chapterId }
    : { name: 'work', workId: tab.workId }
}

export interface UiState {
  view: View
  tabs: WorkspaceTab[]
  activeWorkId: string | null
  workspaceReady: boolean
  workspaceNotice: string | null
  beforeSettings: View | null
  sidebarOpen: boolean
  theme: Theme
  appVersion: string
  leaveGuardRegistry: LeaveGuardRegistry | null

  setLeaveGuardRegistry(registry: LeaveGuardRegistry | null): void
  navigate(next: View): Promise<boolean>
  activateTab(workId: string): void
  closeTab(workId: string): Promise<boolean>
  setWorkArea(workId: string, areaId: string): void
  restoreWorkspace(state: WorkspaceState, notices: string[]): void
  setWorkspaceNotice(notice: string | null): void
  openSettings(): Promise<boolean>
  closeSettings(): Promise<boolean>
  toggleSidebar(): void
  setSidebarOpen(open: boolean): void
  setTheme(theme: Theme): void
  toggleTheme(): void
  setAppVersion(version: string): void
  reset(): void
}

const initialValues = {
  view: { name: 'library', section: 'all' } as View,
  tabs: [] as WorkspaceTab[],
  activeWorkId: null as string | null,
  workspaceReady: false,
  workspaceNotice: null as string | null,
  beforeSettings: null as View | null,
  sidebarOpen: true,
  theme: 'light' as Theme,
  appVersion: '',
  leaveGuardRegistry: null as LeaveGuardRegistry | null
}

let pendingSave = Promise.resolve()

function saveWorkspace(state: UiState): Promise<void> {
  if (!state.workspaceReady || typeof window === 'undefined' || !window.mira?.workspace)
    return Promise.resolve()
  const snapshot: WorkspaceState = {
    version: 1,
    tabs: state.tabs,
    activeWorkId: state.activeWorkId
  }
  pendingSave = pendingSave
    .then(async () => {
      const result = await window.mira.workspace.save(snapshot)
      if (!result.ok)
        useUiStore
          .getState()
          .setWorkspaceNotice('Không lưu được phiên tab: ' + result.error.message)
    })
    .catch(() => {
      useUiStore
        .getState()
        .setWorkspaceNotice('Không lưu được phiên tab. Dữ liệu truyện vẫn an toàn.')
    })
  return pendingSave
}

export const useUiStore = create<UiState>((set, get) => ({
  ...initialValues,
  theme: systemTheme(),

  setLeaveGuardRegistry: (registry) => set({ leaveGuardRegistry: registry }),

  navigate: async (next) => {
    const { view, leaveGuardRegistry } = get()
    const leavingChapter =
      view.name === 'chapter' &&
      ((next.name === 'work' && next.workId === view.workId) ||
        (next.name === 'chapter' &&
          next.workId === view.workId &&
          next.chapterId !== view.chapterId))
    if (
      leavingChapter &&
      leaveGuardRegistry &&
      !(await leaveGuardRegistry.confirmLeave({ workId: view.workId }))
    )
      return false

    if (next.name === 'work' || next.name === 'chapter') {
      const current = get()
      const existing = current.tabs.find((tab) => tab.workId === next.workId)
      const tab: WorkspaceTab = {
        workId: next.workId,
        areaId: existing?.areaId ?? 'chapters',
        location:
          next.name === 'work' ? { name: 'work' } : { name: 'chapter', chapterId: next.chapterId }
      }
      set({
        view: next,
        activeWorkId: next.workId,
        tabs: existing
          ? current.tabs.map((item) => (item.workId === next.workId ? tab : item))
          : [...current.tabs, tab]
      })
      await saveWorkspace(get())
    } else {
      set({ view: next })
    }
    return true
  },

  activateTab: (workId) => {
    const tab = get().tabs.find((item) => item.workId === workId)
    if (!tab) return
    set({ view: viewOf(tab), activeWorkId: workId })
    void saveWorkspace(get())
  },

  closeTab: async (workId) => {
    const current = get()
    if (current.leaveGuardRegistry && !(await current.leaveGuardRegistry.confirmLeave({ workId })))
      return false
    const index = current.tabs.findIndex((tab) => tab.workId === workId)
    if (index < 0) return false
    const tabs = current.tabs.filter((tab) => tab.workId !== workId)
    const wasVisible =
      (current.view.name === 'work' || current.view.name === 'chapter') &&
      current.view.workId === workId
    const fallback = wasVisible ? tabs[Math.min(index, tabs.length - 1)] : undefined
    const beforeSettings =
      current.beforeSettings &&
      (current.beforeSettings.name === 'work' || current.beforeSettings.name === 'chapter') &&
      current.beforeSettings.workId === workId
        ? tabs[Math.min(index, tabs.length - 1)]
          ? viewOf(tabs[Math.min(index, tabs.length - 1)]!)
          : ({ name: 'library', section: 'all' } as View)
        : current.beforeSettings
    set({
      tabs,
      beforeSettings,
      activeWorkId:
        current.activeWorkId === workId
          ? (fallback?.workId ?? tabs[0]?.workId ?? null)
          : current.activeWorkId,
      view: wasVisible
        ? fallback
          ? viewOf(fallback)
          : { name: 'library', section: 'all' }
        : current.view
    })
    await saveWorkspace(get())
    return true
  },

  setWorkArea: (workId, areaId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.workId === workId ? { ...tab, areaId } : tab))
    }))
    void saveWorkspace(get())
  },

  restoreWorkspace: (state, notices) => {
    const selected = state.tabs.find((tab) => tab.workId === state.activeWorkId) ?? state.tabs[0]
    set({
      tabs: state.tabs,
      activeWorkId: selected?.workId ?? null,
      view: selected ? viewOf(selected) : { name: 'library', section: 'all' },
      workspaceReady: true,
      workspaceNotice: notices.join(' ') || null
    })
  },
  setWorkspaceNotice: (workspaceNotice) => set({ workspaceNotice }),

  openSettings: async () => {
    const { view } = get()
    if (view.name === 'settings') return true
    set({ beforeSettings: view, view: { name: 'settings' } })
    return true
  },
  closeSettings: async () => {
    const { beforeSettings } = get()
    set({ beforeSettings: null, view: beforeSettings ?? { name: 'library', section: 'all' } })
    return true
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => {
    applyThemeEffect(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyThemeEffect(theme)
    set({ theme })
  },
  setAppVersion: (appVersion) => set({ appVersion }),
  reset: () => {
    pendingSave = Promise.resolve()
    set({ ...initialValues, theme: systemTheme() })
  }
}))

registerStoreReset(() => useUiStore.getState().reset())
