import type { JSX, ReactNode } from 'react'
import type { SessionStatus } from '../editor/editorSession'

const STATE_LABEL: Record<SessionStatus['state'], string> = {
  saved: 'Đã lưu',
  dirty: 'Chưa lưu',
  saving: 'Đang lưu…',
  conflict: 'Chưa lưu',
  error: 'Chưa lưu'
}

/**
 * One side of the full-text editor: what it is, whether its text is safe, and the controls that
 * belong to it. The text itself is the child; the pane never looks inside it.
 *
 * The pane is the bordered box, so the text inside draws no border of its own, and the name, the
 * figures and the save state share one line to leave the height to the text.
 */
export function EditorPane({
  title,
  subtitle,
  status,
  lockLabel,
  actions,
  notice,
  children
}: {
  title: string
  subtitle: string
  status: SessionStatus
  /** Said before the save state while the text is locked, so a screen reader hears both. */
  lockLabel?: string
  actions?: ReactNode
  notice?: ReactNode
  children: ReactNode
}): JSX.Element {
  const saved = status.state === 'saved'
  return (
    <section
      aria-label={title}
      className="flex min-h-0 min-w-0 flex-col gap-2 rounded-panel border border-line bg-sidebar p-3"
    >
      <div className="flex min-h-6 min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="shrink-0 text-[13px] font-semibold">{title}</h3>
          <p className="truncate text-xs text-ink-muted">{subtitle}</p>
          <p
            role="status"
            className="flex shrink-0 items-center gap-1 text-[11px] whitespace-nowrap text-ink-muted"
          >
            <span
              aria-hidden="true"
              className={'size-1.5 shrink-0 rounded-full ' + (saved ? 'bg-success' : 'bg-warning')}
            />
            {lockLabel ? lockLabel + ' · ' : ''}
            {STATE_LABEL[status.state]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      {notice}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
