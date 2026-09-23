import type { JSX, ReactNode } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'

export interface DialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description?: string
  children: ReactNode
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children
}: DialogProps): JSX.Element {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 bg-black/30 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup className="fixed top-1/2 left-1/2 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-panel border border-line bg-popover p-5 text-ink shadow-[0_16px_48px_rgb(0_0_0/0.2)] outline-none">
          <div className="flex flex-col gap-1">
            <BaseDialog.Title className="text-[15px] font-semibold tracking-[-0.02em]">
              {title}
            </BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="text-xs leading-[1.55] text-ink-muted">
                {description}
              </BaseDialog.Description>
            )}
          </div>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}

export const DialogClose = BaseDialog.Close
