import type { JSX } from 'react'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { useNotificationStore, type Toast } from '../stores/notificationStore'
import { Button } from './Button'
import { cx } from './cx'

const TONE: Record<Toast['kind'], string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error'
}

function ToastCard({ toast }: { toast: Toast }): JSX.Element {
  const dismiss = useNotificationStore((state) => state.dismiss)
  const loud = toast.kind === 'error' || toast.kind === 'warning'
  return (
    <div
      role={loud ? 'alert' : 'status'}
      data-slot="toast"
      className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-panel border border-line-strong bg-popover px-3 py-2.5 text-ink shadow-popover backdrop-blur-md"
    >
      <span className={cx('mt-1.5 size-1.5 shrink-0 rounded-full', TONE[toast.kind])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ui-sm font-medium">{toast.title}</span>
        {toast.message && (
          <span className="selectable text-ui-xs leading-normal break-words text-ink-muted">
            {toast.message}
          </span>
        )}
        {toast.action && (
          <Button
            variant="text"
            size="xs"
            className="mt-1 self-start"
            onClick={() => {
              toast.action?.onClick()
              dismiss(toast.id)
            }}
          >
            {toast.action.label}
          </Button>
        )}
      </div>
      <Button
        variant="ghost-muted"
        size="icon"
        aria-label="Đóng thông báo"
        onClick={() => dismiss(toast.id)}
      >
        <CloseIcon size={12} />
      </Button>
    </div>
  )
}

/** Mounted once; quiet toasts stack bottom-right, ones that need reading stack at the top centre. */
export function Toaster(): JSX.Element {
  return <ToastStacks toasts={useNotificationStore((state) => state.toasts)} />
}

export function ToastStacks({ toasts }: { toasts: Toast[] }): JSX.Element {
  const quiet = toasts.filter((toast) => toast.placement === 'bottom-right')
  const sticky = toasts.filter((toast) => toast.placement === 'top-center')
  return (
    <>
      <div className="pointer-events-none fixed top-12 left-1/2 z-(--z-over-modal) flex -translate-x-1/2 flex-col gap-2">
        {sticky.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
      <div className="pointer-events-none fixed right-4 bottom-4 z-(--z-over-modal) flex flex-col items-end gap-2">
        {quiet.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
    </>
  )
}
