import { create } from 'zustand'
import { registerStoreReset } from '../../lib/testing/resetStores'

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

const THEME_KEY = 'mira.theme'

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia)
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return 'light'
}

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
    // The choice still holds until the app closes.
  }
}

export function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? systemTheme() : preference
}

export function applyThemeEffect(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
  if (typeof window !== 'undefined' && window.mira?.setChromeTheme)
    window.mira.setChromeTheme(theme).catch(() => undefined)
}

interface ThemeState {
  theme: Theme
  themePreference: ThemePreference
  setTheme(theme: Theme): void
  setThemePreference(preference: ThemePreference): void
  syncSystemTheme(): void
  toggleTheme(): void
  reset(): void
}

const startPreference = readThemePreference()
export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: startPreference,
  theme: resolveTheme(startPreference),
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
    if (theme !== get().theme) {
      applyThemeEffect(theme)
      set({ theme })
    }
  },
  toggleTheme: () => get().setThemePreference(get().theme === 'dark' ? 'light' : 'dark'),
  reset: () => set({ themePreference: 'system', theme: systemTheme() })
}))

registerStoreReset(() => useThemeStore.getState().reset())
