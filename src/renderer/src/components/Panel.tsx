import type { HTMLAttributes, JSX, ReactNode } from 'react'

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string
  children: ReactNode
}

export function Panel({ title, className, children, ...props }: PanelProps): JSX.Element {
  return (
    <section
      data-slot="panel"
      aria-label={title}
      className={[
        'flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-raised p-4',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {title && <h2 className="m-0 text-ui-xs font-medium text-ink-muted">{title}</h2>}
      {children}
    </section>
  )
}
