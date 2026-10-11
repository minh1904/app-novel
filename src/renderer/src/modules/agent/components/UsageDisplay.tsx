import type { JSX } from 'react'
import type { TokenUsage } from '../../../../../shared/contracts/usage'

export interface UsageDisplayProps {
  usage: TokenUsage | null | undefined
  costUsd?: number | null
}

export function UsageDisplay({ usage, costUsd }: UsageDisplayProps): JSX.Element {
  if (!usage) {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-label-xs text-neutral-400">
        <span>Token:</span>
        <span>— (Provider không báo lượng dùng)</span>
      </div>
    )
  }

  const parts: string[] = []
  parts.push(`${usage.inputTokens.toLocaleString('vi')} vào`)
  parts.push(`${usage.outputTokens.toLocaleString('vi')} ra`)

  if (usage.cacheReadTokens && usage.cacheReadTokens > 0) {
    parts.push(`${usage.cacheReadTokens.toLocaleString('vi')} đọc cache`)
  }
  if (usage.cacheWriteTokens && usage.cacheWriteTokens > 0) {
    parts.push(`${usage.cacheWriteTokens.toLocaleString('vi')} ghi cache`)
  }
  if (usage.reasoningTokens && usage.reasoningTokens > 0) {
    parts.push(`${usage.reasoningTokens.toLocaleString('vi')} suy luận`)
  }

  const costLabel =
    costUsd !== null && costUsd !== undefined
      ? ` · Ước tính theo bảng giá: $${costUsd < 0.01 ? '<0,01' : costUsd.toFixed(4).replace('.', ',')}`
      : ''

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-label-xs text-neutral-500 dark:text-neutral-400">
      <span className="font-medium text-neutral-600 dark:text-neutral-300">Lượng dùng:</span>
      <span>{parts.join(' · ')}</span>
      {costLabel && <span>{costLabel}</span>}
      {usage.complete === false && (
        <span className="rounded bg-amber-50 px-1 py-0.2 text-label-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Chưa đầy đủ
        </span>
      )}
    </div>
  )
}
