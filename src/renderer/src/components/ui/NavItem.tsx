import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface NavItemProps extends Omit<BaseButton.Props, 'className' | 'children'> {
  /** The row of the page or item on screen; it wears the selection and `aria-current`. */
  active?: boolean
  /** Bold label, for a group row above its pages. */
  strong?: boolean
  /** A dot, an icon or a cover before the label. */
  leading?: ReactNode
  /** A count, a badge or a chevron at the end. */
  trailing?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * One row of a list column or a navigation: 32px, subtle text, a hover overlay and the selected overlay
 * on the active row (--mira-nav-*). The label truncates.
 */
export function NavItem({
  active = false,
  strong = false,
  leading,
  trailing,
  className,
  type = 'button',
  children,
  ...props
}: NavItemProps): JSX.Element {
  return (
    <BaseButton
      data-slot="nav-item"
      type={type}
      aria-current={active ? 'page' : undefined}
      {...props}
      className={cn(
        'flex h-8 w-full min-w-0 shrink-0 items-center gap-xs rounded-sm px-xs text-left text-body-sm select-none',
        'transition-colors duration-(--mira-duration-fast) ease-standard data-disabled:cursor-not-allowed data-disabled:text-disabled',
        active
          ? 'bg-(--mira-nav-bg-active) text-(--mira-nav-fg-active)'
          : 'text-(--mira-nav-fg) hover:bg-(--mira-nav-bg-hover) hover:text-(--mira-nav-fg-active)',
        strong && 'font-medium',
        '[&_svg]:shrink-0',
        focusRing,
        className
      )}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </BaseButton>
  )
}
