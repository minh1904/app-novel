import { useState, type JSX } from 'react'
import type { AgentActivity } from '../../../../../shared/contracts/agent'
import { Badge, type BadgeColor } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'

export interface ActivityTimelineProps {
  activities: AgentActivity[]
}

function stateBadge(state: AgentActivity['state']): { text: string; color: BadgeColor } {
  switch (state) {
    case 'pending':
      return { text: 'Chờ', color: 'neutral' }
    case 'running':
      return { text: 'Đang chạy', color: 'info' }
    case 'completed':
      return { text: 'Hoàn tất', color: 'success' }
    case 'failed':
      return { text: 'Lỗi', color: 'error' }
    case 'cancelled':
      return { text: 'Đã dừng', color: 'neutral' }
    default:
      return { text: state, color: 'neutral' }
  }
}

export function ActivityTimeline({ activities }: ActivityTimelineProps): JSX.Element | null {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  if (!activities || activities.length === 0) return null

  const sorted = [...activities].sort((a, b) => a.stepSeq - b.stepSeq)

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <ol
      aria-label={`Dòng hoạt động (${sorted.length})`}
      className="m-0 flex list-none flex-col gap-2xs p-0"
    >
      {sorted.map((act) => {
        const badge = stateBadge(act.state)
        const isExpanded = !!expandedIds[act.id]
        const detailStr = act.detail ? JSON.stringify(act.detail, null, 2) : null

        return (
          <li
            key={act.id}
            data-activity-id={act.id}
            data-activity-state={act.state}
            className="flex flex-col gap-2xs text-body-xs"
          >
            <div className="flex items-center justify-between gap-xs">
              <span className="min-w-0 truncate text-subtle">{act.label}</span>
              <span className="flex shrink-0 items-center gap-2xs">
                <Badge color={badge.color} variant="plain" dot>
                  {badge.text}
                </Badge>
                {detailStr && (
                  <Button
                    variant="ghost"
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(act.id)}
                  >
                    {isExpanded ? 'Ẩn' : 'Chi tiết'}
                  </Button>
                )}
              </span>
            </div>
            {isExpanded && detailStr && (
              <pre className="max-h-40 overflow-auto rounded-sm bg-subtle p-xs font-mono text-body-xs text-subtle">
                {detailStr}
              </pre>
            )}
          </li>
        )
      })}
    </ol>
  )
}
