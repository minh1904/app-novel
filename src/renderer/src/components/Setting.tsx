import type { JSX, ReactNode } from 'react'
import { cx } from './cx'

/**
 * One setting, laid out like Hermes Desktop's `ListRow` (apps/desktop/src/app/settings/primitives.tsx): what
 * it is and what it does on the left, the control in a 15–22rem column on the right. The row is a container
 * query, so in a narrow pane the control drops under the description instead of squeezing it. Rows are
 * separated by space, not lines.
 *
 * `wide` keeps the control on the title line and gives `below` the full width (a list, an editor).
 *
 * The hint is part of the row and not a tooltip: what a field does is the thing a person reads before
 * touching it, and a tooltip is not there for keyboard or touch.
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
    <div data-slot="setting-row" data-setting-id={id} className="@container py-3">
      <div
        className={cx(
          'grid gap-3',
          wide
            ? 'grid-cols-[minmax(0,1fr)_auto] items-start'
            : '@2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] @2xl:items-center'
        )}
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-ui-sm leading-tight font-medium text-ink">{title}</span>
          {hint && <span className="mt-1 text-ui-xs leading-normal text-ink-muted">{hint}</span>}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 @2xl:justify-end @2xl:justify-self-end">
            {children}
          </div>
        )}
      </div>
      {below && <div className="mt-2">{below}</div>}
    </div>
  )
}

/** A heading over a group of rows: 13px medium, an optional icon, and room for a count or an action. */
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
    <div className="mb-1 flex items-center gap-2 pt-2 text-ui-sm font-medium text-ink">
      {icon && <span className="flex text-ink-muted">{icon}</span>}
      <h3 className="m-0 text-ui-sm font-medium">{children}</h3>
      {aside && <span className="ml-auto flex items-center gap-2">{aside}</span>}
    </div>
  )
}

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
    <section className="mb-6">
      {title && (
        <SectionHeading icon={icon} aside={aside}>
          {title}
        </SectionHeading>
      )}
      {children}
    </section>
  )
}
