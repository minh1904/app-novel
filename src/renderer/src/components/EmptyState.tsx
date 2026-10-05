import type { JSX, ReactNode } from 'react'
import { cx } from './cx'

/**
 * Trạng thái rỗng: một câu nói vì sao chưa có gì và một việc làm tiếp. Không phải bảng trống —
 * người dùng mở màn lần đầu phải biết bước kế tiếp là gì.
 */
export function EmptyState({
  icon,
  title,
  children,
  actions,
  className
}: {
  icon?: ReactNode
  title: string
  /** Một câu giải thích, không phải một đoạn. */
  children: ReactNode
  actions?: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div
      data-slot="empty-state"
      className={cx(
        'flex flex-col items-center gap-3 px-6 py-10 text-center',
        className
      )}
    >
      {icon && (
        <span className="flex size-9 items-center justify-center rounded-control bg-control text-ink-muted">
          {icon}
        </span>
      )}
      <p className="m-0 text-ui-sm font-semibold">{title}</p>
      <p className="m-0 max-w-[460px] text-ui-xs leading-normal text-ink-muted">{children}</p>
      {actions && (
        <span className="flex flex-wrap items-center justify-center gap-2">{actions}</span>
      )}
    </div>
  )
}
