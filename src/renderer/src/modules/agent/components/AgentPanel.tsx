import { useEffect, type JSX } from 'react'
import { PenNewRoundIcon } from '@renderer/components/ui/reicon'
import type { ResolvedTarget } from '../../../../../shared/contracts/agent'
import { CompactButton } from '../../../components/ui/CompactButton'
import { ICON } from '../../../components/ui/icon'
import { Select } from '../../../components/ui/Select'
import { useAgentStore } from '../store/agentStore'
import { AgentComposer } from './AgentComposer'
import { AgentTranscript } from './AgentTranscript'

export interface AgentPanelProps {
  onOpenTarget?: (target: ResolvedTarget) => void
  className?: string
}

/** Subscribes to agent events while mounted and loads the session list once. */
export function useAgentConnection(): void {
  const loadSessions = useAgentStore((s) => s.loadSessions)
  const listenCoordinator = useAgentStore((s) => s.listenCoordinator)
  useEffect(() => {
    void loadSessions()
    return listenCoordinator()
  }, [loadSessions, listenCoordinator])
}

/** Trợ lý gọn cho side panel của màn chương: chọn phiên, transcript và ô soạn. */
export function AgentPanel({ onOpenTarget, className }: AgentPanelProps): JSX.Element {
  useAgentConnection()
  const sessions = useAgentStore((s) => s.sessions)
  const activeSessionId = useAgentStore((s) => s.activeSessionId)
  const selectSession = useAgentStore((s) => s.selectSession)
  const newChat = useAgentStore((s) => s.newChat)

  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ''}`}>
      <div className="flex shrink-0 items-center gap-xs px-sm py-2xs">
        <Select
          label="Phiên Trợ lý"
          value={activeSessionId ?? ''}
          options={[
            ...(activeSessionId === null ? [{ value: '', label: 'Chat mới' }] : []),
            ...sessions.map((session) => ({
              value: session.id,
              label: session.title || 'Phiên mới'
            }))
          ]}
          onChange={(id) => {
            if (id) void selectSession(id)
          }}
          className="min-w-0 flex-1"
        />
        <CompactButton
          aria-label="Chat mới"
          title="Chat mới"
          disabled={activeSessionId === null}
          onClick={newChat}
          icon={<PenNewRoundIcon size={ICON.sm} />}
        />
      </div>
      <AgentTranscript onOpenTarget={onOpenTarget} />
      <div className="shrink-0 px-sm pb-sm">
        <AgentComposer />
      </div>
    </div>
  )
}
