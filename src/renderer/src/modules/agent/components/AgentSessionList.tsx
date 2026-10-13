import type { JSX } from 'react'
import { AddIcon } from '@renderer/components/ui/reicon'
import { Button } from '../../../components/ui/Button'
import { ICON } from '../../../components/ui/icon'
import { NavItem } from '../../../components/ui/NavItem'
import { useAgentStore } from '../store/agentStore'

const timeLabel = (at: number): string => {
  const date = new Date(at)
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

/** Chat mới và lịch sử phiên của màn Trợ lý; cùng store với panel trong màn chương. */
export function AgentSessionList(): JSX.Element {
  const sessions = useAgentStore((s) => s.sessions)
  const activeSessionId = useAgentStore((s) => s.activeSessionId)
  const selectSession = useAgentStore((s) => s.selectSession)
  const newChat = useAgentStore((s) => s.newChat)
  return (
    <nav aria-label="Phiên Trợ lý" className="flex min-h-0 flex-col gap-2xs overflow-y-auto">
      <Button leftIcon={<AddIcon size={ICON.sm} />} onClick={newChat}>
        Chat mới
      </Button>
      <div className="h-xs" />
      {sessions.map((session) => (
        <NavItem
          key={session.id}
          active={session.id === activeSessionId}
          aria-current={session.id === activeSessionId ? 'page' : undefined}
          onClick={() => void selectSession(session.id)}
          trailing={
            <span className="text-label-xs text-muted">{timeLabel(session.updatedAt)}</span>
          }
        >
          {session.title || 'Phiên mới'}
        </NavItem>
      ))}
    </nav>
  )
}
