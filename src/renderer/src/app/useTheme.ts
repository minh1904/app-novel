import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// The default theme is still an open product question; following Windows is a placeholder.
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(systemTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))]
}
