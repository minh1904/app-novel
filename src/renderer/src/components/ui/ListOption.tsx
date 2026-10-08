import type { ButtonHTMLAttributes, JSX, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'
import { menuItemClass } from './DropdownMenu'
import { focusRing } from './focus'

export interface ListOptionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** The option under the keyboard cursor or the chosen one; it wears the selected overlay. */
  selected?: boolean
  /** Two lines (a title over a description) instead of one 32px row. */
  multiline?: boolean
  ref?: Ref<HTMLButtonElement>
  children: ReactNode
}

/**
 * One option of a list a field drives itself (a combobox, search results): a menu row as a button with
 * `role="option"`. Menus and selects built on Base UI use MenuItem and Select instead.
 */
export function ListOption({
  selected = false,
  multiline = false,
  className,
  ref,
  children,
  ...props
}: ListOptionProps): JSX.Element {
  return (
    <button
      data-slot="list-option"
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      {...props}
      className={cn(
        menuItemClass,
        'w-full cursor-pointer text-left hover:bg-hover disabled:cursor-not-allowed disabled:text-disabled',
        multiline && 'h-auto flex-col items-start gap-0 py-2xs',
        selected && 'bg-selected hover:bg-selected',
        focusRing,
        className
      )}
    >
      {children}
    </button>
  )
}
