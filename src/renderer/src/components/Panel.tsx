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
        'flex min-w-0 flex-col gap-5 rounded-panel border border-line bg-sidebar p-[18px]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {title && (
        <h2 className="m-0 text-[11px] font-semibold tracking-[0.07em] text-ink-muted uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
