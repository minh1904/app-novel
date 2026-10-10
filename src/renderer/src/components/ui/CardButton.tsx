import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

/**
 * A card the whole of which opens something (a work in the library grid): the bordered surface of Card,
 * a stronger border on hover, and the focus mark. Put no other control inside it.
 */
export function CardButton({
  onClick,
  className,
  children,
  ...props
}: Omit<BaseButton.Props, 'className' | 'children'> & {
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <BaseButton
      data-slot="card-button"
      type="button"
      onClick={onClick}
      {...props}
      className={cn(
        'flex min-w-0 rounded-lg border border-default bg-surface p-md text-left',
        'transition-colors duration-(--mira-duration-fast) ease-standard hover:border-strong',
        focusRing,
        className
      )}
    >
      {children}
    </BaseButton>
  )
}
