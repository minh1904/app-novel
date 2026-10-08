import type { JSX, MouseEvent, ReactNode } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'

export interface DisclosureProps {
  /** The line that opens and closes the body. */
  label: ReactNode
  open: boolean
  onOpenChange(open: boolean): void
  /** Pulses the label while the thing it describes is still running. */
  pending?: boolean
  /** Classes for the trigger row (its text style). */
  className?: string
  /** -1 keeps the trigger out of the tab order, for a header inside a list a field drives. */
  tabIndex?: number
  /** E.g. preventDefault, so a click does not take focus from the field that drives the list. */
  onMouseDown?(event: MouseEvent<HTMLButtonElement>): void
  /** Controls beside the line (a filter), outside the trigger. */
  trailing?: ReactNode
  children?: ReactNode
}

/**
 * A quiet line that opens into more detail, with a chevron after the label: what the model thought,
 * the tools it called, a group of models. The body is only rendered while open.
 */
export function Disclosure({
  label,
  open,
  onOpenChange,
  pending = false,
  className,
  tabIndex,
  onMouseDown,
  trailing,
  children
}: DisclosureProps): JSX.Element {
  const trigger = (
    <Collapsible.Trigger
      data-slot="disclosure"
      tabIndex={tabIndex}
      onMouseDown={onMouseDown}
      className={cn(
        'flex w-full min-w-0 flex-1 items-center gap-2xs text-left text-body-xs text-muted hover:text-subtle',
        focusRing,
        className
      )}
    >
      <span className={cn('min-w-0 truncate', pending && 'motion-safe:animate-pulse')}>
        {label}
      </span>
      <AltArrowDownIcon
        size={ICON['2xs']}
        aria-hidden="true"
        className={cn(
          'shrink-0 opacity-70 transition-transform duration-(--mira-duration-fast)',
          !open && '-rotate-90'
        )}
      />
    </Collapsible.Trigger>
  )
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      {trailing ? (
        <div className="flex min-w-0 items-center gap-xs">
          {trigger}
          {trailing}
        </div>
      ) : (
        trigger
      )}
      {children && <Collapsible.Panel className="mt-3xs">{children}</Collapsible.Panel>}
    </Collapsible.Root>
  )
}
