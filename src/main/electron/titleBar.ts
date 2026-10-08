import type { ChromeTheme } from '../../shared/contracts/desktopApi'
import { ZOOM_FACTOR } from './zoom'

/**
 * The page's own top bar is the title bar: the OS draws only its three window buttons, over the
 * right end of that bar (the window controls overlay), instead of a separate strip above the page.
 * macOS keeps its native frame, which already puts its buttons in a unified bar.
 */
export const OVERLAY_TITLE_BAR = process.platform !== 'darwin'

/** `--header-height` in tokens.css, before the page zoom. Hermes Desktop's title bar is 34px too. */
export const HEADER_HEIGHT = 34

/**
 * Height of the buttons in window pixels: the bar after the page zoom, less one row. The bar's last
 * pixel row is its bottom border; stopping one short leaves that border visible under the buttons
 * instead of painting over it.
 */
export const TOP_BAR_HEIGHT = Math.round(HEADER_HEIGHT * ZOOM_FACTOR) - 1

/**
 * What the window buttons wear, per theme. The background is clear, as in Hermes (`rgba(1, 0, 0, 0)`,
 * its TITLEBAR_OVERLAY_COLOR), so the bar's own colour shows through and nothing here has to copy a
 * `color-mix()` surface. The glyph colour is `--text-muted` from tokens.css, copied because the OS
 * paints it and cannot read a CSS variable; `titleBar.test.ts` fails when the two drift apart.
 */
export const CHROME_COLORS: Record<ChromeTheme, { color: string; symbolColor: string }> = {
  dark: { color: 'rgba(1, 0, 0, 0)', symbolColor: '#aeb4b9' },
  light: { color: 'rgba(1, 0, 0, 0)', symbolColor: '#595c60' }
}

/**
 * The window's colour before the page paints: the chrome surface of each theme (the nous background
 * mixed with Hermes's chrome neutral), so opening Mira does not flash a different grey.
 */
export const BOOT_BACKGROUND: Record<ChromeTheme, string> = {
  dark: '#0d1015',
  light: '#fefefe'
}
