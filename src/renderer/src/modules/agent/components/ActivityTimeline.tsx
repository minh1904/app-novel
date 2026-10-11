import { useState, type JSX } from 'react'
import type { AgentActivity } from '../../../../../shared/contracts/agent'
import { Button } from '../../../components/ui/Button'

export interface ActivityTimelineProps {
  activities: AgentActivity[]
}

function kindIcon(kind: AgentActivity['kind']): string {
  switch (kind) {
    case 'thinking':
      return '💭'
    case 'read':
      return '🔍'
    case 'write':
      return '✍️'
    case 'resolve':
      return '🎯'
    case 'progress':
      return '⏳'
    case 'result':
      return '📋'
    default:
      return '⚡'
  }
}

function stateBadge(state: AgentActivity['state']): { text: string; className: string } {
  switch (state) {
    case 'pending':
      return {
        text: 'Chờ',
        className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
      }
    case 'running':
      return {
        text: 'Đang chạy',
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
      }
    case 'completed':
      return {
        text: 'Hoàn tất',
        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
      }
    case 'failed':
      return {
        text: 'Lỗi',
        className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      }
    case 'cancelled':
      return {
        text: 'Đã dừng',
        className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
      }
    default:
      return {
        text: state,
        className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
      }
  }
}

export function ActivityTimeline({ activities }: ActivityTimelineProps): JSX.Element | null {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  if (!activities || activities.length === 0) return null

  // Sort activities by stepSeq ascending
  const sorted = [...activities].sort((a, b) => a.stepSeq - b.stepSeq)

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="my-2 flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-neutral-50/50 p-2.5 text-body-xs dark:border-neutral-800 dark:bg-neutral-900/30">
      <div className="mb-1 text-label-xs font-semibold uppercase tracking-wider text-neutral-500">
        Dòng hoạt động ({sorted.length})
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((act) => {
          const badge = stateBadge(act.state)
          const isExpanded = !!expandedIds[act.id]
          const detailStr = act.detail ? JSON.stringify(act.detail, null, 2) : null

          return (
            <div
              key={act.id}
              data-activity-id={act.id}
              data-activity-state={act.state}
              className="flex flex-col rounded border border-neutral-200/80 bg-white p-2 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 text-body-sm">{kindIcon(act.kind)}</span>
                  <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                    {act.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`rounded px-1.5 py-0.5 text-label-xs font-medium ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                  {detailStr && (
                    <Button
                      variant="ghost"
                      onClick={() => toggleExpand(act.id)}
                      className="text-label-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {isExpanded ? 'Ẩn' : 'Chi tiết'}
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && detailStr && (
                <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-neutral-100 p-1.5 font-mono text-body-xs text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300">
                  {detailStr}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
