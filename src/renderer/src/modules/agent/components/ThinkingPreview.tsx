import { useState, type JSX } from 'react'
import { Button } from '../../../components/ui/Button'

export interface ThinkingPreviewProps {
  reasoning: string | null | undefined
  isThinking?: boolean
  isAnswerStarted?: boolean
  durationMs?: number
}

export function formatThinkingDuration(ms?: number): string | null {
  if (ms === undefined || ms === null || ms <= 0) return null
  const seconds = (ms / 1000).toFixed(1)
  return `Suy nghĩ trong ${seconds}s`
}

export function ThinkingPreview({
  reasoning,
  isThinking = false,
  isAnswerStarted = false,
  durationMs
}: ThinkingPreviewProps): JSX.Element | null {
  const [userOpened, setUserOpened] = useState<boolean | null>(null)

  // If no reasoning text at all, never render fake thinking
  if (!reasoning || reasoning.trim().length === 0) {
    return null
  }

  // Auto-collapse if answer started and user hasn't manually opened
  const isOpen = userOpened ?? (isThinking && !isAnswerStarted)

  const durationLabel = formatThinkingDuration(durationMs)

  return (
    <div className="my-2 rounded-md border border-neutral-200 bg-neutral-50/60 p-2 text-body-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
      <Button
        variant="ghost"
        aria-expanded={isOpen}
        onClick={() => setUserOpened(!isOpen)}
        className="flex w-full items-center justify-between font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-label-xs font-semibold uppercase tracking-wider text-neutral-500">
            {isThinking ? 'Đang suy nghĩ...' : 'Suy nghĩ'}
          </span>
          {durationLabel && (
            <span className="text-label-xs text-neutral-400">({durationLabel})</span>
          )}
        </div>
        <span className="text-label-xs text-neutral-400">{isOpen ? 'Thu gọn ▲' : 'Mở rộng ▼'}</span>
      </Button>

      {isOpen ? (
        <div className="mt-2 whitespace-pre-wrap border-t border-neutral-200/60 pt-2 font-mono text-body-xs leading-relaxed dark:border-neutral-800/60">
          {reasoning}
        </div>
      ) : (
        <div className="mt-1 line-clamp-2 overflow-hidden text-ellipsis font-mono text-body-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          {reasoning}
        </div>
      )}
    </div>
  )
}
