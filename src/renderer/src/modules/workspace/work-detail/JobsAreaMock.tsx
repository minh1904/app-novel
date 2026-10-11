import type { JSX } from 'react'
import {
  CheckCircleIcon,
  DangerTriangleIcon,
  HistoryIcon,
  RefreshIcon
} from '@renderer/components/ui/reicon'

import { Button } from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'
import { SOON_LABEL } from '../../../lib/mockFeatures'

type JobStatus = 'running' | 'error' | 'done'

/** Dữ liệu mẫu cố định: hiển thị minh họa nội dung khu vực tác vụ AI. */
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
  done: {
    label: 'Hoàn tất',
    icon: <CheckCircleIcon size={12} />,
    tone: 'bg-success/14 text-success'
  }
}

const jobGrid =
  'grid grid-cols-[minmax(0,1fr)_84px_120px_auto] items-center gap-3 @max-[620px]:grid-cols-[minmax(0,1fr)_84px_auto]'
const hideBelow620 = '@max-[620px]:hidden'

/**
 * Minh họa khu vực tác vụ AI: các lượt dịch đang chạy, thất bại hoặc hoàn tất,
 * kèm thông tin chi phí và nhà cung cấp. Không đọc hoặc ghi dữ liệu thực tế.
 */
export function JobsAreaMock(): JSX.Element {
  return (
    <section
      aria-labelledby="jobs-heading"
      className="@container flex flex-col gap-4 rounded-lg border border-default p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="jobs-heading" className="flex items-center gap-2 text-body-md font-semibold">
          Tác vụ dịch
          <span className="rounded-sm bg-selected px-1.5 py-px text-body-xs font-normal text-subtle">
            {SOON_LABEL}
          </span>
        </h2>
        <p className="max-w-[60ch] text-body-xs leading-normal text-subtle">
          Theo dõi các lượt AI dịch của tác phẩm: đang chạy, lỗi cần chạy lại, và lịch sử chi phí.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-default">
        <div
          className={cn(
            jobGrid,
            'border-b border-default bg-subtle px-3 py-2 text-body-xs font-medium text-subtle'
          )}
        >
          <span>Chương</span>
          <span className={cn('text-right', hideBelow620)}>Chi phí</span>
          <span className={hideBelow620}>Thời gian</span>
          <span />
        </div>
        <ul>
          {JOBS.map((job, index) => {
            const meta = statusMeta[job.status]
            return (
              <li
                key={index}
                className={cn(
                  jobGrid,
                  'border-b border-default px-3 py-2.5 text-body-sm last:border-b-0'
                )}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-body-xs font-semibold whitespace-nowrap',
                        meta.tone
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="truncate font-medium">{job.chapter}</span>
                  </div>
                  <span className="truncate text-body-xs text-subtle">{job.provider}</span>
                  {job.status === 'running' && job.progress !== undefined && (
                    <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-info"
                        style={{ width: job.progress + '%' }}
                      />
                    </div>
                  )}
                </div>
                <span className={cn('text-right text-subtle', hideBelow620)}>{job.cost}</span>
                <span className={cn('truncate text-subtle', hideBelow620)}>{job.time}</span>
                <span className="flex justify-end">
                  {job.status === 'error' && <Button disabled>Chạy lại</Button>}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <Button variant="ghost" disabled className="w-fit">
        <HistoryIcon size={14} />
        Xem toàn bộ lịch sử
      </Button>

      <p className="text-body-xs text-subtle">
        Bản minh họa: khu vực này chưa hoạt động và không thay đổi tác phẩm của bạn.
      </p>
    </section>
  )
}
