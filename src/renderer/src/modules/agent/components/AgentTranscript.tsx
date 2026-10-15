import { useEffect, useRef, useState, type JSX } from 'react'
import type { AgentTurnView, ResolvedTarget } from '../../../../../shared/contracts/agent'
import { Badge, type BadgeColor } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SafeMarkdown } from '../../../components/ui/SafeMarkdown'
import { useAgentStore } from '../store/agentStore'
import { ActivityTimeline } from './ActivityTimeline'
import { useAgentModel } from './AgentComposer'
import { AutoScrollSentinel, getScrollBehavior, shouldAutoScroll } from './AutoScrollSentinel'
import { DeltaBuffer } from './DeltaBuffer'
import { OperationCard } from './OperationCard'
import { PendingActionCard } from './PendingActionCard'
import { ThinkingPreview } from './ThinkingPreview'
import { UsageDisplay } from './UsageDisplay'

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const ENDED: Partial<Record<AgentTurnView['status'], { label: string; color: BadgeColor }>> = {
  failed: { label: 'Lỗi', color: 'error' },
  cancelled: { label: 'Đã dừng', color: 'neutral' },
  interrupted: { label: 'Bị gián đoạn', color: 'warning' },
  expired: { label: 'Đã bỏ qua', color: 'neutral' },
  waiting_user: { label: 'Đang chờ bạn', color: 'warning' }
}

export interface AgentTranscriptProps {
  onOpenTarget?: (target: ResolvedTarget) => void
  className?: string
}

/**
 * Lịch sử của phiên đang mở: lệnh, hoạt động, thao tác ghi, câu hỏi đang chờ và câu trả lời. Chỉ tự cuộn
 * khi người dùng đang ở cuối; đang đọc lịch sử thì hiện nút về nội dung mới.
 */
export function AgentTranscript({ onOpenTarget, className }: AgentTranscriptProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showNewPill, setShowNewPill] = useState(false)
  const turns = useAgentStore((s) => s.turns)
  const activities = useAgentStore((s) => s.activities)
  const operations = useAgentStore((s) => s.operations)
  const pending = useAgentStore((s) => s.pending)
  const isStreaming = useAgentStore((s) => s.isStreaming)
  const streamingTurnId = useAgentStore((s) => s.streamingTurnId)
  const streamingAnswer = useAgentStore((s) => s.streamingAnswer)
  const streamingReasoning = useAgentStore((s) => s.streamingReasoning)
  const lastError = useAgentStore((s) => s.lastError)
  const cancel = useAgentStore((s) => s.cancel)
  const undo = useAgentStore((s) => s.undo)
  const reply = useAgentStore((s) => s.reply)
  // The continuation runs on the model the composer shows, not on the main process default.
  const model = useAgentModel().selection ?? undefined

  const nearBottom = (): boolean => {
    const el = scrollRef.current
    return !el || shouldAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight, 80)
  }
  const scrollToBottom = (behavior: ScrollBehavior): void => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
    setShowNewPill(false)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ chạy lại khi có nội dung mới.
  useEffect(() => {
    if (nearBottom()) scrollToBottom('auto')
    else setShowNewPill(true)
  }, [streamingAnswer, turns.length, pending.length])

  const status = lastError
    ? `Lỗi: ${lastError}`
    : pending.length > 0
      ? 'Trợ lý đang chờ bạn chọn hoặc duyệt.'
      : isStreaming
        ? 'Trợ lý đang trả lời…'
        : ''

  return (
    <div
      ref={scrollRef}
      onScroll={() => nearBottom() && setShowNewPill(false)}
      className={`min-h-0 flex-1 overflow-y-auto ${className ?? ''}`}
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-3 py-3">
        {turns.length === 0 && !isStreaming && (
          <EmptyState title="Trợ lý sẵn sàng">
            Hỏi về truyện, nhờ dịch hoặc sửa một chương.
          </EmptyState>
        )}

        {turns.map((turn) => {
          const live = turn.id === streamingTurnId
          const ended = ENDED[turn.status]
          const turnPending = pending.filter((item) => item.turnId === turn.id)
          const answer = live && streamingAnswer ? streamingAnswer : turn.answer
          return (
            <article
              key={turn.id}
              aria-label={`Lượt: ${turn.instruction}`}
              className="flex flex-col gap-1.5"
            >
              <div className="rounded-lg border border-default bg-muted/50 px-3 py-2">
                <p className="selectable m-0 whitespace-pre-wrap wrap-anywhere text-body-sm leading-normal text-default">
                  {turn.instruction}
                </p>
              </div>
              {(live ? streamingReasoning : turn.reasoning) && (
                <ThinkingPreview
                  reasoning={live ? streamingReasoning : turn.reasoning}
                  isThinking={live}
                  isAnswerStarted={answer.length > 0}
                />
              )}
              <ActivityTimeline activities={activities[turn.id] ?? []} />
              {Object.values(operations)
                .filter((operation) => operation.turnId === turn.id)
                .map((operation) => (
                  <OperationCard
                    key={operation.id}
                    operation={operation}
                    onOpenTarget={onOpenTarget}
                    onCancel={() => void cancel(turn.id)}
                    onUndo={(id) => void undo(id)}
                  />
                ))}
              {answer && <SafeMarkdown text={live ? DeltaBuffer.safeTailFence(answer) : answer} />}
              {turnPending.map((action) => (
                <PendingActionCard
                  key={action.toolCallId}
                  action={action}
                  onReply={(item, choice, label) => reply(item, choice, label, model)}
                />
              ))}
              <div className="flex flex-wrap items-center gap-xs">
                {ended && (
                  <Badge color={ended.color} dot>
                    {ended.label}
                  </Badge>
                )}
                {(turn.status === 'completed' || turn.status === 'failed') && (
                  <UsageDisplay usage={turn.usage} costUsd={turn.costUsd} />
                )}
              </div>
            </article>
          )
        })}

        <p role="status" aria-live="polite" className="m-0 text-body-xs text-subtle empty:hidden">
          {status}
        </p>

        <AutoScrollSentinel
          showNewContentPill={showNewPill}
          onScrollToBottom={() => scrollToBottom(getScrollBehavior(reducedMotion))}
        />
      </div>
    </div>
  )
}
