import type { ChromeTheme } from '../../shared/contracts/desktop-api'

/**
 * The page's own top bar is the title bar: the OS draws only its three window buttons, over the
 * right end of that bar (the window controls overlay), instead of a separate strip above the page.
 * macOS keeps its native frame, which already puts its buttons in a unified bar.
 */
export const OVERLAY_TITLE_BAR = process.platform !== 'darwin'

/**
 * Height of the buttons in px. The page's top bar is `h-[42px]` in AppShell, and its last pixel row
 * is the bottom border; stopping one short leaves that border visible under the buttons instead of
 * painting over it.
 */
export const TOP_BAR_HEIGHT = 41

/**
 * What the window buttons wear, per theme. These are `--surface-chrome` and `--text-muted` from
 * tokens.css, copied because the overlay is painted by the OS and cannot read a CSS variable.
 * `titleBar.test.ts` fails when the two drift apart.
 */
export const CHROME_COLORS: Record<ChromeTheme, { color: string; symbolColor: string }> = {
  dark: { color: '#0e0e0e', symbolColor: '#b3b3b3' },
  light: { color: '#f6f6f7', symbolColor: '#666666' }
}
