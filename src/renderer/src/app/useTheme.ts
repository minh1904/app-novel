import { useUiStore, type Theme } from '../stores/uiStore'

export type { Theme }

// The default theme is still an open product question; following Windows is a placeholder.
export function useTheme(): [Theme, () => void] {
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)

  return [theme, toggleTheme]
}
