import type { JSX } from 'react'
import { ArrowRightIcon } from '@solar-icons/react/linear/arrow-right'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { MagicWandIcon } from '@solar-icons/react/linear/magic-wand'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { NotesIcon } from '@solar-icons/react/linear/notes'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { Button } from '../../components/Button'
import { SOON_LABEL } from '../work/mockFeatures'

/** Fixed sample: what asking about the selected sentence would look like. Not from this chapter's AI. */
const SAMPLE_CONTEXT = 'Cô toát lên vẻ thanh lịch, đúng kiểu sinh viên đại học thành phố lớn…'
const SAMPLE_QUESTION = 'Dịch tự nhiên hơn, bớt cứng nhé'
const SAMPLE_ANSWER =
  '"Cô mang dáng vẻ thanh lịch rất đặc trưng của sinh viên thành phố lớn, xinh đẹp một cách tự nhiên."'

const QUICK_ACTIONS = [
  { icon: <RefreshIcon size={12} />, label: 'Dịch lại' },
  { icon: <MagicWandIcon size={12} />, label: 'Viết tự nhiên hơn' },
  { icon: <MinimalisticMagnifierIcon size={12} />, label: 'Tra từ' },
  { icon: <NotesIcon size={12} />, label: 'Ghi chú' }
]

/**
 * Illustration of asking AI about the sentence being worked on. It is a real column next to the two
 * panes (not a layer floating over them), but every answer and action below is fixed sample text:
 * no provider is called, nothing is read or written. See delivery/backlog.md, `ai-chat-panel`.
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
    <section
      aria-label="Hỏi AI"
      className="flex h-full min-h-0 w-[320px] flex-col gap-3 rounded-panel border border-line bg-sidebar p-3"
    >
      <div className="flex items-center gap-2">
        <StarsIcon size={16} className="shrink-0 text-info" />
        <h3 className="text-[13px] font-semibold">Hỏi AI</h3>
        <span className="rounded-[5px] bg-selected px-1.5 py-px text-[11px] font-normal text-ink-muted">
          {SOON_LABEL}
        </span>
        <Button
          variant="ghost-muted"
          size="icon"
          className="ml-auto"
          aria-label="Đóng (Esc)"
          title="Đóng (Esc)"
          onClick={onClose}
        >
          <CloseIcon size={15} />
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-control border border-line bg-control p-2.5">
        <DocumentTextIcon size={14} className="mt-0.5 shrink-0 text-ink-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-ink-muted">{contextLabel}</p>
          <p className="mt-0.5 text-[12.5px] text-ink italic">“{SAMPLE_CONTEXT}”</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.label} variant="outline" size="xs" disabled>
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>

        <p className="ml-auto w-fit max-w-[90%] rounded-control bg-control px-2.5 py-1.5 text-[12.5px]">
          {SAMPLE_QUESTION}
        </p>

        <div className="flex flex-col gap-2 rounded-control border border-line p-2.5 text-[12.5px] leading-[1.6]">
          <p>Đây là phiên bản tự nhiên hơn, mượt mà hơn:</p>
          <p className="text-ink-muted italic">{SAMPLE_ANSWER}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button size="xs" disabled>
              Áp dụng
            </Button>
            <Button variant="outline" size="xs" disabled>
              Chèn vào bản dịch
            </Button>
            <Button variant="outline" size="xs" disabled>
              Sao chép
            </Button>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-[1.5] text-ink-muted">
        Bản minh họa: câu hỏi và câu trả lời ở trên là dữ liệu mẫu, không gọi AI thật.
      </p>

      <div className="flex shrink-0 items-center gap-1.5 border-t border-line pt-2.5">
        <input
          className="h-7 min-w-0 flex-1 rounded-control border border-line-strong bg-transparent px-2 text-[12.5px] outline-none placeholder:text-ink-muted"
          placeholder="Hỏi Mira về bản dịch, chỉnh sửa, hoặc yêu cầu khác…"
          disabled
        />
        <Button variant="secondary" size="icon" disabled aria-label="Gửi">
          <ArrowRightIcon size={14} />
        </Button>
      </div>
    </section>
  )
}
