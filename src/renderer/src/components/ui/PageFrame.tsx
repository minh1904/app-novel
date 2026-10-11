import type { JSX, ReactNode } from 'react'
import { Badge } from './Badge'
import { SOON_LABEL } from '../../lib/mockFeatures'
import { cn } from '../../lib/cn'
import { TopBarActions, TopBarTitle } from './TopBarActions'

/**
 * Khung trang ứng dụng từ thanh bên: hiển thị tiêu đề và các nút trên thanh trên cùng, cùng
 * cột nội dung căn giữa. Thuộc tính `soon` đánh dấu trang chỉ là giao diện minh họa sắp có.
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
  /** Trang dạng bảng hoặc chia hai cột sử dụng độ rộng 1240px thay vì 1080px. */
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

/** Tiêu đề phần giao diện mẫu: tiêu đề kèm huy hiệu "Sắp có". */
export function SoonTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-xs">
      {children}
      <Badge color="accent">{SOON_LABEL}</Badge>
    </span>
  )
}
