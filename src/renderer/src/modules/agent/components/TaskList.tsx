import { useEffect, type JSX } from 'react'
import type {
  AgentTaskCommand,
  AgentTaskItemState,
  AgentTaskReason,
  AgentTaskState,
  AgentTaskSummary
} from '../../../../../shared/contracts/agentTask'
import { Badge, type BadgeColor } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { TASK_STATE_LABELS, useTaskStore } from '../store/taskStore'
import { UsageDisplay } from './UsageDisplay'

const STATE_COLORS: Record<AgentTaskState, BadgeColor> = {
  queued: 'neutral',
  running: 'info',
  pausing: 'info',
  paused: 'warning',
  waiting_user: 'warning',
  cancelling: 'neutral',
  cancelled: 'neutral',
  completed: 'success',
  partially_completed: 'warning',
  failed: 'error'
}

const ITEM_LABELS: Record<AgentTaskItemState, { label: string; color: BadgeColor }> = {
  queued: { label: 'Đang chờ', color: 'neutral' },
  running: { label: 'Đang dịch', color: 'info' },
  waiting_user: { label: 'Chờ bạn', color: 'warning' },
  completed: { label: 'Xong', color: 'success' },
  failed: { label: 'Lỗi', color: 'error' },
  skipped: { label: 'Bỏ qua', color: 'neutral' },
  cancelled: { label: 'Đã hủy', color: 'neutral' }
}

export const REASON_LABELS: Record<AgentTaskReason, string> = {
  missing_raw: 'chương chưa có bản gốc',
  conflict: 'nội dung đã đổi, cần bạn xem lại',
  budget: 'đã chạm trần ngân sách',
  provider: 'kết nối hoặc model báo lỗi',
  refused: 'nhà cung cấp từ chối một số đoạn',
  context_review: 'cần duyệt ngữ cảnh',
  app_closed: 'ứng dụng đã đóng',
  recovered_after_restart: 'khôi phục sau khi mở lại',
  user: 'bạn đã tạm dừng'
}

/** The commands a task in `state` accepts (transition table of the spec). */
const COMMANDS: Record<AgentTaskState, Array<{ command: AgentTaskCommand; label: string }>> = {
  queued: [
    { command: 'pause', label: 'Tạm dừng' },
    { command: 'cancel', label: 'Hủy' }
  ],
  running: [
    { command: 'pause', label: 'Tạm dừng' },
    { command: 'cancel', label: 'Hủy' }
  ],
  pausing: [{ command: 'cancel', label: 'Hủy' }],
  paused: [
    { command: 'continue', label: 'Tiếp tục' },
    { command: 'cancel', label: 'Hủy' }
  ],
  waiting_user: [
    { command: 'continue', label: 'Tiếp tục' },
    { command: 'cancel', label: 'Hủy' }
  ],
  cancelling: [],
  failed: [
    { command: 'retry', label: 'Thử lại' },
    { command: 'run_again', label: 'Chạy lại' }
  ],
  partially_completed: [
    { command: 'retry', label: 'Thử lại mục lỗi' },
    { command: 'run_again', label: 'Chạy lại' }
  ],
  completed: [{ command: 'run_again', label: 'Chạy lại' }],
  cancelled: [{ command: 'run_again', label: 'Chạy lại' }]
}

export interface TaskListProps {
  /** Only the tasks of this work (the work's Tasks area); all tasks when absent. */
  workId?: string
  onOpenChapter: (workId: string, chapterId: string) => void
  /** "Xem và duyệt" of a task waiting for context review. */
  onReviewContext?: (workId: string) => void
}

/** Progress in words: never "done" while an item failed or waits. */
export function taskProgressLabel(task: AgentTaskSummary): string {
  const total = Object.values(task.counts).reduce((sum, count) => sum + count, 0)
  const parts = [`${task.counts.completed}/${total} chương`]
  if (task.counts.failed > 0) parts.push(`${task.counts.failed} lỗi`)
  if (task.counts.waiting_user > 0) parts.push(`${task.counts.waiting_user} chờ bạn`)
  if (task.counts.skipped > 0) parts.push(`${task.counts.skipped} bỏ qua`)
  return parts.join(' · ')
}

function TaskRow({
  task,
  onOpenChapter,
  onReviewContext
}: {
  task: AgentTaskSummary
  onOpenChapter: TaskListProps['onOpenChapter']
  onReviewContext: TaskListProps['onReviewContext']
}): JSX.Element {
  const detail = useTaskStore((s) => s.details[task.id])
  const control = useTaskStore((s) => s.control)
  const expand = useTaskStore((s) => s.expand)
  const collapse = useTaskStore((s) => s.collapse)
  const total = Object.values(task.counts).reduce((sum, count) => sum + count, 0)
  const running = task.state === 'running' || task.state === 'pausing'
  const progressLabel = taskProgressLabel(task)

  return (
    <li className="flex flex-col gap-sm border-b border-subtle px-md py-sm last:border-b-0">
      <div className="flex flex-wrap items-start gap-sm">
        <div className="flex min-w-0 flex-1 flex-col gap-3xs">
          <span className="truncate text-label-sm">
            Dịch {total} chương · {task.workTitle}
          </span>
          <span className="truncate text-body-xs text-muted">{task.modelLabel}</span>
        </div>
        <Badge color={STATE_COLORS[task.state]} dot>
          {TASK_STATE_LABELS[task.state]}
          {task.reason ? ` · ${REASON_LABELS[task.reason]}` : ''}
        </Badge>
      </div>
      <div className="flex items-center gap-xs">
        <ProgressBar
          value={total === 0 ? 0 : (task.counts.completed / total) * 100}
          tone={task.state === 'failed' ? 'error' : running ? 'info' : 'neutral'}
          label={`Tác vụ dịch ${task.workTitle}: ${progressLabel}`}
        />
        <span className="shrink-0 text-body-xs whitespace-nowrap text-muted tabular-nums">
          {progressLabel}
        </span>
      </div>
      <UsageDisplay usage={task.usage} />
      <div className="flex flex-wrap items-center gap-xs">
        {task.reason === 'context_review' && onReviewContext && (
          <Button variant="solid" onClick={() => onReviewContext(task.workId)}>
            Xem và duyệt
          </Button>
        )}
        {COMMANDS[task.state].map(({ command, label }) => (
          <Button
            key={command}
            variant={command === 'continue' || command === 'retry' ? 'solid' : 'outline'}
            color={command === 'cancel' ? 'danger' : 'neutral'}
            onClick={() => void control(task.id, command)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="ghost"
          aria-expanded={detail !== undefined}
          onClick={() => (detail ? collapse(task.id) : void expand(task.id))}
        >
          {detail ? 'Ẩn các chương' : 'Xem các chương'}
        </Button>
      </div>
      {detail && (
        <ol aria-label="Các chương của tác vụ" className="m-0 flex list-none flex-col gap-2xs p-0">
          {detail.items.map((item) => {
            const look = ITEM_LABELS[item.state]
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-xs text-body-sm">
                <span className="min-w-0 flex-1 truncate">{item.chapterLabel}</span>
                {item.progress && (
                  <span className="text-body-xs text-muted tabular-nums">
                    {item.progress.applied}/{item.progress.total} câu
                    {item.skippedSegments.length > 0
                      ? ` · bỏ qua ${item.skippedSegments.length} đoạn`
                      : ''}
                  </span>
                )}
                <Badge color={look.color} variant="plain" dot>
                  {look.label}
                  {item.reason ? ` · ${REASON_LABELS[item.reason]}` : ''}
                </Badge>
                {item.state === 'failed' && item.reason === 'refused' && (
                  <Button onClick={() => void control(task.id, 'skip_refused', item.id)}>
                    Bỏ qua đoạn bị từ chối
                  </Button>
                )}
                {(item.state === 'queued' ||
                  item.state === 'waiting_user' ||
                  item.state === 'failed') && (
                  <Button
                    variant="ghost"
                    onClick={() => void control(task.id, 'skip_item', item.id)}
                  >
                    Bỏ qua chương
                  </Button>
                )}
                <Button variant="ghost" onClick={() => onOpenChapter(task.workId, item.chapterId)}>
                  Mở đích
                </Button>
              </li>
            )
          })}
        </ol>
      )}
    </li>
  )
}

/** Durable tasks read from Main; refetched on mount and on every `agentTaskChanged`. */
export function TaskList({ workId, onOpenChapter, onReviewContext }: TaskListProps): JSX.Element {
  const tasks = useTaskStore((s) => s.tasks)
  const load = useTaskStore((s) => s.load)
  const lastError = useTaskStore((s) => s.lastError)
  const announcement = useTaskStore((s) => s.announcement)
  const refresh = useTaskStore((s) => s.refresh)
  const listen = useTaskStore((s) => s.listen)

  useEffect(() => {
    void refresh()
    return listen()
  }, [refresh, listen])

  const shown = workId ? tasks.filter((task) => task.workId === workId) : tasks
  return (
    <div className="flex flex-col gap-sm">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {lastError && (
        <p role="alert" className="m-0 text-body-sm text-error">
          {lastError}
        </p>
      )}
      {shown.length === 0 ? (
        <EmptyState title={load === 'loading' ? 'Đang tải tác vụ…' : 'Chưa có tác vụ'}>
          Nhờ Trợ lý dịch một dải chương, tác vụ sẽ hiện ở đây.
        </EmptyState>
      ) : (
        <ul
          aria-label="Tác vụ"
          className="m-0 list-none overflow-hidden rounded-lg border border-default bg-surface p-0"
        >
          {shown.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpenChapter={onOpenChapter}
              onReviewContext={onReviewContext}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
