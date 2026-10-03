import { useContext, type JSX, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TopBarSlotContext } from './topBarSlot'

/**
 * Draws its children in the top bar instead of where it is written.
 *
 * The controls keep closing over the screen's own state — only their DOM node moves — so a screen
 * puts "save" in the bar without handing the shell its dirty flag or its save function. Leave the
 * screen and they leave the bar with it.
 */
export function TopBarActions({ children }: { children: ReactNode }): JSX.Element | null {
  const slot = useContext(TopBarSlotContext)
  return slot === null ? null : createPortal(children, slot)
}
