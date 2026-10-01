import type { JSX } from 'react'
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle'
import { DangerTriangleIcon } from '@solar-icons/react/linear/danger-triangle'
import { HistoryIcon } from '@solar-icons/react/linear/history'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { SOON_LABEL } from './mockFeatures'

type JobStatus = 'running' | 'error' | 'done'

/** Fixed sample data: what the Jobs area would hold, not anything read from this work. */
interface JobRow {
  status: JobStatus
  chapter: string
  provider: string
  cost: string
  time: string
  progress?: number
}

const JOBS: JobRow[] = [
  {
    status: 'running',
    chapter: 'Chương 13',
    provider: 'OpenRouter · Claude Sonnet',
    cost: '—',
    time: 'Bắt đầu 2 phút trước',
    progress: 60
  },
  {
    status: 'error',
    chapter: 'Chương 9',
    provider: 'OpenRouter · GPT-4o-mini',
    cost: '0 ₫',
    time: '1 giờ trước'
  },
  {
    status: 'done',
    chapter: 'Chương 8',
    provider: 'OpenRouter · Claude Sonnet',
    cost: '890 ₫',
    time: 'Hôm qua'
  },
  {
    status: 'done',
    chapter: 'Chương 7',
    provider: 'OpenRouter · Claude Sonnet',
    cost: '760 ₫',
    time: '2 ngày trước'
  }
]

const statusMeta: Record<JobStatus, { label: string; icon: JSX.Element; tone: string }> = {
  running: { label: 'Đang chạy', icon: <RefreshIcon size={12} />, tone: 'bg-info/12 text-info' },
  error: { label: 'Lỗi', icon: <DangerTriangleIcon size={12} />, tone: 'bg-error/14 text-error' },
  done: { label: 'Hoàn tất', icon: <CheckCircleIcon size={12} />, tone: 'bg-success/14 text-success' }
}

const jobGrid =
  'grid grid-cols-[minmax(0,1fr)_84px_120px_auto] items-center gap-3 @max-[620px]:grid-cols-[minmax(0,1fr)_84px_auto]'
const hideBelow620 = '@max-[620px]:hidden'

/**
 * Illustration of the Jobs area: running/failed/finished AI translation runs, with cost and
 * provider. No data is read or written; every control is disabled. See delivery/backlog.md,
 * `jobs-area`.
 */
export function JobsAreaMock(): JSX.Element {
  return (
    <section
      aria-labelledby="jobs-heading"
      className="@container flex flex-col gap-4 rounded-panel border border-line p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="jobs-heading" className="flex items-center gap-2 text-[15px] font-semibold">
          Tác vụ dịch
          <span className="rounded-[5px] bg-selected px-1.5 py-px text-[11px] font-normal text-ink-muted">
            {SOON_LABEL}
          </span>
        </h2>
        <p className="max-w-[60ch] text-xs leading-[1.6] text-ink-muted">
          Theo dõi các lượt AI dịch của tác phẩm: đang chạy, lỗi cần chạy lại, và lịch sử chi phí.
        </p>
      </div>

      <div className="overflow-hidden rounded-panel border border-line">
        <div
          className={cx(
            jobGrid,
            'border-b border-line bg-sidebar px-3 py-2 text-[12px] font-medium text-ink-muted'
          )}
        >
          <span>Chương</span>
          <span className={cx('text-right', hideBelow620)}>Chi phí</span>
          <span className={hideBelow620}>Thời gian</span>
          <span />
        </div>
        <ul>
          {JOBS.map((job, index) => {
            const meta = statusMeta[job.status]
            return (
              <li
                key={index}
                className={cx(jobGrid, 'border-b border-line px-3 py-2.5 text-[13px] last:border-b-0')}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        'flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                        meta.tone
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="truncate font-medium">{job.chapter}</span>
                  </div>
                  <span className="truncate text-[12px] text-ink-muted">{job.provider}</span>
                  {job.status === 'running' && job.progress !== undefined && (
                    <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-control">
                      <div
                        className="h-full rounded-full bg-info"
                        style={{ width: job.progress + '%' }}
                      />
                    </div>
                  )}
                </div>
                <span className={cx('text-right text-ink-muted', hideBelow620)}>
                  {job.cost}
                </span>
                <span className={cx('truncate text-ink-muted', hideBelow620)}>{job.time}</span>
                <span className="flex justify-end">
                  {job.status === 'error' && (
                    <Button variant="outline" size="xs" disabled>
                      Chạy lại
                    </Button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <Button variant="ghost-muted" size="sm" disabled className="w-fit">
        <HistoryIcon size={13} />
        Xem toàn bộ lịch sử
      </Button>

      <p className="text-[12px] text-ink-muted">
        Bản minh họa: khu vực này chưa hoạt động và không thay đổi tác phẩm của bạn.
      </p>
    </section>
  )
}
