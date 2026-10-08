import type { Input, WebContents } from 'electron'

/**
 * The page runs at 100%: the type scale in tokens.css is the size on screen
 * (docs/modules/design-system/README.md). It is still pinned, because the window buttons are drawn
 * at a height computed from it.
 */
export const ZOOM_FACTOR = 1

/**
 * Ctrl/Cmd with `=`, `+`, `-` or `0`: the browser's zoom keys. Mira keeps one zoom, because the window
 * buttons are drawn by the OS at a height computed from it (titleBar.ts) and would stop lining up with
 * the top bar.
 */
export function isZoomShortcut(input: Pick<Input, 'type' | 'key' | 'control' | 'meta'>): boolean {
  if (input.type !== 'keyDown') return false
  if (!input.control && !input.meta) return false
  return input.key === '=' || input.key === '+' || input.key === '-' || input.key === '0'
}

/** Applies the zoom and holds it there against the zoom keys, Ctrl+wheel and pinch. */
export function pinZoom(contents: WebContents): void {
  const apply = (): void => contents.setZoomFactor(ZOOM_FACTOR)
  contents.on('did-finish-load', () => {
    apply()
    void contents.setVisualZoomLevelLimits(1, 1)
  })
  // Ctrl+wheel zooms without a menu accelerator; put it back at once.
  contents.on('zoom-changed', apply)
  contents.on('before-input-event', (event, input) => {
    if (isZoomShortcut(input)) event.preventDefault()
  })
}
