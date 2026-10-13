import type { JSX } from 'react'
import type { TokenUsage } from '../../../../../shared/contracts/usage'
import { Badge } from '../../../components/ui/Badge'

export interface UsageDisplayProps {
  usage: TokenUsage | null | undefined
  costUsd?: number | null
}

export function UsageDisplay({ usage, costUsd }: UsageDisplayProps): JSX.Element {
  if (!usage) {
    return (
      <div className="flex items-center gap-2xs text-label-xs text-muted">
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
    <div className="flex flex-wrap items-center gap-2xs text-label-xs text-muted">
      <span className="text-subtle">Lượng dùng:</span>
      <span>{parts.join(' · ')}</span>
      {costLabel && <span>{costLabel}</span>}
      {usage.complete === false && <Badge color="warning">Chưa đầy đủ</Badge>}
    </div>
  )
}
