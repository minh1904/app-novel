import { useThemeStore, type Theme } from '../components/ui/themeStore'

export type { Theme }

// Hook lấy theme giao diện hiện tại và hàm chuyển đổi theme.
export function useTheme(): [Theme, () => void] {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return [theme, toggleTheme]
}
