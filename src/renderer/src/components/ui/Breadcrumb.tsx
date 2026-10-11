import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface BreadcrumbItem {
  key?: string
  label: ReactNode
  onClick?: () => void
  title?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Thanh điều hướng phân cấp (breadcrumb): các mục cha hiển thị mờ hơn và có thể bấm,
 * mục hiện tại hiển thị chữ rõ nét với độ đậm trung bình.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps): JSX.Element {
  return (
    <nav
      aria-label="Đường dẫn điều hướng"
      className={cn('flex min-w-0 items-center gap-1.5 text-body-sm', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const itemKey = item.key ?? (typeof item.label === 'string' ? item.label : String(index))
        return (
          <div key={itemKey} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && (
              <span className="select-none text-body-xs font-normal text-muted" aria-hidden="true">
                /
              </span>
            )}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                title={item.title}
                className={cn(
                  'cursor-pointer truncate rounded-xs text-body-sm font-normal text-subtle transition-colors hover:text-default',
                  focusRing
                )}
              >
                {item.label}
              </button>
            ) : (
              <span
                title={item.title}
                className={cn(
                  'truncate',
                  isLast ? 'font-medium text-default' : 'font-normal text-subtle'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
