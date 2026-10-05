import { create } from 'zustand'
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
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
  if (typeof window !== 'undefined' && window.mira?.setChromeTheme) {
    window.mira.setChromeTheme(theme).catch(() => undefined)
  }
}

export interface UiState {
  view: View
  beforeSettings: View | null
  sidebarOpen: boolean
  theme: Theme
  appVersion: string
  leaveGuardRegistry: LeaveGuardRegistry | null

  // Actions
  setLeaveGuardRegistry(registry: LeaveGuardRegistry | null): void
  navigate(next: View): Promise<boolean>
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
  beforeSettings: null,
  sidebarOpen: true,
  theme: 'light' as Theme,
  appVersion: '',
  leaveGuardRegistry: null
}

export const useUiStore = create<UiState>((set, get) => ({
  ...initialValues,
  theme: systemTheme(),

  setLeaveGuardRegistry: (registry) => {
    set({ leaveGuardRegistry: registry })
  },

  navigate: async (next: View) => {
    const { leaveGuardRegistry } = get()
    if (leaveGuardRegistry) {
      const proceed = await leaveGuardRegistry.confirmLeave()
      if (!proceed) return false
    }
    set({ view: next })
    return true
  },

  openSettings: async () => {
    const { view, navigate } = get()
    if (view.name === 'settings') return true
    set({ beforeSettings: view })
    return navigate({ name: 'settings' })
  },

  closeSettings: async () => {
    const { beforeSettings, navigate } = get()
    const back = beforeSettings ?? { name: 'library', section: 'all' }
    set({ beforeSettings: null })
    return navigate(back)
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },

  setTheme: (theme: Theme) => {
    applyThemeEffect(theme)
    set({ theme })
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyThemeEffect(next)
    set({ theme: next })
  },

  setAppVersion: (appVersion: string) => {
    set({ appVersion })
  },

  reset: () => {
    set({ ...initialValues, theme: systemTheme() })
  }
}))

registerStoreReset(() => {
  useUiStore.getState().reset()
})
