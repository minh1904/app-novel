import { useId, useMemo, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { BookIcon } from '@solar-icons/react/linear/book'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { CopyIcon } from '@solar-icons/react/linear/copy'
import { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { StopCircleIcon } from '@solar-icons/react/linear/stop-circle'
import type { ChatContextBlock } from '../../../../shared/contracts/aiChat'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { diffLines, diffSummary } from './lineDiff'
import { proposalOf, type TurnView } from './chatTurns'
import { SafeMarkdown } from './SafeMarkdown'

/**
 * One question and its answer, as it actually happened.
 *
 * Two things here are load-bearing rather than decorative. The context list says "đã gửi kèm", not
 * "đã dùng công cụ": Mira chose those blocks by rule, and claiming the model went and looked them up
 * would misdescribe the mechanism. And Apply appears only under a finished Sửa turn that produced a
 * fenced block — a cancelled or failed answer is a truncated one, and applying a truncated rewrite
 * silently shortens the paragraph it replaces.
 */

/** Collapsed by default: what was sent is routine, and the answer is what the reader came for. */
function SentContext({ blocks }: { blocks: ChatContextBlock[] }): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const listId = useId()
  if (blocks.length === 0) return null

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-6 w-fit cursor-pointer items-center gap-1.5 text-[11px] text-ink-muted outline-none hover:text-ink focus-visible:text-ink"
      >
        <AltArrowRightIcon
          size={14}
          className={cx('shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span>Đã gửi kèm {blocks.length} khối ngữ cảnh</span>
      </button>
      {/* grid-rows 0fr -> 1fr so the list slides instead of popping; `inert` keeps the closed rows
          out of Tab order without unmounting them. */}
      <div
        className={cx(
          'grid transition-[grid-template-rows] duration-200',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden" id={listId} inert={!open}>
          <ul className="mt-2 ml-[7px] space-y-2 border-l border-line-strong pl-4">
            {blocks.map((block, index) => (
              <li key={block.label + String(index)}>
                <p className="text-[12px] text-ink">{block.label}</p>
                <p className="text-[11px] leading-[1.5] text-ink-muted">{block.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * How big the change is, and a way to put it in front of the text it would change.
 *
 * The diff itself is **not** drawn here any more. It used to be, and comparing two places while
 * accepting all-or-nothing was the part that felt wrong: the proposal now goes into the translation
 * pane as marked chunks, each accepted or rejected where it sits.
 */
function ProposalSummary({
  before,
  after,
  onAccept
}: {
  before: string
  after: string
  onAccept?: () => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const lines = useMemo(() => diffLines(before, after), [before, after])
  const { added, removed } = useMemo(() => diffSummary(lines), [lines])

  return (
    <div className="rounded-panel border border-line-strong px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-[11px] text-ink-muted">
          Đề xuất thay {removed} dòng, thêm {added} dòng
        </span>
        <Button size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? 'Thu gọn' : 'Xem thay đổi'}
        </Button>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-[11px] text-ink-muted">Chữ hiện tại lúc hỏi</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-control bg-canvas p-2 text-[12px] text-ink">{before}</pre>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">Bản AI đề xuất</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-control bg-canvas p-2 text-[12px] text-ink">{after}</pre>
          </div>
          <div className="flex gap-1">
            {onAccept && <Button size="sm" onClick={onAccept}>Áp dụng</Button>}
            <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(after)}>
              Sao chép bản đề xuất
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AiTurn({
  turn,
  currentChapterId,
  chapterLabel,
  targetChapterExists = true,
  onCancel,
  onRetry,
  onApply,
  onNavigateChapter
}: {
  turn: TurnView
  currentChapterId?: string
  chapterLabel?: string
  targetChapterExists?: boolean
  onCancel(requestId: string): void
  onRetry(question: string): void
  onApply(turn: TurnView): void
  onNavigateChapter?(chapterId: string): void
}): JSX.Element {
  const proposal = proposalOf(turn)
  const explanation = proposal === null ? turn.answer :
    turn.answer.slice(0, turn.answer.lastIndexOf('```', turn.answer.lastIndexOf('```') - 1)).trim()
  const running = turn.status === 'sending' || turn.status === 'running'

  return (
    <article className="flex flex-col gap-2">
      <p className="w-fit self-end rounded-panel bg-control px-2.5 py-1.5 text-[13px] leading-[1.6] text-ink">
        {turn.question}
      </p>

      <SentContext blocks={turn.context} />

      {/* What the model went and looked up for itself. Separate from "đã gửi kèm" because the two are
          different claims: one is what Mira chose to send, the other is what the model chose to read. */}
      {turn.tools.length > 0 && (
        <ul className="ml-[7px] space-y-1 border-l border-line-strong pl-4">
          {turn.tools.map((step, index) => (
            <li key={step.name + String(index)} className="flex items-center gap-1.5">
              <BookIcon size={13} className="shrink-0 text-ink-muted" />
              <span className="text-[11px] text-ink-muted">Đã đọc: {step.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {explanation !== '' && (
        <div className="space-y-1">
          <SafeMarkdown text={explanation} />
          {proposal !== null && <Button size="sm" variant="ghost-muted"
            onClick={() => void navigator.clipboard.writeText(explanation)}>
            Sao chép lời giải thích
          </Button>}
        </div>
      )}

      {running && (
        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="animate-pulse">
            {turn.status === 'sending' ? 'Đang gửi…' : 'Đang trả lời…'}
          </span>
          {turn.requestId !== null && (
            <Button
              variant="ghost-muted"
              size="sm"
              onClick={() => onCancel(turn.requestId as string)}
            >
              <StopCircleIcon size={14} />
              Hủy
            </Button>
          )}
        </div>
      )}

      {turn.status === 'cancelled' && (
        <p className="text-[11px] text-ink-muted">
          Đã hủy. Câu trả lời chưa trọn nên không áp dụng được; hỏi lại nếu cần.
        </p>
      )}

      {turn.status === 'error' && turn.error !== null && (
        <div className="flex flex-col gap-1.5 rounded-panel border border-error/40 bg-error/5 p-2">
          <p className="flex gap-1.5 text-[12px] leading-[1.5] text-ink">
            <DangerCircleIcon size={14} className="mt-px shrink-0 text-error" />
            {turn.error.message}
          </p>
          {turn.error.recoverAt !== null && (
            <p className="text-[11px] text-ink-muted">
              Hạn mức hồi phục khoảng{' '}
              {new Date(turn.error.recoverAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
              .
            </p>
          )}
          {turn.error.retryable && (
            <Button
              variant="ghost-muted"
              size="sm"
              className="self-start"
              onClick={() => onRetry(turn.question)}
            >
              <RefreshIcon size={14} />
              Hỏi lại
            </Button>
          )}
        </div>
      )}

      {turn.mode === 'ap_dung' && turn.autoApply === 'applied' && (
        <p className="text-[11px] text-success">Đã áp dụng thẳng vào bản dịch.</p>
      )}

      {turn.mode === 'sua' && turn.proposalStatus === 'applied' && (
        <p className="text-[11px] text-success">Đề xuất đã được áp dụng.</p>
      )}

      {turn.status === 'interrupted' && (
        <p className="text-[11px] text-ink-muted">
          Lượt này bị ngắt khi app đóng. Phần câu trả lời đã nhận chỉ để đọc; hãy hỏi lại nếu cần.
        </p>
      )}

      {turn.mode === 'ap_dung' && turn.autoApply === 'needs-review' && (
        <p className="text-[11px] text-ink-muted">
          Bản gốc hoặc bản dịch đã đổi, hoặc còn chữ chưa lưu. Đề xuất cần được xem lại.
        </p>
      )}

      {proposal !== null && turn.range !== null && (
        <>
          {turn.chapterId && currentChapterId && turn.chapterId !== currentChapterId ? (
            <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-canvas p-2 text-[11px]">
              {targetChapterExists ? (
                <>
                  <p className="text-ink-muted">
                    Đề xuất này thuộc <strong>{chapterLabel ?? 'chương khác'}</strong>.
                  </p>
                  {onNavigateChapter && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => onNavigateChapter(turn.chapterId!)}
                    >
                      Mở {chapterLabel ?? 'chương'} để xem
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-error">
                  Chương thuộc đề xuất này đã bị xóa nên không áp dụng được.
                </p>
              )}
            </div>
          ) : (
            <ProposalSummary
              before={turn.range.text}
              after={proposal}
              onAccept={turn.proposalId !== undefined &&
                (turn.proposalStatus === 'pending' || turn.proposalStatus === 'conflict' || turn.proposalStatus === 'stale')
                  ? () => onApply(turn) : undefined}
            />
          )}
        </>
      )}

      {/* The model was asked for a fenced block and did not give one: read it as a plain reply rather
          than guessing which part of the answer was meant to replace the paragraph. */}
      {turn.mode !== 'hoi' && turn.status === 'done' && proposal === null && (
        <p className="text-[11px] text-ink-muted">
          Câu trả lời chưa có khối thay thế hoàn chỉnh nên không có gì để áp dụng. Hỏi lại và nói rõ
          phạm vi cần sửa.
        </p>
      )}

      {turn.status === 'done' && (
        <div className="-ml-[7px] flex items-center gap-0.5 pt-0.5">
          <button
            type="button"
            aria-label="Sao chép"
            title="Sao chép"
            onClick={() => void navigator.clipboard.writeText(turn.answer)}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-selected hover:text-ink"
          >
            <CopyIcon size={14} />
          </button>
          <button
            type="button"
            aria-label="Hỏi lại"
            title="Hỏi lại"
            onClick={() => onRetry(turn.question)}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-selected hover:text-ink"
          >
            <RefreshIcon size={14} />
          </button>
          <span className="ml-1 text-[11px] text-ink-muted">
            {turn.usage === null
              ? 'Nhà cung cấp không báo lượng dùng'
              : turn.usage.inputTokens +
                ' + ' +
                turn.usage.outputTokens +
                ' token · ' +
                // A missing price means the snapshot has none for this model, which is not the same
                // as free; saying "chưa biết giá" keeps that distinction.
                (turn.usd === null ? 'chưa biết giá' : '$' + turn.usd.toFixed(4))}
            {turn.keyTail !== null && ' · khóa …' + turn.keyTail}
          </span>
          <CheckIcon size={14} className="ml-auto shrink-0 text-success opacity-0" aria-hidden />
        </div>
      )}
    </article>
  )
}
