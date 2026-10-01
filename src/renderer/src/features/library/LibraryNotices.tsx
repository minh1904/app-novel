import type { JSX } from 'react'
import type { WorkProblem } from '../../../../shared/library'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'

const reasons: Partial<Record<WorkProblem['code'], string>> = {
  corrupt: 'Tệp bị hỏng hoặc không phải dữ liệu Mira.',
  unsupported_version: 'Tệp được tạo bởi phiên bản Mira mới hơn. Hãy cập nhật Mira.',
  io: 'Không đọc được tệp.'
}

/** Messages that sit above the library: unreadable work files and failed actions. */
export function LibraryNotices({
  problems,
  notice,
  onDismissNotice,
  success,
  onDismissSuccess,
  onOpenWork
}: {
  problems: WorkProblem[]
  notice: string | null
  onDismissNotice(): void
  success?: { message: string; workId?: string } | null
  onDismissSuccess?(): void
  onOpenWork?(workId: string): void
}): JSX.Element | null {
  if (problems.length === 0 && !notice && !success) return null

  return (
    <div className="flex flex-col gap-3">
      {success && (
        <Banner
          tone="success"
          onDismiss={() => onDismissSuccess?.()}
          action={
            success.workId && onOpenWork
              ? { label: 'Mở tác phẩm', onClick: () => onOpenWork(success.workId!) }
              : undefined
          }
        >
          {success.message}
        </Banner>
      )}
      {notice && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-control border border-error/40 bg-error/8 px-3.5 py-2.5 text-xs"
        >
          <span>{notice}</span>
          <Button variant="ghost-muted" size="sm" onClick={onDismissNotice}>
            Đóng
          </Button>
        </div>
      )}
      {problems.length > 0 && (
        <section
          aria-label="Tác phẩm không mở được"
          className="flex flex-col gap-1.5 rounded-control border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-xs"
        >
          <p className="font-semibold">
            {problems.length === 1
              ? '1 tệp tác phẩm không mở được'
              : problems.length + ' tệp tác phẩm không mở được'}
          </p>
          <ul className="flex flex-col gap-1 text-ink-muted">
            {problems.map((problem) => (
              <li key={problem.fileName}>
                <span className="font-mono text-[12px] text-ink">{problem.fileName}</span>
                {' — '}
                {reasons[problem.code] ?? problem.message}
              </li>
            ))}
          </ul>
          <p className="text-ink-muted">
            Các tác phẩm khác vẫn dùng bình thường; tệp không bị xóa.
          </p>
        </section>
      )}
    </div>
  )
}
