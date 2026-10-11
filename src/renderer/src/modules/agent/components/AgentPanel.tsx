import { useEffect, useRef, useState, type JSX } from 'react'
import type { ResolvedTarget } from '../../../../../shared/contracts/agent'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { useAgentStore } from '../store/agentStore'
import { ThinkingPreview } from './ThinkingPreview'
import { ActivityTimeline } from './ActivityTimeline'
import { OperationCard } from './OperationCard'
import { UsageDisplay } from './UsageDisplay'
import { AutoScrollSentinel, shouldAutoScroll } from './AutoScrollSentinel'
import { DeltaBuffer } from './DeltaBuffer'

export interface AgentPanelProps {
  onOpenTarget?: (target: ResolvedTarget) => void
  className?: string
}

export function AgentPanel({ onOpenTarget, className }: AgentPanelProps): JSX.Element {
  const [inputVal, setInputVal] = useState('')
  const [showNewPill, setShowNewPill] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const sessions = useAgentStore((s) => s.sessions)
  const activeSessionId = useAgentStore((s) => s.activeSessionId)
  const turns = useAgentStore((s) => s.turns)
  const activities = useAgentStore((s) => s.activities)
  const operations = useAgentStore((s) => s.operations)
  const isStreaming = useAgentStore((s) => s.isStreaming)
  const streamingTurnId = useAgentStore((s) => s.streamingTurnId)
  const streamingAnswer = useAgentStore((s) => s.streamingAnswer)
  const streamingReasoning = useAgentStore((s) => s.streamingReasoning)

  const send = useAgentStore((s) => s.send)
  const cancel = useAgentStore((s) => s.cancel)
  const undo = useAgentStore((s) => s.undo)
  const createSession = useAgentStore((s) => s.createSession)
  const selectSession = useAgentStore((s) => s.selectSession)
  const listenCoordinator = useAgentStore((s) => s.listenCoordinator)
  const loadSessions = useAgentStore((s) => s.loadSessions)

  // Attach coordinator listeners on mount
  useEffect(() => {
    void loadSessions()
    const unbind = listenCoordinator()
    return () => unbind()
  }, [loadSessions, listenCoordinator])

  // Handle scroll events
  const handleScroll = (): void => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = shouldAutoScroll(distanceFromBottom, 80)
    if (nearBottom) {
      setShowNewPill(false)
    }
  }

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth'): void => {
    const el = scrollContainerRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior })
      setShowNewPill(false)
    }
  }

  // Auto-scroll when new content arrives
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = shouldAutoScroll(distanceFromBottom, 80)
    if (nearBottom) {
      scrollToBottom('auto')
    } else if (isStreaming) {
      setShowNewPill(true)
    }
  }, [streamingAnswer, turns.length, isStreaming])

  const handleSend = async (): Promise<void> => {
    const trimmed = inputVal.trim()
    if (!trimmed || isStreaming) return
    setInputVal('')
    await send(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const sessionOptions = sessions.map((s) => ({ value: s.id, label: s.title }))

  return (
    <div
      className={`flex h-full min-h-0 flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 ${className ?? ''}`}
    >
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-label-xs text-neutral-700 dark:text-neutral-300">
            Trợ lý
          </span>
          {sessions.length > 1 ? (
            <Select
              label="Phiên làm việc"
              value={activeSessionId ?? ''}
              options={sessionOptions}
              onChange={(nextId) => void selectSession(nextId)}
              className="max-w-[140px]"
            />
          ) : (
            <span className="truncate text-body-xs text-neutral-500">
              {activeSession?.title ?? 'Phiên mới'}
            </span>
          )}
        </div>
        <Button variant="ghost" onClick={() => void createSession()} title="Tạo phiên mới">
          + Phiên mới
        </Button>
      </div>

      {/* Transcript Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3"
      >
        {turns.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center text-center text-body-xs text-neutral-400">
            <span className="text-2xl mb-1">🤖</span>
            <span>Trợ lý sẵn sàng hỗ trợ tra cứu hoặc dịch thuật.</span>
          </div>
        )}

        {/* Existing Turns */}
        {turns.map((turn) => {
          const turnActs = activities[turn.id] ?? []
          const turnOps = Object.values(operations).filter((o) => o.turnId === turn.id)

          return (
            <div key={turn.id} className="mb-4 flex flex-col gap-2">
              {/* User Instruction */}
              {turn.instruction && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-blue-600 px-3 py-2 text-body-xs text-white">
                    {turn.instruction}
                  </div>
                </div>
              )}

              {/* Thinking */}
              {turn.reasoning && (
                <ThinkingPreview
                  reasoning={turn.reasoning}
                  isThinking={false}
                  isAnswerStarted={true}
                />
              )}

              {/* Activity Timeline */}
              {turnActs.length > 0 && <ActivityTimeline activities={turnActs} />}

              {/* Write Operations */}
              {turnOps.map((op) => (
                <OperationCard
                  key={op.id}
                  operation={op}
                  onOpenTarget={onOpenTarget}
                  onCancel={() => void cancel(turn.id)}
                  onUndo={(opId) => void undo(opId)}
                />
              ))}

              {/* Answer */}
              {turn.answer && (
                <div className="flex justify-start">
                  <div className="max-w-[95%] whitespace-pre-wrap rounded-2xl bg-neutral-100 px-3 py-2 text-body-xs text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                    {turn.answer}
                  </div>
                </div>
              )}

              {/* Usage Display (Task 7.1) */}
              {turn.status === 'completed' && (
                <UsageDisplay usage={turn.usage} costUsd={turn.costUsd} />
              )}
            </div>
          )
        })}

        {/* Active Streaming Turn */}
        {isStreaming && (
          <div className="mb-4 flex flex-col gap-2">
            {streamingReasoning && (
              <ThinkingPreview
                reasoning={streamingReasoning}
                isThinking={true}
                isAnswerStarted={streamingAnswer.length > 0}
              />
            )}

            {streamingTurnId && activities[streamingTurnId] && (
              <ActivityTimeline activities={activities[streamingTurnId]} />
            )}

            {streamingTurnId &&
              Object.values(operations)
                .filter((o) => o.turnId === streamingTurnId)
                .map((op) => (
                  <OperationCard
                    key={op.id}
                    operation={op}
                    onOpenTarget={onOpenTarget}
                    onCancel={() => void cancel()}
                  />
                ))}

            {streamingAnswer && (
              <div className="flex justify-start">
                <div className="max-w-[95%] whitespace-pre-wrap rounded-2xl bg-neutral-100 px-3 py-2 text-body-xs text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                  {DeltaBuffer.safeTailFence(streamingAnswer)}
                </div>
              </div>
            )}
          </div>
        )}

        <AutoScrollSentinel
          showNewContentPill={showNewPill}
          onScrollToBottom={() => scrollToBottom('smooth')}
        />
      </div>

      {/* Composer Input */}
      <div className="border-t border-neutral-200 p-2.5 dark:border-neutral-800">
        <div className="flex items-end gap-1.5 rounded-lg border border-neutral-300 bg-white p-1.5 focus-within:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900">
          <Textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Đang phản hồi...' : 'Nhập câu hỏi hoặc lệnh dịch...'}
            disabled={isStreaming}
            rows={1}
            className="min-h-0 flex-1 resize-none border-none bg-transparent px-1.5 py-1 text-body-xs outline-none placeholder:text-neutral-400 focus:ring-0"
          />
          {isStreaming ? (
            <Button variant="solid" color="danger" onClick={() => void cancel()}>
              Dừng
            </Button>
          ) : (
            <Button variant="solid" onClick={() => void handleSend()} disabled={!inputVal.trim()}>
              Gửi
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
