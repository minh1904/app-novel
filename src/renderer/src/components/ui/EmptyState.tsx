import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Trạng thái trống (chưa có dữ liệu): gồm một câu giải thích lý do và gợi ý hành động tiếp theo.
 * Giúp người dùng biết cần làm gì tiếp theo thay vì nhìn thấy bảng trống.
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
  /** Một câu ngắn gọn, không viết thành đoạn văn dài. */
  children: ReactNode
  actions?: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center gap-sm px-xl py-3xl text-center', className)}
    >
      {icon && (
        <span className="flex size-10 items-center justify-center rounded-md border border-default bg-surface text-subtle shadow-xs">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-2xs">
        <p className="m-0 text-heading">{title}</p>
        <p className="m-0 max-w-(--container-sm) text-body-sm text-subtle">{children}</p>
      </div>
      {actions && (
        <span className="flex flex-wrap items-center justify-center gap-xs">{actions}</span>
      )}
    </div>
  )
}
