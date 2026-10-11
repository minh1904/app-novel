import { type JSX, type ReactNode, useState } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface DropZoneProps {
  /** Kích hoạt hộp thoại chọn tệp tin (thông qua input tệp ẩn). */
  onBrowse(): void
  /** Xử lý danh sách tệp tin được kéo thả vào vùng nhận. */
  onDrop(files: FileList): void
  /** Đã có nội dung xem trước lấp đầy vùng nhận: viền chuyển nét liền và ẩn gợi ý. */
  filled?: boolean
  disabled?: boolean
  'aria-label': string
  /** Kích thước và hình dạng, ví dụ: `aspect-2/3 w-full` cho ảnh bìa. */
  className?: string
  /** Nội dung xem trước, hoặc biểu tượng kèm dòng gợi ý. */
  children: ReactNode
}

/**
 * Vùng kéo thả tệp tin hoặc nhấp chuột để chọn tệp: khung viền nét đứt và sáng lên khi kéo
 * tệp qua. Màn hình quản lý thẻ input tệp ẩn và xử lý tệp được chọn.
 */
export function DropZone({
  onBrowse,
  onDrop,
  filled = false,
  disabled,
  className,
  children,
  ...props
}: DropZoneProps): JSX.Element {
  const [dragging, setDragging] = useState(false)
  return (
    <BaseButton
      data-slot="drop-zone"
      type="button"
      disabled={disabled}
      aria-label={props['aria-label']}
      onClick={onBrowse}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        onDrop(event.dataTransfer.files)
      }}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center gap-xs overflow-hidden rounded-sm border border-(--mira-border-input) text-center',
        'transition-colors duration-(--mira-duration-fast) ease-standard data-disabled:cursor-not-allowed data-disabled:opacity-60',
        filled ? '' : 'border-dashed bg-subtle hover:bg-hover',
        dragging && 'border-focus bg-selected',
        focusRing,
        className
      )}
    >
      {children}
    </BaseButton>
  )
}
