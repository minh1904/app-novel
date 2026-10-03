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
    // The window buttons are painted by the OS over the top bar, so main has to be told which
    // colours match. Purely cosmetic: if it fails the buttons keep the colours they had.
    window.mira.setChromeTheme(theme).catch(() => undefined)
  }, [theme])

  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))]
}
