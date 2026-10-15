import { useEffect, useRef, useState, type JSX } from 'react'
import type { AgentOperation } from '../../../../../shared/contracts/agent'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { ButtonGroup } from '../../../components/ui/ButtonGroup'
import { EmptyState } from '../../../components/ui/EmptyState'
import { cn } from '../../../lib/cn'
import { CAPABILITY_LABELS, stateInfo } from './OperationCard'
import { UsageDisplay } from './UsageDisplay'

const LIMIT = 200

type Filter = 'all' | 'problem' | 'running'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'problem', label: 'Có lỗi' },
  { value: 'running', label: 'Đang chạy' }
]

const PROBLEM: ReadonlySet<AgentOperation['state']> = new Set([
  'failed',
  'conflict',
  'partially_completed'
])

/** What a log row says about the run: the error first, otherwise the runner's own summary. */
export function operationMessage(operation: AgentOperation): string | null {
  const read = (value: unknown, key: string): string | null => {
    if (!value || typeof value !== 'object') return null
    const text = (value as Record<string, unknown>)[key]
    return typeof text === 'string' && text.trim() !== '' ? text : null
  }
  return read(operation.error, 'message') ?? read(operation.result, 'summary')
}

const timeOf = (at: number): string =>
  new Date(at).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

const durationOf = (ms: number): string =>
  ms < 60_000 ? `${Math.round(ms / 1000)} giây` : `${Math.round(ms / 60_000)} phút`

/**
 * Nhật ký AI: mọi lượt AI chạy của chat và tác vụ, mới nhất trước, kèm lỗi hoặc tóm tắt và lượng dùng.
 * Tự tải lại khi một tác vụ đổi; lượt của chat cần bấm Tải lại.
 */
export function OperationLog(): JSX.Element {
  const [operations, setOperations] = useState<AgentOperation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const seq = useRef(0)

  const load = async (): Promise<void> => {
    const api = window.mira?.agent
    if (!api) return
    const mine = ++seq.current
    const res = await api.operations.list(LIMIT)
    if (mine !== seq.current) return
    if (res.ok) {
      setOperations(res.value)
      setError(null)
    } else setError(res.error.message)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscribe once; load reads only refs.
  useEffect(() => {
    void load()
    return window.mira?.agent?.tasks.onChanged(() => void load())
  }, [])

  const shown = (operations ?? []).filter((operation) =>
    filter === 'problem'
      ? PROBLEM.has(operation.state)
      : filter === 'running'
        ? operation.state === 'running' || operation.state === 'queued'
        : true
  )

  return (
    <section aria-label="Nhật ký AI" className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <ButtonGroup
          label="Lọc nhật ký"
          value={filter}
          options={FILTERS}
          onChange={(value) => setFilter(value)}
        />
        <Button onClick={() => void load()}>Tải lại</Button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-body-sm text-error">
          Không đọc được nhật ký: {error}
        </p>
      )}
      {operations !== null && shown.length === 0 && (
        <EmptyState title="Chưa có lượt nào">
          Các lượt AI chạy từ chat và tác vụ sẽ hiện ở đây.
        </EmptyState>
      )}
      <ul className="m-0 list-none divide-y divide-subtle p-0">
        {shown.map((operation) => {
          const state = stateInfo(operation.state)
          const message = operationMessage(operation)
          const target = operation.target
          return (
            <li key={operation.id} className="flex flex-col gap-2xs py-sm">
              <div className="flex items-start justify-between gap-sm">
                <p className="m-0 min-w-0 truncate text-body-sm font-medium text-default">
                  {CAPABILITY_LABELS[operation.capability] ?? operation.capability} ·{' '}
                  {target.kind === 'chapter'
                    ? `${target.workLabel} › ${target.chapterLabel}`
                    : target.workLabel}
                </p>
                <Badge color={state.color} dot className="shrink-0">
                  {state.label}
                </Badge>
              </div>
              {message && (
                <p
                  className={cn(
                    'm-0 wrap-anywhere text-body-xs',
                    PROBLEM.has(operation.state) ? 'text-error' : 'text-subtle'
                  )}
                >
                  {message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-sm gap-y-2xs text-body-xs text-muted">
                <span>{operation.taskItemId ? 'Tác vụ' : 'Chat'}</span>
                <span>{timeOf(operation.createdAt)}</span>
                <span>{durationOf(operation.updatedAt - operation.createdAt)}</span>
                {operation.usage && <UsageDisplay usage={operation.usage} />}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
