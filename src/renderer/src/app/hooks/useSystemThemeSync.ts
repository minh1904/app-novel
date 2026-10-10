import { useEffect } from 'react'
import { useThemeStore } from '../../components/ui/themeStore'

export function useSystemThemeSync(): void {
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = (): void => useThemeStore.getState().syncSystemTheme()
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])
}
