import type { ChromeTheme } from '../../shared/contracts/desktopApi'
import { ZOOM_FACTOR } from './zoom'

/**
 * The page's own top bar is the title bar: the OS draws only its three window buttons, over the right
 * end of that bar (the window controls overlay), instead of a separate strip above the page. macOS
 * keeps its native frame, which already puts its buttons in a unified bar.
 */
export const OVERLAY_TITLE_BAR = process.platform !== 'darwin'

/** `--mira-header-height` in styles/tokens/foundation.css, before the page zoom. */
export const HEADER_HEIGHT = 40

/**
 * Height of the buttons in window pixels: the bar after the page zoom, less its bottom border row, so
 * the hairline under the bar runs on under the buttons.
 */
export const TOP_BAR_HEIGHT = Math.round(HEADER_HEIGHT * ZOOM_FACTOR) - 1

/**
 * What the window buttons wear, per theme: the bar's own colour (`--mira-bg-surface`) behind them, so
 * the three buttons read as part of the bar, and `--mira-text-subtle` for the glyphs, as the bar's icon
 * buttons use. Windows derives the hover and pressed shades from the background. Both are copied
 * from styles/tokens/ because the OS paints them and cannot read a CSS variable; `titleBar.test.ts`
 * fails when the copies drift apart.
 */
export const CHROME_COLORS: Record<ChromeTheme, { color: string; symbolColor: string }> = {
  dark: { color: '#1a1a1a', symbolColor: '#a3a3a3' },
  light: { color: '#ffffff', symbolColor: '#5c5c5c' }
}

/**
 * How much black `--mira-bg-backdrop` lays over the page while a dialog is open, per theme. The backdrop
 * cannot cover the window buttons, which the OS paints above the page, so they take the same shade
 * from here instead of standing out as an undimmed box; `titleBar.test.ts` checks the copy.
 */
export const BACKDROP_ALPHA: Record<ChromeTheme, number> = { dark: 0.56, light: 0.32 }

/** A colour seen through `alpha` of black. */
function underBlack(hex: string, alpha: number): string {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  return (
    '#' +
    channels
      .map((value) =>
        Math.round(value * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

/** The window buttons' colours for a theme, dimmed like the page while a dialog is open. */
export function chromeColors(
  theme: ChromeTheme,
  dimmed: boolean
): { color: string; symbolColor: string } {
  const colors = CHROME_COLORS[theme]
  if (!dimmed) return colors
  return {
    color: underBlack(colors.color, BACKDROP_ALPHA[theme]),
    symbolColor: underBlack(colors.symbolColor, BACKDROP_ALPHA[theme])
  }
}

/**
 * The window's colour before the page paints: the surface (`--mira-bg-surface`), so opening Mira
 * does not flash a different colour.
 */
export const BOOT_BACKGROUND: Record<ChromeTheme, string> = {
  dark: '#1a1a1a',
  light: '#ffffff'
}
