import type { AppearanceState } from '../../../../shared/contracts/appearance'

/** `data-glass` on <html> clears the page's own background so the acrylic shows (tokens.css). */
export function applyGlass(state: AppearanceState): void {
  if (state.glass) document.documentElement.setAttribute('data-glass', '')
  else document.documentElement.removeAttribute('data-glass')
}
