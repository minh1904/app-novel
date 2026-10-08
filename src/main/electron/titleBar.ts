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
 * A see-through background for the window buttons, as Hermes Desktop uses: the page's own top bar shows
 * through, so a dialog's backdrop (its fade and blur included) covers the buttons' corner like the rest
 * of the bar. An opaque colour sat on top of the backdrop as a bright box and changed in one step while
 * the backdrop faded. Fully transparent black is read as "no colour" by Electron, hence the red channel.
 */
export const TRANSPARENT_OVERLAY = 'rgba(1, 0, 0, 0)'

/**
 * What the window buttons wear, per theme: the see-through background, and `--mira-text-subtle` for the
 * glyphs, as the bar's icon buttons use. The glyph colour is copied from styles/tokens/ because the OS
 * paints it and cannot read a CSS variable; `titleBar.test.ts` fails when the copies drift apart.
 */
export const CHROME_COLORS: Record<ChromeTheme, { color: string; symbolColor: string }> = {
  dark: { color: TRANSPARENT_OVERLAY, symbolColor: '#a3a3a3' },
  light: { color: TRANSPARENT_OVERLAY, symbolColor: '#5c5c5c' }
}

/**
 * The window's colour before the page paints: the surface (`--mira-bg-surface`), so opening Mira
 * does not flash a different colour.
 */
export const BOOT_BACKGROUND: Record<ChromeTheme, string> = {
  dark: '#1a1a1a',
  light: '#ffffff'
}
