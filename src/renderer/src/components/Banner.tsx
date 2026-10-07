import type { JSX, ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'

export interface BannerProps {
  /** `error` is announced at once; `success` politely, since the user already knows they asked. */
  tone: 'error' | 'success'
  children: ReactNode
  /** An optional extra action, e.g. "Mở tác phẩm". */
  action?: { label: string; onClick(): void }
  onDismiss(): void
}

/** A message above a screen, dismissed by the user. */
export function Banner({ tone, children, action, onDismiss }: BannerProps): JSX.Element {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex items-start justify-between gap-3 rounded-panel border px-3 py-2 text-ui-xs',
        tone === 'error' ? 'border-error/30 bg-error/8' : 'border-success/30 bg-success/8'
      )}
    >
      <span className="min-w-0 break-words">{children}</span>
      <span className="flex shrink-0 items-center gap-1">
        {action && (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        <Button variant="ghost-muted" size="sm" onClick={onDismiss}>
          Đóng
        </Button>
      </span>
    </div>
  )
}
