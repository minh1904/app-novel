import type { JSX, MouseEvent, ReactNode } from 'react'
import { AltArrowDownIcon } from '@renderer/components/ui/reicon'
import { Collapsible } from '@base-ui/react/collapsible'

import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'

export interface DisclosureProps {
  /** Dòng nhãn kích hoạt đóng/mở phần nội dung. */
  label: ReactNode
  open: boolean
  onOpenChange(open: boolean): void
  /** Hiệu ứng nhấp nháy nhãn khi tiến trình đang diễn ra. */
  pending?: boolean
  /** Lớp CSS cho hàng kích hoạt (kiểu chữ, khoảng cách). */
  className?: string
  /** Giá trị -1 để loại nút khỏi thứ tự phím Tab, hữu ích cho tiêu đề nằm trong danh sách do trường nhập điều khiển. */
  tabIndex?: number
  /** Xử lý sự kiện nhấn chuột, ví dụ preventDefault để không làm mất focus của ô nhập liệu. */
  onMouseDown?(event: MouseEvent<HTMLButtonElement>): void
  /** Các phần tử điều khiển phụ nằm cạnh dòng nhãn (như bộ lọc), nằm ngoài nút kích hoạt. */
  trailing?: ReactNode
  children?: ReactNode
}

/**
 * Dòng mở rộng thông tin chi tiết, có mũi tên sau nhãn: ví dụ nội dung suy nghĩ của mô hình,
 * công cụ đã gọi, hoặc nhóm danh mục. Phần thân chỉ render khi mở.
 */
export function Disclosure({
  label,
  open,
  onOpenChange,
  pending = false,
  className,
  tabIndex,
  onMouseDown,
  trailing,
  children
}: DisclosureProps): JSX.Element {
  const trigger = (
    <Collapsible.Trigger
      data-slot="disclosure"
      tabIndex={tabIndex}
      onMouseDown={onMouseDown}
      className={cn(
        'flex w-full min-w-0 flex-1 items-center gap-2xs text-left text-body-xs text-muted hover:text-subtle',
        focusRing,
        className
      )}
    >
      <span className={cn('min-w-0 truncate', pending && 'motion-safe:animate-pulse')}>
        {label}
      </span>
      <AltArrowDownIcon
        size={ICON['2xs']}
        aria-hidden="true"
        className={cn(
          'shrink-0 opacity-70 transition-transform duration-(--mira-duration-fast) ease-standard',
          !open && '-rotate-90'
        )}
      />
    </Collapsible.Trigger>
  )
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      {trailing ? (
        <div className="flex min-w-0 items-center gap-xs">
          {trigger}
          {trailing}
        </div>
      ) : (
        trigger
      )}
      {children && (
        <Collapsible.Panel className="mt-3xs h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-(--mira-duration-base) ease-standard data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0">
          {children}
        </Collapsible.Panel>
      )}
    </Collapsible.Root>
  )
}
