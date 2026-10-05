import type { JSX, ReactNode, RefObject } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'

export interface DialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description?: string
  /**
   * `wide` fits a form with a cover beside its fields; `form` fits a column of settings. Both scroll when
   * the window is short.
   */
  size?: 'default' | 'form' | 'wide'
  /** Where focus goes on close; the opening control, which a dialog without a trigger cannot know. */
  finalFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

const SIZES = {
  default: 'w-[min(420px,calc(100vw-32px))]',
  form: 'max-h-[calc(100vh-32px)] w-[min(540px,calc(100vw-32px))] overflow-y-auto',
  wide: 'max-h-[calc(100vh-32px)] w-[min(760px,calc(100vw-32px))] overflow-y-auto'
} as const

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'default',
  finalFocus,
  children
}: DialogProps): JSX.Element {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 bg-backdrop transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup
          finalFocus={finalFocus}
          className={`fixed top-1/2 left-1/2 flex ${SIZES[size]} -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-panel border border-line-strong bg-canvas p-5 text-ink outline-none`}
        >
          <div className="flex flex-col gap-1">
            <BaseDialog.Title className="text-ui-md font-semibold">{title}</BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="text-ui-xs leading-normal text-ink-muted">
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
