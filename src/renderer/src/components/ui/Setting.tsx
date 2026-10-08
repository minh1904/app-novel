import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * One setting (Obsidian's setting item): what it is and what it does on the left, the control on the
 * right. The row is a container query, so in a narrow pane the control drops under the description.
 * `wide` keeps the control on the title line and gives `below` the full width (a list, an editor).
 *
 * The hint is part of the row, not a tooltip: what a field does is what a person reads before touching
 * it, and a tooltip is not there for keyboard or touch.
 */
export function SettingRow({
  title,
  hint,
  children,
  below,
  wide = false,
  id
}: {
  title: string
  hint?: ReactNode
  children?: ReactNode
  below?: ReactNode
  wide?: boolean
  /** The anchor a deep link scrolls to and highlights. */
  id?: string
}): JSX.Element {
  return (
    <div data-slot="setting-row" data-setting-id={id} className="@container py-sm">
      <div
        className={cn(
          'grid gap-sm',
          wide
            ? 'grid-cols-[minmax(0,1fr)_auto] items-start'
            : '@2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] @2xl:items-center'
        )}
      >
        <div className="flex min-w-0 flex-col gap-3xs">
          <span className="text-label-sm text-default">{title}</span>
          {hint && <span className="text-body-xs text-muted">{hint}</span>}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-xs @2xl:justify-end @2xl:justify-self-end">
            {children}
          </div>
        )}
      </div>
      {below && <div className="mt-xs">{below}</div>}
    </div>
  )
}

/** A heading over a group of rows, with room for a count or an action. */
export function SectionHeading({
  icon,
  children,
  aside
}: {
  icon?: ReactNode
  children: ReactNode
  aside?: ReactNode
}): JSX.Element {
  return (
    <div className="mb-2xs flex items-center gap-xs pt-xs">
      {icon && <span className="flex text-muted">{icon}</span>}
      <h3 className="m-0 text-heading">{children}</h3>
      {aside && <span className="ml-auto flex items-center gap-xs">{aside}</span>}
    </div>
  )
}

/** A group of setting rows: a heading, then the rows divided by hairlines. */
export function SettingsSection({
  title,
  icon,
  aside,
  children
}: {
  title?: string
  icon?: ReactNode
  aside?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <section className="mb-xl">
      {title && (
        <SectionHeading icon={icon} aside={aside}>
          {title}
        </SectionHeading>
      )}
      <div className={cn('divide-y divide-subtle')}>{children}</div>
    </section>
  )
}
