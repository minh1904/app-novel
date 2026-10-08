import type { HTMLAttributes, JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** A bordered block on the sheet. Static cards have no shadow, only the border. */
export function Card({
  title,
  aside,
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: string
  /** A count or an action on the title line. */
  aside?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <section
      data-slot="card"
      aria-label={title}
      className={cn(
        'flex min-w-0 flex-col gap-sm rounded-lg border border-default bg-surface p-md',
        className
      )}
      {...props}
    >
      {(title || aside) && (
        <div className="flex items-center gap-xs">
          {title && <h2 className="m-0 text-label-sm text-default">{title}</h2>}
          {aside && <span className="ml-auto flex items-center gap-xs">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  )
}
