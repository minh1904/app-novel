import * as v from 'valibot'
import { setAppearanceInputSchema, type AppearanceState } from '../../shared/contracts/appearance'
import { appearanceState, readAppearance, writeAppearance } from './appearance'

/** The two calls of a window that change how it is drawn; a fake stands in for BrowserWindow in tests. */
export interface GlassWindow {
  setBackgroundMaterial(material: 'acrylic' | 'none'): void
  setBackgroundColor(color: string): void
}

export interface AppearanceHandlerDeps<Event> {
  dataDir: string
  supported: boolean
  isTrusted(event: Event): boolean
  getWindow(): GlassWindow | null
  /** The solid colour the window wears with glass off, for the theme it is in right now. */
  solidBackground(): string
}

/**
 * `app:appearance:get` and `app:appearance:set`. Setting writes the file first and then redraws the
 * window, so a crash between the two still opens next time with what the person chose. The page sets its
 * own `data-glass` from the returned state (tokens.css, "Window glass").
 */
export function createAppearanceHandlers<Event>(deps: AppearanceHandlerDeps<Event>): {
  get(event: Event): AppearanceState
  set(event: Event, input: unknown): AppearanceState
} {
  function guard(event: Event): void {
    if (!deps.isTrusted(event)) throw new Error('Untrusted IPC sender')
  }

  return {
    get(event) {
      guard(event)
      return appearanceState(readAppearance(deps.dataDir), deps.supported)
    },
    set(event, input) {
      guard(event)
      const parsed = v.parse(setAppearanceInputSchema, input)
      writeAppearance(deps.dataDir, { glass: parsed.glass })
      const state = appearanceState({ glass: parsed.glass }, deps.supported)
      const window = deps.getWindow()
      if (window && deps.supported) {
        window.setBackgroundMaterial(state.glass ? 'acrylic' : 'none')
        window.setBackgroundColor(state.glass ? '#00000000' : deps.solidBackground())
      }
      return state
    }
  }
}
