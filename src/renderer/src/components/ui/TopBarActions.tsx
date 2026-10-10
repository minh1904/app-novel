import { useContext, type JSX, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { CompactButton } from './CompactButton'
import { ICON } from './icon'
import { cn } from '../../lib/cn'
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

export interface TopBarTitleProps {
  children: ReactNode
  note?: ReactNode
  onBack?: () => void
  backLabel?: string
  size?: 'md' | 'sm'
  className?: string
}

/** The page name at the left of the top bar, with an optional note and back button. */
export function TopBarTitle({
  children,
  note,
  onBack,
  backLabel = 'Quay lại',
  size = 'sm',
  className
}: TopBarTitleProps): JSX.Element | null {
  const slot = useContext(TopBarTitleSlotContext)
  const active = useContext(WorkTabActiveContext)
  if (slot === null || !active) return null
  return createPortal(
    <div className="flex min-w-0 items-center gap-1.5 text-body-sm">
      {onBack && (
        <CompactButton
          aria-label={backLabel}
          title={backLabel}
          onClick={onBack}
          icon={<AltArrowLeftIcon size={ICON.sm} />}
        />
      )}
      {typeof children === 'string' ? (
        <h1
          className={cn(
            'm-0 truncate',
            size === 'sm'
              ? 'text-body-sm font-medium text-default'
              : 'text-label-md font-semibold text-default',
            className
          )}
        >
          {children}
        </h1>
      ) : (
        children
      )}
      {note && (
        <>
          <span className="select-none text-body-xs font-normal text-muted/60" aria-hidden="true">
            /
          </span>
          <span className="truncate text-body-xs text-muted">{note}</span>
        </>
      )}
    </div>,
    slot
  )
}
