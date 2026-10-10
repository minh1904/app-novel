import { useThemeStore, type Theme } from '../components/ui/themeStore'

export type { Theme }

// The default theme is still an open product question; following Windows is a placeholder.
export function useTheme(): [Theme, () => void] {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return [theme, toggleTheme]
}
