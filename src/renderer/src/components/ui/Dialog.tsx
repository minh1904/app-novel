import type { JSX, ReactNode, RefObject } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { useDimChrome } from '../../app/useDimChrome'
import { cn } from '../../lib/cn'
import { CompactButton } from './CompactButton'

export interface DialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description?: string
  /** sm 400px confirm · md 512px default · lg 760px a form with a cover beside its fields. */
  size?: 'sm' | 'md' | 'lg'
  /** Where focus goes on close; the opening control, which a dialog without a trigger cannot know. */
  finalFocus?: RefObject<HTMLElement | null>
  /** Buttons along the bottom edge, right-aligned. */
  footer?: ReactNode
  children?: ReactNode
}

const SIZES = {
  sm: 'w-[min(400px,calc(100vw-32px))]',
  md: 'w-[min(512px,calc(100vw-32px))]',
  lg: 'w-[min(760px,calc(100vw-32px))]'
} as const

/** Secondary content over the screen: a title, a scrolling body and an optional footer. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  finalFocus,
  footer,
  children
}: DialogProps): JSX.Element {
  useDimChrome(open)
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-(--mira-z-backdrop) bg-backdrop transition-opacity duration-(--mira-duration-slow) ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup
          finalFocus={finalFocus}
          className={cn(
            'fixed top-1/2 left-1/2 z-(--mira-z-modal) flex max-h-[calc(100vh-48px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-default bg-surface text-default shadow-lg outline-none',
            'transition-[opacity,scale] duration-(--mira-duration-slow) ease-enter data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0',
            SIZES[size]
          )}
        >
          <div className="flex items-start gap-sm px-lg pt-lg pb-sm">
            <div className="flex min-w-0 flex-1 flex-col gap-2xs">
              <BaseDialog.Title className="text-heading">{title}</BaseDialog.Title>
              {description && (
                <BaseDialog.Description className="text-body-sm text-subtle">
                  {description}
                </BaseDialog.Description>
              )}
            </div>
            <BaseDialog.Close
              render={<CompactButton aria-label="Đóng" icon={<CloseIcon size={16} />} />}
            />
          </div>
          {children && (
            <div className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-lg pb-lg">
              {children}
            </div>
          )}
          {footer && (
            <div className="flex items-center justify-end gap-xs border-t border-default px-lg py-sm">
              {footer}
            </div>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}

export const DialogClose = BaseDialog.Close
