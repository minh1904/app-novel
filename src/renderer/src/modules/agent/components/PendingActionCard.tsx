import { useState, type JSX } from 'react'
import type { AgentPendingAction } from '../../../../../shared/contracts/agent'
import { Button } from '../../../components/ui/Button'

export interface PendingActionCardProps {
  action: AgentPendingAction
  onReply: (action: AgentPendingAction, choice: string, label: string) => Promise<boolean>
}

/**
 * Câu hỏi của một lượt đang chờ: duyệt một thao tác ghi, hoặc chọn một trong các đích mơ hồ. Câu trả
 * lời gắn với đúng call đang chờ (ID + digest), nên bấm hai lần hay bấm sau khi lượt đã đổi đều bị
 * Main từ chối thay vì chạy nhầm.
 */
export function PendingActionCard({ action, onReply }: PendingActionCardProps): JSX.Element {
  const [sending, setSending] = useState(false)
  const reply = async (choice: string, label: string): Promise<void> => {
    setSending(true)
    try {
      await onReply(action, choice, label)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="group"
      aria-label={action.kind === 'choose' ? 'Chọn đích' : 'Cần duyệt'}
      data-pending-call={action.toolCallId}
      className="flex flex-col gap-xs rounded-md border border-strong bg-surface p-sm"
    >
      <p className="m-0 text-body-sm">
        {action.kind === 'choose' ? 'Có nhiều đích khớp. Bạn muốn dùng đích nào?' : action.label}
      </p>
      <div className="flex flex-wrap gap-xs">
        {action.kind === 'choose' ? (
          action.candidates.map((candidate) => (
            <Button
              key={candidate.handle}
              loading={sending}
              onClick={() => void reply(candidate.handle, candidate.label)}
            >
              {candidate.label}
            </Button>
          ))
        ) : (
          <>
            <Button
              variant="solid"
              loading={sending}
              onClick={() => void reply('approve', 'Duyệt')}
            >
              Duyệt
            </Button>
            <Button loading={sending} onClick={() => void reply('reject', 'Không duyệt')}>
              Không duyệt
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
