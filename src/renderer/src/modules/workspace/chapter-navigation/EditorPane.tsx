import type { JSX, ReactNode } from 'react'
import type { SessionStatus } from '../chapter-editor/editorSession'

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
 * Square and flush against the panes next to it — the grid's own `divide-x` draws the one-pixel
 * line between them, so the pane has no border or radius of its own, and the text inside draws no
 * border of its own either. The name, the figures and the save state share one line to leave the
 * height to the text.
 */
export function EditorPane({
  title,
  subtitle,
  status,
  lockLabel,
  lockIcon,
  actions,
  notice,
  children
}: {
  title: string
  subtitle: string
  status: SessionStatus
  /** Said before the save state while the text is locked, so a screen reader hears both. */
  lockLabel?: string
  /** Shown next to the title for the same state as `lockLabel`; hidden from screen readers. */
  lockIcon?: ReactNode
  actions?: ReactNode
  notice?: ReactNode
  children: ReactNode
}): JSX.Element {
  // "Đã lưu" is said once, in the chapter's status bar. A pane speaks up only when its own side is
  // not saved, so the reader can tell which of the two still needs it.
  const saved = status.state === 'saved'
  return (
    <section
      aria-label={title}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-surface p-3"
    >
      <div className="flex min-h-6 min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="shrink-0 text-body-sm font-semibold">{title}</h3>
          {lockIcon}
          <p className="truncate text-body-xs text-subtle">{subtitle}</p>
          <p
            role="status"
            className="flex shrink-0 items-center gap-1 text-body-xs whitespace-nowrap text-subtle"
          >
            {/* The lock is an icon on screen; a screen reader hears it with the save state. */}
            {lockLabel && <span className="sr-only">{lockLabel}</span>}
            {!saved && (
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
            )}
            {!saved && STATE_LABEL[status.state]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      {notice}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
