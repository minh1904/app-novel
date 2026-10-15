import { useState, useSyncExternalStore, type JSX, type KeyboardEvent } from 'react'
import { ArrowUpIcon, StopCircleIcon } from '@renderer/components/ui/reicon'
import { CompactButton } from '../../../components/ui/CompactButton'
import { focusWithinRing } from '../../../components/ui/focus'
import { ICON } from '../../../components/ui/icon'
import { cn } from '../../../lib/cn'
import { Tag } from '../../../components/ui/Tag'
import { Textarea } from '../../../components/ui/Textarea'
import {
  ModelSelectionMenu,
  openModelList,
  useModelPicker,
  type ModelPicker
} from '../../ai-connections/public'
import { NEW_CHAT, useAgentStore } from '../store/agentStore'
import { contextChips, withoutChips, type ChipKey } from './contextChips'

/** Model của Trợ lý: chọn một lần trên ô soạn, dùng cho mọi phiên và cả khi trả lời câu hỏi đang chờ. */
export function useAgentModel(): ModelPicker {
  return useModelPicker(
    useAgentStore((s) => s.model),
    useAgentStore((s) => s.setModel)
  )
}

/**
 * Ô soạn của Trợ lý: draft theo phiên (đổi bề mặt không mất chữ), chọn model và mức suy luận, chip ngữ
 * cảnh bỏ được trước khi gửi, Enter gửi và Shift+Enter xuống dòng. Khi lượt đang chạy, nút gửi thành nút
 * Dừng.
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
  const model = useAgentModel()
  const ready = draft.trim() !== '' && model.selection !== null
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
    if (!text || busy || !model.selection) return
    const sent = await send(text, {
      context: withoutChips(context, removedChips),
      modelSelection: model.selection
    })
    if (sent) setRemoved({ key: draftKey, chips: new Set() })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2xs rounded-lg border border-input bg-surface p-xs shadow-xs',
        focusWithinRing
      )}
    >
      <ul
        aria-label="Ngữ cảnh gửi kèm"
        className="m-0 flex list-none flex-wrap gap-2xs p-0 empty:hidden"
      >
        {chips.map((chip) => (
          <li key={chip.key} className="flex min-w-0">
            <Tag
              removeLabel={`Bỏ ngữ cảnh ${chip.label}`}
              onRemove={() =>
                setRemoved({ key: draftKey, chips: new Set([...removedChips, chip.key]) })
              }
            >
              {chip.label}
            </Tag>
          </li>
        ))}
      </ul>
      <Textarea
        aria-label="Câu hỏi hoặc yêu cầu cho Trợ lý"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        className="min-h-0 resize-none border-0 bg-transparent px-2xs hover:bg-transparent focus-visible:outline-none"
        placeholder={
          placeholder ??
          (waiting ? 'Trả lời câu hỏi ở trên, hoặc gửi yêu cầu mới…' : 'Hỏi, nhờ dịch hoặc sửa…')
        }
      />
      {(model.loadError ?? model.modelNotice) && (
        <p role="alert" className="m-0 px-xs text-body-xs text-error">
          {model.loadError
            ? `Không đọc được danh sách kết nối: ${model.loadError}`
            : model.modelNotice}
        </p>
      )}
      <div className="flex items-center gap-2xs">
        <ModelSelectionMenu
          label="Model của Trợ lý"
          connections={model.usable}
          selected={model.selection}
          onSelect={model.selectModel}
          onSelectThinking={(selection, choice) => void model.setThinking(selection, choice)}
          onOpen={model.refreshConnections}
          overridesMain={model.overridesMain}
          onUseDefault={model.useDefaultModel}
          onRefresh={model.refreshModels}
          refreshing={model.refreshing}
          suggestions={model.suggestions}
          onAddCustom={model.addCustomModel}
          onOpenSettings={openModelList}
        />
        <span className="flex-1" />
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
            title={ready ? 'Gửi (Enter)' : 'Cần câu hỏi và một model'}
            disabled={!ready}
            icon={<ArrowUpIcon size={ICON.sm} />}
            onClick={() => void submit()}
          />
        )}
      </div>
    </div>
  )
}
