import type { HTMLAttributes, JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { badgeVariants } from './variants'

const DOTS = {
  neutral: 'bg-current opacity-60',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  accent: 'bg-accent'
} as const

export type BadgeColor = keyof typeof DOTS

/** A short label for a state or a category; see badgeVariants for what each colour means. */
export function Badge({
  color = 'neutral',
  variant,
  dot = false,
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & {
  color?: BadgeColor
  /** light (tinted fill, default) | outline | plain. */
  variant?: 'light' | 'outline' | 'plain'
  /** A dot before the text, for a status. */
  dot?: boolean
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <span data-slot="badge" {...props} className={cn(badgeVariants({ color, variant }), className)}>
      {dot && (
        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', DOTS[color])} />
      )}
      {children}
    </span>
  )
}
