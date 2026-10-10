import type { JSX, ReactNode } from 'react'
import { Badge } from './Badge'
import { SOON_LABEL } from '../../lib/mockFeatures'
import { cn } from '../../lib/cn'
import { TopBarActions, TopBarTitle } from './TopBarActions'

/**
 * An app page of the sidebar: its name and buttons in the top bar, then a centred column on the
 * window background. `soon` marks a page that is only a picture of the finished feature.
 */
export function PageFrame({
  title,
  note,
  actions,
  soon = false,
  wide = false,
  className,
  children
}: {
  title: string
  note?: ReactNode
  actions?: ReactNode
  soon?: boolean
  /** Tables and two-column pages take 1240px instead of 1080px. */
  wide?: boolean
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="min-h-full bg-default">
      <TopBarTitle
        note={
          soon || note ? (
            <span className="inline-flex items-center gap-xs">
              {soon && <Badge color="accent">{SOON_LABEL}</Badge>}
              {note}
            </span>
          ) : undefined
        }
      >
        {title}
      </TopBarTitle>
      {actions && <TopBarActions>{actions}</TopBarActions>}
      <div
        className={cn(
          'mx-auto flex flex-col gap-lg px-xl py-xl',
          wide ? 'max-w-[1240px]' : 'max-w-[1080px]',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** A mock section on a real page: a card whose title carries the "Sắp có" mark. */
export function SoonTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-xs">
      {children}
      <Badge color="accent">{SOON_LABEL}</Badge>
    </span>
  )
}
