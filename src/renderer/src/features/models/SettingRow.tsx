import type { JSX, ReactNode } from 'react'

/**
 * One setting in a dialog: what it is and what it does on the left, the control on the right, and an
 * optional line under both for a message about the control. Wraps under the text on a narrow dialog.
 *
 * The hint is part of the row and not a tooltip: what a field does is the thing a person reads before
 * touching it, and a tooltip is not there for keyboard or touch.
 */
export function SettingRow({
  title,
  hint,
  children,
  below
}: {
  title: string
  hint?: string
  children: ReactNode
  below?: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-semibold">{title}</span>
          {hint && <span className="text-[12px] leading-[1.55] text-ink-muted">{hint}</span>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      </div>
      {below}
    </div>
  )
}
