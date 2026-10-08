import { useId, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { CopyIcon } from '@solar-icons/react/linear/copy'
import { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { StopCircleIcon } from '@solar-icons/react/linear/stop-circle'
import type { ChatContextBlock, ChatMode } from '../../../../shared/contracts/aiChat'
import type { ProposalQueueItem } from '../../../../shared/contracts/aiProposals'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import type { TurnView } from './chatTurns'
import { SafeMarkdown } from './SafeMarkdown'
import { useUiStore } from '../../stores/uiStore'
import { TermProposalCard, TextProposalCard, type ProposalActions } from './ProposalCard'
import { summarizeTools, toolCalls } from './toolSummary'

/**
 * One question and its answer, as it actually happened.
 *
 * What the model did with tools is one line, as Hermes shows it, with each call one click away. What it
 * proposed sits under the answer as cards that are accepted or denied right there; their status comes
 * from the proposal queue, so the card and the queue never disagree. A turn saved before change
 * `agentic-chat` keeps its mode label and the context it sent along.
 */

const MODE_LABEL: Record<ChatMode, string> = {
  ask: 'Hỏi',
  edit: 'Sửa',
  apply: 'Áp dụng thẳng'
}

/** Collapsed by default: what an old turn sent is routine, and the answer is what the reader came for. */
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
        className="flex h-6 w-fit cursor-pointer items-center gap-1.5 text-ui-xs text-ink-muted outline-none hover:text-ink focus-visible:text-ink"
      >
        <AltArrowRightIcon
          size={14}
          className={cx('shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span>Đã gửi kèm {blocks.length} khối ngữ cảnh</span>
      </button>
      {open && (
        <ul id={listId} className="mt-2 ml-[7px] space-y-2 border-l border-line-strong pl-4">
          {blocks.map((block, index) => (
            <li key={block.label + String(index)}>
              <p className="text-ui-xs text-ink">{block.label}</p>
              <p className="text-ui-xs leading-normal text-ink-muted">{block.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The calls of a turn as one line that opens into the list, each call with its status. */
function ToolSummary({ turn, running }: { turn: TurnView; running: boolean }): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const calls = toolCalls(turn.tools)
  if (calls.length === 0) return null
  const last = calls[calls.length - 1]
  const line = summarizeTools(turn.tools)

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-6 w-full cursor-pointer items-center gap-1.5 text-left text-ui-xs text-ink-muted outline-none hover:text-ink focus-visible:text-ink"
      >
        <AltArrowRightIcon
          size={14}
          className={cx('shrink-0 transition-transform', open && 'rotate-90')}
        />
        {running ? (
          <span className="min-w-0 truncate motion-safe:animate-pulse">
            Đang gọi công cụ · {last.detail}
          </span>
        ) : (
          <span className="min-w-0 truncate">{line}</span>
        )}
      </button>
      {open && (
        <ul id={listId} className="mt-1 ml-[7px] space-y-1 border-l border-line-strong pl-4">
          {calls.map((step, index) => (
            <li key={step.name + String(index)} className="flex items-start gap-1.5">
              {step.status === 'error' ? (
                <DangerCircleIcon
                  size={13}
                  className="mt-px shrink-0 text-error"
                  aria-label="Lỗi"
                />
              ) : (
                <CheckIcon size={13} className="mt-px shrink-0 text-ink-muted" aria-label="Xong" />
              )}
              <span className="text-ui-xs leading-normal text-ink-muted">{step.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AiTurn({
  turn,
  workId,
  currentChapterId,
  chapterLabel,
  targetChapterExists = true,
  queueItem,
  actions,
  onCancel,
  onRetry,
  retryWith,
  onNavigateChapter
}: {
  turn: TurnView
  workId: string
  currentChapterId?: string
  /** The chapter of a turn sent from another chapter, e.g. "Chương 3". */
  chapterLabel?: string
  targetChapterExists?: boolean
  /** The proposal as the chapter's queue has it. */
  queueItem(proposalId: string): ProposalQueueItem | undefined
  actions: ProposalActions
  onCancel(requestId: string): void
  onRetry(question: string): void
  /** The first fallback model of Settings, offered when the turn failed (spec `model-defaults`). */
  retryWith?: { label: string; onClick(): void }
  onNavigateChapter?(chapterId: string): void
}): JSX.Element {
  const running = turn.status === 'sending' || turn.status === 'running'
  const otherChapter = Boolean(
    turn.chapterId && currentChapterId && turn.chapterId !== currentChapterId
  )

  return (
    <article className="flex flex-col gap-2">
      <p className="selectable w-fit self-end rounded-panel bg-control px-2.5 py-1.5 text-ui-sm leading-normal text-ink">
        {turn.question}
      </p>

      {turn.mode !== 'chat' && (
        <p className="text-ui-xs text-ink-muted">Lượt cũ · chế độ {MODE_LABEL[turn.mode]}</p>
      )}

      <SentContext blocks={turn.context} />

      {/* A fallback model answered: say which and why, apart from what the model did with tools. */}
      {turn.tools
        .filter((step) => step.name === 'fallback')
        .map((step, index) => (
          <p
            key={'fallback' + String(index)}
            role="status"
            className="flex items-center gap-1.5 text-ui-xs text-warning"
          >
            <RefreshIcon size={13} className="shrink-0" />
            {step.detail}
          </p>
        ))}

      <ToolSummary turn={turn} running={running} />

      {turn.answer !== '' && <SafeMarkdown text={turn.answer} />}

      {turn.proposals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {turn.proposals.map((proposal, index) => {
            const key = proposal.label + String(index)
            if (proposal.type === 'term') {
              return <TermProposalCard key={key} workId={workId} proposal={proposal} />
            }
            if (otherChapter || proposal.chapterId !== currentChapterId) {
              return (
                <div
                  key={key}
                  className="flex flex-col gap-1.5 rounded-panel border border-line bg-canvas p-2 text-ui-xs"
                >
                  {targetChapterExists ? (
                    <>
                      <p className="text-ink-muted">
                        {proposal.label} · thuộc <strong>{chapterLabel ?? 'chương khác'}</strong>.
                      </p>
                      {onNavigateChapter && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="self-start"
                          onClick={() => onNavigateChapter(proposal.chapterId)}
                        >
                          Mở {chapterLabel ?? 'chương'} để duyệt
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-error">Chương của đề xuất này đã bị xóa.</p>
                  )}
                </div>
              )
            }
            return (
              <TextProposalCard
                key={key}
                proposal={proposal}
                item={queueItem(proposal.proposalId)}
                actions={actions}
              />
            )
          })}
        </div>
      )}

      {running && (
        <div className="flex items-center gap-2 text-ui-xs text-ink-muted">
          <span className="motion-safe:animate-pulse">
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
        <p className="text-ui-xs text-ink-muted">
          Đã hủy. Đề xuất đã tạo trước lúc hủy vẫn ở trên; hỏi lại nếu cần.
        </p>
      )}

      {turn.status === 'error' && turn.error !== null && (
        <div className="flex flex-col gap-1.5 rounded-panel border border-error/40 bg-error/5 p-2">
          <p className="flex gap-1.5 text-ui-xs leading-normal text-ink">
            <DangerCircleIcon size={14} className="mt-px shrink-0 text-error" />
            {turn.error.message}
          </p>
          {turn.error.recoverAt !== null && (
            <p className="text-ui-xs text-ink-muted">
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
          {turn.error.account && (
            <Button
              size="sm"
              className="self-start"
              onClick={() =>
                useUiStore.getState().openSettings({
                  group: 'connections',
                  page: 'accounts',
                  key: 'account:' + turn.error!.account
                })
              }
            >
              Đăng nhập lại
            </Button>
          )}
          {retryWith && (
            <Button
              variant="ghost-muted"
              size="sm"
              className="self-start"
              onClick={retryWith.onClick}
            >
              <RefreshIcon size={14} />
              Thử bằng {retryWith.label}
            </Button>
          )}
        </div>
      )}

      {turn.status === 'interrupted' && (
        <p className="text-ui-xs text-ink-muted">
          Lượt này bị ngắt khi app đóng. Phần câu trả lời đã nhận chỉ để đọc; hãy hỏi lại nếu cần.
        </p>
      )}

      {turn.status === 'done' && (
        <div className="-ml-[7px] flex items-center gap-0.5 pt-0.5">
          <button
            type="button"
            aria-label="Sao chép"
            title="Sao chép"
            onClick={() => void navigator.clipboard.writeText(turn.answer)}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-hover hover:text-ink"
          >
            <CopyIcon size={14} />
          </button>
          <button
            type="button"
            aria-label="Hỏi lại"
            title="Hỏi lại"
            onClick={() => onRetry(turn.question)}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-hover hover:text-ink"
          >
            <RefreshIcon size={14} />
          </button>
          <span className="ml-1 text-ui-xs text-ink-muted">
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
        </div>
      )}
    </article>
  )
}
