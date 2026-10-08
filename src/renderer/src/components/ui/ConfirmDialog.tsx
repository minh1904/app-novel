import type { JSX } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

/** What a confirm asks: the question, what happens, and the word on the button that does it. */
export interface ConfirmRequest {
  title: string
  description?: string
  confirmLabel: string
  onConfirm(): void
}

/**
 * A question before something that cannot be undone. Keeping is the quiet choice; the action is the danger
 * button, named for what it does ("Xóa", "Ngắt"), never "OK". `request` null keeps it closed.
 */
export function ConfirmDialog({
  request,
  onClose
}: {
  request: ConfirmRequest | null
  onClose(): void
}): JSX.Element {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title={request?.title ?? ''}
      description={request?.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Giữ
          </Button>
          <Button
            color="danger"
            variant="solid"
            onClick={() => {
              request?.onConfirm()
              onClose()
            }}
          >
            {request?.confirmLabel}
          </Button>
        </>
      }
    />
  )
}
