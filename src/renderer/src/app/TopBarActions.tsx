import { useContext, type JSX, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TopBarSlotContext, TopBarTitleSlotContext, WorkTabActiveContext } from './topBarSlot'

/**
 * Draws its children in the top bar instead of where it is written.
 *
 * The controls keep closing over the screen's own state — only their DOM node moves — so a screen
 * puts "save" in the bar without handing the shell its dirty flag or its save function. Leave the
 * screen and they leave the bar with it.
 */
export function TopBarActions({ children }: { children: ReactNode }): JSX.Element | null {
  const slot = useContext(TopBarSlotContext)
  const active = useContext(WorkTabActiveContext)
  return slot === null || !active ? null : createPortal(children, slot)
}

/** The page name at the left of the top bar, with an optional note after it. */
export function TopBarTitle({
  children,
  note
}: {
  children: ReactNode
  note?: ReactNode
}): JSX.Element | null {
  const slot = useContext(TopBarTitleSlotContext)
  const active = useContext(WorkTabActiveContext)
  if (slot === null || !active) return null
  return createPortal(
    <>
      <h1 className="m-0 truncate text-label-md">{children}</h1>
      {note && <span className="truncate text-body-xs text-muted">{note}</span>}
    </>,
    slot
  )
}
