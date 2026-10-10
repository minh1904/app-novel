import { create } from 'zustand'
import type { WorkspaceState, WorkspaceTab } from '../../../shared/contracts/workspace'
import type { LeaveGuardRegistry } from '../features/editor/leaveGuard'
import {
  DEFAULT_SETTINGS_LOCATION,
  normalizeLocation,
  type SettingsLocation
} from '../features/settings/settingsNav'
import { registerStoreReset } from './resetStores'

export type Theme = 'light' | 'dark'
/** What the person picked in Settings › Giao diện; `system` follows Windows. */
export type ThemePreference = Theme | 'system'

const THEME_KEY = 'mira.theme'
const NAV_KEY = 'mira.navCollapsed'

/** Whether the app sidebar was left as a rail; a per-device convenience like the theme. */
function readNavCollapsed(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(NAV_KEY) === '1'
  } catch {
    return false
  }
}

function writeNavCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(NAV_KEY, collapsed ? '1' : '0')
  } catch {
    // Not saved: the rail still holds until the app closes.
  }
}

/** A per-device convenience, so storage that throws or is empty means "follow the system". */
function readThemePreference(): ThemePreference {
  try {
    const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
  } catch {
    return 'system'
  }
}

function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference)
  } catch {
    // Not saved: the choice still holds until the app closes.
  }
}

export function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? systemTheme() : preference
}

/** The app-level screens of the sidebar (docs/modules/workspace/app-level-features.md). */
export type AppPage = 'home' | 'library' | 'jobs' | 'updates' | 'shared' | 'style' | 'assistant'

export type View =
  | { name: AppPage }
  | { name: 'create' }
  | { name: 'work'; workId: string }
  | { name: 'chapter'; workId: string; chapterId: string }

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
  /** Where the Settings modal is open, or `null` when it is closed. It sits over the view, not in place of it. */
  settings: SettingsLocation | null
  /** The onboarding card was asked for (model menu "Thêm nhà cung cấp"); it also opens by itself when there is no connection. */
  onboardingOpen: boolean
  sidebarOpen: boolean
  /** The app sidebar is folded to its icon rail. */
  navCollapsed: boolean
  /** The search and command palette (Ctrl K). */
  paletteOpen: boolean
  theme: Theme
  themePreference: ThemePreference
  appVersion: string
  leaveGuardRegistry: LeaveGuardRegistry | null

  setLeaveGuardRegistry(registry: LeaveGuardRegistry | null): void
  navigate(next: View): Promise<boolean>
  activateTab(workId: string): void
  closeTab(workId: string): Promise<boolean>
  setWorkArea(workId: string, areaId: string): void
  restoreWorkspace(state: WorkspaceState, notices: string[]): void
  setWorkspaceNotice(notice: string | null): void
  openSettings(location?: SettingsLocation): void
  closeSettings(): void
  setOnboardingOpen(open: boolean): void
  toggleSidebar(): void
  setSidebarOpen(open: boolean): void
  toggleNav(): void
  setPaletteOpen(open: boolean): void
  setTheme(theme: Theme): void
  setThemePreference(preference: ThemePreference): void
  /** Follows a Windows light/dark switch while the preference is `system`. */
  syncSystemTheme(): void
  toggleTheme(): void
  setAppVersion(version: string): void
  reset(): void
}

const initialValues = {
  view: { name: 'home' } as View,
  tabs: [] as WorkspaceTab[],
  activeWorkId: null as string | null,
  workspaceReady: false,
  workspaceNotice: null as string | null,
  settings: null as SettingsLocation | null,
  onboardingOpen: false,
  sidebarOpen: true,
  navCollapsed: false,
  paletteOpen: false,
  theme: 'light' as Theme,
  themePreference: 'system' as ThemePreference,
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

const startPreference = readThemePreference()

export const useUiStore = create<UiState>((set, get) => ({
  ...initialValues,
  navCollapsed: readNavCollapsed(),
  themePreference: startPreference,
  theme: resolveTheme(startPreference),

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
    set({
      tabs,
      activeWorkId:
        current.activeWorkId === workId
          ? (fallback?.workId ?? tabs[0]?.workId ?? null)
          : current.activeWorkId,
      view: wasVisible ? (fallback ? viewOf(fallback) : { name: 'home' }) : current.view
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
      view: selected ? viewOf(selected) : { name: 'home' },
      workspaceReady: true,
      workspaceNotice: notices.join(' ') || null
    })
  },
  setWorkspaceNotice: (workspaceNotice) => set({ workspaceNotice }),

  openSettings: (location) =>
    set({ settings: normalizeLocation(location ?? get().settings ?? DEFAULT_SETTINGS_LOCATION) }),
  closeSettings: () => set({ settings: null }),
  setOnboardingOpen: (onboardingOpen) => set({ onboardingOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleNav: () => {
    const navCollapsed = !get().navCollapsed
    writeNavCollapsed(navCollapsed)
    set({ navCollapsed })
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setTheme: (theme) => {
    applyThemeEffect(theme)
    set({ theme })
  },
  setThemePreference: (themePreference) => {
    writeThemePreference(themePreference)
    const theme = resolveTheme(themePreference)
    applyThemeEffect(theme)
    set({ themePreference, theme })
  },
  syncSystemTheme: () => {
    if (get().themePreference !== 'system') return
    const theme = systemTheme()
    if (theme === get().theme) return
    applyThemeEffect(theme)
    set({ theme })
  },
  toggleTheme: () => {
    get().setThemePreference(get().theme === 'dark' ? 'light' : 'dark')
  },
  setAppVersion: (appVersion) => set({ appVersion }),
  reset: () => {
    pendingSave = Promise.resolve()
    set({ ...initialValues, theme: systemTheme() })
  }
}))

registerStoreReset(() => useUiStore.getState().reset())
