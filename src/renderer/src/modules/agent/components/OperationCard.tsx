import { useState, type JSX } from 'react'
import type { AgentOperation, ResolvedTarget } from '../../../../../shared/contracts/agent'
import { Button } from '../../../components/ui/Button'

export interface OperationCardProps {
  operation: AgentOperation
  onOpenTarget?: (target: ResolvedTarget) => void
  onCancel?: (operationId: string) => void
  onUndo?: (operationId: string) => void
}

function stateInfo(state: AgentOperation['state']): { label: string; colorClass: string } {
  switch (state) {
    case 'queued':
      return { label: 'Đang chờ', colorClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' }
    case 'running':
      return { label: 'Đang chạy', colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' }
    case 'completed':
      return {
        label: 'Hoàn tất',
        colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
      }
    case 'partially_completed':
      return { label: 'Một phần', colorClass: 'text-amber-700 bg-amber-100 dark:bg-amber-900/40' }
    case 'conflict':
      return { label: 'Xung đột', colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' }
    case 'cancelled':
      return { label: 'Đã dừng', colorClass: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800' }
    case 'undone':
      return {
        label: 'Đã hoàn tác',
        colorClass: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40'
      }
    default:
      return { label: state, colorClass: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800' }
  }
}

export function OperationCard({
  operation,
  onOpenTarget,
  onCancel,
  onUndo
}: OperationCardProps): JSX.Element {
  const [showDetail, setShowDetail] = useState(false)
  const st = stateInfo(operation.state)
  const target = operation.target

  const targetLabel =
    target?.kind === 'chapter'
      ? `${target.workLabel} › ${target.chapterLabel}`
      : target?.kind === 'work'
        ? target.workLabel
        : 'Toàn thư viện'

  const progress = operation.progress
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : null

  const isRunning = operation.state === 'running' || operation.state === 'queued'
  const canUndo = operation.state === 'completed' || operation.state === 'partially_completed'

  return (
    <div
      data-operation-id={operation.id}
      data-operation-state={operation.state}
      className="my-2.5 rounded-lg border border-neutral-200 bg-white p-3 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-label-xs">
            {operation.capability === 'translate_chapter' ? 'Dịch chương' : operation.capability}
          </span>
          <span className="truncate text-body-xs text-neutral-500 dark:text-neutral-400">
            {targetLabel}
          </span>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-label-xs font-medium ${st.colorClass}`}
        >
          {st.label}
        </span>
      </div>

      {progress && (
        <div className="mt-2.5 flex flex-col gap-1">
          <div className="flex justify-between text-label-xs text-neutral-500">
            <span>Tiến độ:</span>
            <span>
              {progress.completed} / {progress.total} {progress.unit} ({percent}%)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons (Task 6.7: Mở đích, Dừng, Hoàn tác, Xem chi tiết) */}
      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-body-xs dark:border-neutral-800/80">
        <div className="flex items-center gap-2">
          {target && onOpenTarget && (
            <Button
              variant="ghost"
              onClick={() => onOpenTarget(target)}
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Mở đích
            </Button>
          )}

          {isRunning && onCancel && (
            <Button
              variant="ghost"
              onClick={() => onCancel(operation.id)}
              className="font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Dừng
            </Button>
          )}

          {canUndo && onUndo && (
            <Button
              variant="ghost"
              onClick={() => onUndo(operation.id)}
              className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Hoàn tác
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={() => setShowDetail(!showDetail)}
          className="text-label-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          {showDetail ? 'Ẩn chi tiết' : 'Xem chi tiết'}
        </Button>
      </div>

      {showDetail && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-neutral-50 p-2 font-mono text-body-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
          {JSON.stringify(
            {
              id: operation.id,
              commandId: operation.commandId,
              target: operation.target,
              progress: operation.progress,
              result: operation.result,
              error: operation.error
            },
            null,
            2
          )}
        </pre>
      )}
    </div>
  )
}
