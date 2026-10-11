import type { ButtonHTMLAttributes, JSX, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'
import { menuItemClass } from './DropdownMenu'
import { focusRing } from './focus'

export interface ListOptionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Mục đang được con trỏ bàn phím duyệt qua hoặc được chọn: hiển thị lớp nền đã chọn. */
  selected?: boolean
  /** Hiển thị hai dòng (tiêu đề và mô tả) thay vì một dòng đơn 32px. */
  multiline?: boolean
  ref?: Ref<HTMLButtonElement>
  children: ReactNode
}

/**
 * Một tùy chọn trong danh sách do trường nhập tự điều khiển (combobox, kết quả tìm kiếm):
 * hàng menu dạng nút bấm mang `role="option"`.
 */
export function ListOption({
  selected = false,
  multiline = false,
  className,
  ref,
  children,
  ...props
}: ListOptionProps): JSX.Element {
  return (
    <button
      data-slot="list-option"
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      {...props}
      className={cn(
        menuItemClass,
        'w-full cursor-pointer text-left hover:bg-hover disabled:cursor-not-allowed disabled:text-disabled',
        multiline && 'h-auto flex-col items-start gap-0 py-2xs',
        selected && 'bg-selected hover:bg-selected',
        focusRing,
        className
      )}
    >
      {children}
    </button>
  )
}
