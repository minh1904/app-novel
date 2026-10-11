import type { ButtonHTMLAttributes, JSX, ReactNode, Ref } from 'react'
import { AltArrowDownIcon } from '@renderer/components/ui/reicon'

import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'
import { inputFrameVariants } from './variants'

export interface PickerTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Kiểu hiển thị: field (khung như ô nhập, chiếm toàn bộ chiều rộng) · ghost (không viền, nằm trên thanh công cụ). */
  variant?: 'field' | 'ghost'
  /** Giá trị đã chọn; tự động cắt ngắn khi quá dài. */
  value: ReactNode
  /** Thẻ nhãn ngắn sau giá trị, ví dụ mức độ suy nghĩ. */
  tag?: ReactNode
  /** Ký hiệu sau thẻ nhãn, ví dụ dấu chấm báo khác giá trị mặc định. */
  mark?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/**
 * Nút kích hoạt mở bộ chọn dạng popover: hiển thị giá trị, thẻ nhãn tùy chọn và mũi tên.
 * Chuyển tiếp toàn bộ prop và ref để có thể dùng làm prop `render` cho trigger của Base UI.
 */
export function PickerTrigger({
  variant = 'field',
  value,
  tag,
  mark,
  className,
  ref,
  type = 'button',
  ...props
}: PickerTriggerProps): JSX.Element {
  return (
    <button
      data-slot="picker-trigger"
      ref={ref}
      type={type}
      {...props}
      className={cn(
        variant === 'field'
          ? cn(
              inputFrameVariants({ size: 'md' }),
              'w-full',
              focusRing,
              'cursor-pointer gap-xs pr-xs data-popup-open:bg-(--mira-input-bg-hover)'
            )
          : cn(
              'inline-flex h-8 max-w-64 shrink-0 cursor-pointer items-center gap-2xs rounded-sm px-xs text-body-sm whitespace-nowrap text-subtle',
              'transition-colors duration-(--mira-duration-fast) ease-standard hover:bg-hover hover:text-default data-popup-open:bg-selected data-popup-open:text-default',
              focusRing
            ),
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">{value}</span>
      {tag && (
        <span className="shrink-0 rounded-xs bg-muted px-2xs text-body-xs text-subtle">{tag}</span>
      )}
      {mark}
      <AltArrowDownIcon size={ICON.xs} aria-hidden="true" className="shrink-0 text-subtle" />
    </button>
  )
}
