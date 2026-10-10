import type { JSX } from 'react'
import { ArrowUpIcon } from '@solar-icons/react/linear/arrow-up'
import { CloseCircleIcon } from '@solar-icons/react/linear/close-circle'
import { PauseIcon } from '@solar-icons/react/linear/pause'
import { PageFrame } from '../../../components/ui/PageFrame'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { CompactButton } from '../../../components/ui/CompactButton'
import { ICON } from '../../../components/ui/icon'
import { ProgressBar } from '../../../components/ui/ProgressBar'

import { cn } from '../../../lib/cn'
import { MOCK_WORKS, MockCover, type MockWork } from '../../../components/ui/mockParts'

type JobState = 'running' | 'error' | 'queued'

/** Fixed sample data: what the queue across every work would hold. */
const JOBS: {
  work: MockWork
  task: string
  model: string
  done: number
  total: number
  speed: string
  tokens: string
  cost: string
  eta: string
  state: JobState
}[] = [
  {
    work: MOCK_WORKS.pntt,
    task: 'Dịch chương 1.205–1.250',
    model: 'gemini-3.5-flash',
    done: 19,
    total: 47,
    speed: '2,1 chương/phút',
    tokens: '412k',
    cost: '$0,31',
    eta: '~13 phút',
    state: 'running'
  },
  {
    work: MOCK_WORKS.qbcc,
    task: 'Trích nhân vật và thuật ngữ, ch. 1–412',
    model: 'gemini-3.5-flash-lite',
    done: 252,
    total: 412,
    speed: '41 chương/phút',
    tokens: '1,9 tr',
    cost: '$0,12',
    eta: '~4 phút',
    state: 'running'
  },
  {
    work: MOCK_WORKS.dtcd,
    task: 'Dịch chương 231–260',
    model: 'openrouter · deepseek-v4',
    done: 7,
    total: 30,
    speed: '—',
    tokens: '96k',
    cost: '$0,05',
    eta: 'Thử lại 14:30',
    state: 'error'
  },
  {
    work: MOCK_WORKS.kl,
    task: 'Dịch 3 chương mới (89–91)',
    model: 'gemini-3.5-flash',
    done: 0,
    total: 3,
    speed: '—',
    tokens: '—',
    cost: '~$0,02',
    eta: 'Chờ',
    state: 'queued'
  }
]

/** Bar heights of the speed chart, in percent of its height. */
const SPEED = Array.from(
  { length: 60 },
  (_, i) => 18 + Math.round(52 * Math.abs(Math.sin(i / 6))) + (i % 7) * 3
)

const HEAD = ['Tác phẩm và việc', 'Tiến độ', 'Tốc độ', 'Token', 'Chi phí', 'Còn lại', '']

/**
 * Picture of the app-wide job queue (MOCK_FEATURES.jobsPage; Module 7 in
 * docs/modules/proposals/sessions-and-jobs.md): every translation, extraction and export of every
 * work, with speed, tokens, cost and errors. Nothing is read or run; every control is disabled.
 */
export function JobsScreenMock(): JSX.Element {
  return (
    <PageFrame
      title="Tác vụ"
      soon
      wide
      actions={
        <Button disabled leftIcon={<PauseIcon size={ICON.sm} />}>
          Tạm dừng tất cả
        </Button>
      }
    >
      <Alert tone="error">
        Dịch chương 231–260 của Danh Thuật Của Đêm dừng ở 7/30: khoá OpenRouter hết hạn mức. Mira tự
        thử lại lúc 14:30.
      </Alert>

      <div className="flex items-end gap-md">
        <div aria-label="Bộ lọc tác vụ — sắp có" className="flex items-center gap-2xs">
          <Button disabled variant="light">
            Đang chạy · 2
          </Button>
          <Button disabled>Đang chờ · 1</Button>
          <Button disabled>Lỗi · 1</Button>
          <Button disabled>Đã xong · 24</Button>
        </div>
        <div className="flex-1" />
        <span className="pb-xs text-body-xs text-muted">Hôm nay: 1,2 triệu token · $0,48</span>
      </div>

      <section
        aria-label="Hàng đợi"
        className="overflow-hidden rounded-lg border border-default bg-surface"
      >
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-default bg-subtle">
            <tr>
              {HEAD.map((label, index) => (
                <th
                  key={label || 'actions'}
                  className={cn('h-9 px-md text-label-xs text-subtle', index > 1 && 'text-right')}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {JOBS.map((job) => {
              const failed = job.state === 'error'
              return (
                <tr key={job.task} className={failed ? 'bg-error-subtle' : undefined}>
                  <td className="px-md py-sm">
                    <div className="flex items-center gap-sm">
                      <MockCover work={job.work} />
                      <div className="min-w-0">
                        <div className="truncate text-label-sm">{job.task}</div>
                        <div className="truncate text-body-xs text-muted">
                          {job.work.title} · {job.model}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="w-[200px] px-md py-sm">
                    <div className="flex items-center gap-xs">
                      <ProgressBar
                        value={(job.done / job.total) * 100}
                        tone={failed ? 'error' : job.state === 'running' ? 'info' : 'neutral'}
                        label={`${job.task}: ${job.done} trên ${job.total}`}
                      />
                      <span className="w-14 shrink-0 text-right text-body-xs text-muted tabular-nums">
                        {job.done}/{job.total}
                      </span>
                    </div>
                    {failed && (
                      <div className="mt-2xs text-body-xs text-error">Hết hạn mức của khoá</div>
                    )}
                  </td>
                  <td className="px-md py-sm text-right text-body-sm whitespace-nowrap text-subtle tabular-nums">
                    {job.speed}
                  </td>
                  <td className="px-md py-sm text-right text-body-sm whitespace-nowrap text-subtle tabular-nums">
                    {job.tokens}
                  </td>
                  <td className="px-md py-sm text-right text-body-sm whitespace-nowrap tabular-nums">
                    {job.cost}
                  </td>
                  <td
                    className={cn(
                      'px-md py-sm text-right text-body-sm whitespace-nowrap tabular-nums',
                      failed ? 'text-error' : 'text-subtle'
                    )}
                  >
                    {job.eta}
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex justify-end gap-2xs">
                      {failed ? (
                        <Button disabled>Thử lại</Button>
                      ) : job.state === 'running' ? (
                        <CompactButton
                          disabled
                          aria-label="Tạm dừng"
                          icon={<PauseIcon size={ICON.sm} />}
                        />
                      ) : (
                        <CompactButton
                          disabled
                          aria-label="Chạy trước"
                          icon={<ArrowUpIcon size={ICON.sm} />}
                        />
                      )}
                      <CompactButton
                        disabled
                        aria-label="Huỷ"
                        icon={<CloseCircleIcon size={ICON.sm} />}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section
        aria-label="Tốc độ 30 phút qua"
        className="rounded-lg border border-default bg-surface"
      >
        <header className="flex h-11 items-center justify-between border-b border-subtle px-md">
          <h2 className="m-0 text-heading">Tốc độ 30 phút qua</h2>
          <span className="text-body-xs text-muted">2 request đang chạy · giới hạn 4</span>
        </header>
        <div aria-hidden="true" className="flex h-28 items-end gap-3xs px-md py-sm">
          {SPEED.map((height, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed picture, never reordered
              key={index}
              className="flex-1 rounded-t-xs bg-line-strong"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </section>
    </PageFrame>
  )
}
