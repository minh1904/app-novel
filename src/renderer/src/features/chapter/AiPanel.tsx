import type { JSX } from 'react'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { PenNewRoundIcon } from '@solar-icons/react/linear/pen-new-round'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { Button } from '../../components/Button'
import { SOON_LABEL } from '../work/mockFeatures'
import { AiComposer } from './AiComposer'
import { AiTurn } from './AiTurn'

/**
 * Asking AI about the sentence being worked on. A real third column next to the two panes (it never
 * covers the text), built from wireframe `man=hoi-ai&v=a`: the conversation scrolls, the composer
 * stays at the bottom and carries the context chips, the mode and the model next to the send button.
 *
 * Every answer and action below is fixed sample text: no provider is called, nothing is read or
 * written. See delivery/backlog.md, `ai-chat-panel`.
 */
export function AiPanel({
  contextLabel,
  onClose
}: {
  /** Where the sample question is "about", e.g. "Chương 12 · Đoạn văn 2". */
  contextLabel: string
  onClose(): void
}): JSX.Element {
  return (
    <section aria-label="Hỏi AI" className="relative flex h-full min-h-0 flex-col bg-sidebar">
      {/* Drag handle for the panel width. Resizing is not wired yet; the handle shows where it goes. */}
      <span
        aria-hidden="true"
        title="Kéo để đổi bề rộng"
        className="absolute top-0 left-0 z-10 flex h-full w-1.5 cursor-col-resize items-center justify-center hover:bg-focus/30"
      >
        <span className="h-6 w-px bg-line-strong" />
      </span>

      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-line px-3">
        <StarsIcon size={16} className="shrink-0 text-info" />
        <h3 className="text-[12px] font-semibold">Hỏi AI</h3>
        <span className="shrink-0 rounded-[5px] bg-selected px-1.5 py-px text-[11px] font-normal text-ink-muted">
          {SOON_LABEL}
        </span>
        <span className="min-w-0 truncate text-[11px] text-ink-muted">{contextLabel}</span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button variant="ghost-muted" size="icon" disabled aria-label="Hội thoại mới">
            <PenNewRoundIcon size={14} />
          </Button>
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
            onClick={onClose}
          >
            <CloseIcon size={15} />
          </Button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        <AiTurn />
      </div>

      <p className="shrink-0 px-3 text-[11px] leading-[1.5] text-ink-muted">
        Bản minh họa: câu hỏi và câu trả lời ở trên là dữ liệu mẫu, không gọi AI thật.
      </p>

      <AiComposer />
    </section>
  )
}
