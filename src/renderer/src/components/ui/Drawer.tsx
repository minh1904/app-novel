import type { JSX, ReactNode, RefObject } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface DrawerProps {
  open: boolean
  onOpenChange(open: boolean): void
  /** Tên cho công nghệ hỗ trợ tiếp cận; phần đầu do nội dung tự vẽ. */
  label: string
  /** Phần tử nhận lại focus khi đóng, cho drawer không mở qua trigger trực tiếp. */
  finalFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * Tấm phủ trượt từ cạnh phải cho cửa sổ hẹp: có backdrop, giữ focus bên trong khi mở, Esc để đóng và
 * trả focus về chỗ cũ khi đóng. Trên cửa sổ đủ rộng, cùng nội dung nằm dock cạnh màn và không giữ focus.
 */
export function Drawer({
  open,
  onOpenChange,
  label,
  finalFocus,
  children
}: DrawerProps): JSX.Element {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-(--mira-z-backdrop) bg-backdrop transition-opacity duration-(--mira-duration-base) ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup
          aria-label={label}
          finalFocus={finalFocus}
          className={cn(
            'fixed inset-y-0 right-0 z-(--mira-z-modal) flex w-[min(420px,calc(100vw-32px))] flex-col border-l border-default bg-subtle text-default shadow-lg outline-none',
            'transition-transform duration-(--mira-duration-base) ease-enter data-starting-style:translate-x-full data-ending-style:translate-x-full data-ending-style:ease-exit motion-reduce:transition-none',
            // Popup nhận focus khi nội dung chưa có gì tabbable; vẫn phải thấy được.
            focusRing
          )}
        >
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
