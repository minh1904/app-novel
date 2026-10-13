import { useState, useSyncExternalStore, type JSX, type KeyboardEvent } from 'react'
import { ArrowUpIcon, CloseIcon, StopCircleIcon } from '@renderer/components/ui/reicon'
import { Button } from '../../../components/ui/Button'
import { CompactButton } from '../../../components/ui/CompactButton'
import { ICON } from '../../../components/ui/icon'
import { Textarea } from '../../../components/ui/Textarea'
import { NEW_CHAT, useAgentStore } from '../store/agentStore'
import { contextChips, withoutChips, type ChipKey } from './contextChips'

/**
 * Ô soạn của Trợ lý: draft theo phiên (đổi bề mặt không mất chữ), chip ngữ cảnh bỏ được trước khi gửi,
 * Enter gửi và Shift+Enter xuống dòng. Khi lượt đang chạy, nút gửi thành nút Dừng.
 */
export function AgentComposer({ placeholder }: { placeholder?: string }): JSX.Element {
  const adapter = useAgentStore((s) => s.adapter)
  const draftKey = useAgentStore((s) => s.activeSessionId ?? NEW_CHAT)
  const draft = useAgentStore((s) => s.drafts[s.activeSessionId ?? NEW_CHAT] ?? '')
  const setDraft = useAgentStore((s) => s.setDraft)
  const send = useAgentStore((s) => s.send)
  const cancel = useAgentStore((s) => s.cancel)
  const busy = useAgentStore((s) => s.isStreaming)
  const waiting = useAgentStore((s) => s.pending.length > 0)
  // Chips follow the workspace as it moves; removals belong to the draft being written.
  useSyncExternalStore(adapter.subscribeContext, adapter.contextSnapshot, adapter.contextSnapshot)
  const [removed, setRemoved] = useState<{ key: string; chips: Set<ChipKey> }>({
    key: draftKey,
    chips: new Set()
  })
  const removedChips = removed.key === draftKey ? removed.chips : new Set<ChipKey>()
  const context = adapter.captureContext()
  const chips = contextChips(withoutChips(context, removedChips), adapter.contextLabels())

  const submit = async (): Promise<void> => {
    const text = draft.trim()
    if (!text || busy) return
    const sent = await send(text, { context: withoutChips(context, removedChips) })
    if (sent) setRemoved({ key: draftKey, chips: new Set() })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <div className="flex flex-col gap-xs rounded-lg border border-input bg-surface p-xs shadow-xs">
      <Textarea
        aria-label="Câu hỏi hoặc yêu cầu cho Trợ lý"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        className="min-h-0 resize-none border-0"
        placeholder={
          placeholder ??
          (waiting ? 'Trả lời câu hỏi ở trên, hoặc gửi yêu cầu mới…' : 'Hỏi, nhờ dịch hoặc sửa…')
        }
      />
      <div className="flex items-center gap-2xs">
        <ul
          aria-label="Ngữ cảnh gửi kèm"
          className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-2xs p-0"
        >
          {chips.map((chip) => (
            <li key={chip.key} className="flex min-w-0">
              <Button
                variant="light"
                aria-label={`Bỏ ngữ cảnh ${chip.label}`}
                title={`Bỏ ngữ cảnh ${chip.label}`}
                rightIcon={<CloseIcon size={ICON.xs} aria-hidden="true" />}
                className="min-w-0 max-w-full"
                onClick={() =>
                  setRemoved({ key: draftKey, chips: new Set([...removedChips, chip.key]) })
                }
              >
                <span className="truncate">{chip.label}</span>
              </Button>
            </li>
          ))}
        </ul>
        {busy ? (
          <CompactButton
            variant="outline"
            tone="danger"
            aria-label="Dừng lượt đang chạy"
            icon={<StopCircleIcon size={ICON.sm} />}
            onClick={() => void cancel()}
          />
        ) : (
          <CompactButton
            variant="dark"
            aria-label="Gửi"
            disabled={!draft.trim()}
            icon={<ArrowUpIcon size={ICON.sm} />}
            onClick={() => void submit()}
          />
        )}
      </div>
    </div>
  )
}
