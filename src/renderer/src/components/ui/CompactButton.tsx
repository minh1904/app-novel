import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { compactButtonVariants } from './variants'

export interface CompactButtonProps extends Omit<BaseButton.Props, 'className' | 'children'> {
  /** ghost (default) | light | dark | outline. */
  variant?: 'ghost' | 'light' | 'dark' | 'outline'
  /** lg 28px · md 24px (default) · sm 20px; icons 18 / 16 / 12 (COMPACT_ICON). */
  size?: 'lg' | 'md' | 'sm'
  round?: boolean
  /** neutral (default) | success (accept) | danger (delete): the hover says what the action does. */
  tone?: 'neutral' | 'success' | 'danger'
  className?: string
  icon: ReactNode
  /** Required: the button has no visible label. */
  'aria-label': string
}

/** An icon-only button for bars, rows and tags (IZONE LMS compact button). */
export function CompactButton({
  variant,
  size,
  round,
  tone,
  className,
  icon,
  type = 'button',
  ...props
}: CompactButtonProps): JSX.Element {
  return (
    <BaseButton
      data-slot="compact-button"
      type={type}
      {...props}
      className={cn(compactButtonVariants({ variant, size, round, tone }), className)}
    >
      {icon}
    </BaseButton>
  )
}
