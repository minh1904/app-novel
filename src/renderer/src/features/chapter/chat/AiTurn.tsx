import { useEffect, useId, useRef, useState, type JSX, type ReactNode } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { CopyIcon } from '@solar-icons/react/linear/copy'
import { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { StopCircleIcon } from '@solar-icons/react/linear/stop-circle'
import type { ProposalQueueItem } from '../../../../../shared/contracts/aiProposals'
import { Button } from '../../../components/Button'
import { cx } from '../../../components/cx'
import { useUiStore } from '../../../stores/uiStore'
import type { TurnView } from './chatTurns'
import { SafeMarkdown } from './SafeMarkdown'
import { TermProposalCard, TextProposalCard, type ProposalActions } from './ProposalCard'
import { summarizeTools, toolCalls } from './toolSummary'
import { thoughtSeconds, turnTime } from './turnTime'

/**
 * One question and its answer, laid out like a Hermes Desktop transcript (apps/desktop thread/*): the
 * question in a full-width box, then quiet scaffold rows — what the model thought, what it did with
 * tools — then the answer as plain text, and a footer with the time and a few icons. Nothing about what
 * was attached or selected: the model reads that for itself.
 */

/** A quiet row that opens: the "Thought" and tool lines of Hermes (`ScaffoldRow`). */
function ScaffoldRow({
  label,
  open,
  onToggle,
  pending,
  children
}: {
  label: string
  open: boolean
  onToggle(): void
  pending: boolean
  children?: ReactNode
}): JSX.Element {
  const bodyId = useId()
  return (
    <div className="text-ui-2xs text-ink-faint">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="flex w-full min-w-0 cursor-pointer items-center gap-1 text-left outline-none hover:text-ink-muted focus-visible:text-ink-muted"
      >
        <span className={cx('min-w-0 truncate', pending && 'motion-safe:animate-pulse')}>
          {label}
        </span>
        <AltArrowDownIcon
          size={10}
          aria-hidden="true"
          className={cx(
            'shrink-0 opacity-70 transition-transform duration-(--duration-fast)',
            !open && '-rotate-90'
          )}
        />
      </button>
      {open && children && (
        <div id={bodyId} className="mt-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * What the model thought. While it thinks, the text shows as a live preview that follows new tokens (as
 * Hermes does); a block that was seen live stays open afterwards, so the turn does not jump when it ends.
 * A block restored from history starts closed.
 */
function Thought({ turn, running }: { turn: TurnView; running: boolean }): JSX.Element | null {
  const pending = running && turn.answer === ''
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const [sawLive, setSawLive] = useState(false)
  if (pending && !sawLive) setSawLive(true)
  const open = userOpen ?? sawLive
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scroller.current
    if (pending && userOpen === null && element) element.scrollTop = element.scrollHeight
  }, [turn.reasoning, pending, userOpen])

  if (turn.reasoning === '') return null
  const seconds = thoughtSeconds(turn.createdAt, turn.finishedAt)
  const label = pending
    ? 'Đang suy nghĩ'
    : seconds === null || seconds < 1
      ? 'Đã suy nghĩ'
      : 'Đã suy nghĩ ' + seconds + ' giây'
  return (
    <ScaffoldRow label={label} open={open} pending={pending} onToggle={() => setUserOpen(!open)}>
      <div
        ref={scroller}
        className={cx(
          'selectable overflow-auto whitespace-pre-wrap wrap-anywhere leading-relaxed',
          pending && userOpen === null && 'max-h-40'
        )}
      >
        {turn.reasoning}
      </div>
    </ScaffoldRow>
  )
}

/** The tool calls of a turn as one line that opens into the list of calls. */
function ToolRow({ turn, running }: { turn: TurnView; running: boolean }): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const calls = toolCalls(turn.tools)
  if (calls.length === 0) return null
  const last = calls[calls.length - 1]
  const pending = running && turn.answer === ''
  return (
    <ScaffoldRow
      label={pending ? last.detail : summarizeTools(turn.tools)}
      open={open}
      pending={pending}
      onToggle={() => setOpen((value) => !value)}
    >
      <ul className="m-0 list-none space-y-0.5 p-0">
        {calls.map((step, index) => (
          <li key={step.name + String(index)} className="flex items-start gap-1.5">
            {step.status === 'error' && (
              <DangerCircleIcon size={11} className="mt-px shrink-0 text-error" aria-label="Lỗi" />
            )}
            <span className="wrap-anywhere">{step.detail}</span>
          </li>
        ))}
      </ul>
    </ScaffoldRow>
  )
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick(): void
  children: ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-faint hover:bg-hover hover:text-ink"
    >
      {children}
    </button>
  )
}

function usageLine(turn: TurnView): string {
  if (turn.usage === null) return 'Nhà cung cấp không báo lượng dùng'
  return (
    turn.usage.inputTokens +
    ' + ' +
    turn.usage.outputTokens +
    ' token · ' +
    // A missing price means the snapshot has none for this model, which is not the same as free.
    (turn.usd === null ? 'chưa biết giá' : '$' + turn.usd.toFixed(4))
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
  onRetry(question: string): void
  /** The first fallback model of Settings, offered when the turn failed (spec `model-defaults`). */
  retryWith?: { label: string; onClick(): void }
  onNavigateChapter?(chapterId: string): void
}): JSX.Element {
  const running = turn.status === 'sending' || turn.status === 'running'
  const otherChapter = Boolean(
    turn.chapterId && currentChapterId && turn.chapterId !== currentChapterId
  )
  const waiting =
    running && turn.answer === '' && turn.reasoning === '' && toolCalls(turn.tools).length === 0

  return (
    <article className="flex flex-col gap-1.5">
      <div className="group/question relative rounded-panel border border-line bg-control/50 px-3 py-2">
        <p className="selectable m-0 whitespace-pre-wrap wrap-anywhere text-ui-sm leading-normal text-ink">
          {turn.question}
        </p>
        <span className="pointer-events-none absolute top-2 right-3 text-ui-2xs text-ink-faint opacity-0 transition-opacity group-hover/question:opacity-100">
          {turnTime(turn.createdAt)}
        </span>
      </div>

      {/* A fallback model answered: say which and why, as its own quiet line. */}
      {turn.tools
        .filter((step) => step.name === 'fallback')
        .map((step, index) => (
          <p
            key={'fallback' + String(index)}
            role="status"
            className="m-0 text-ui-2xs text-warning"
          >
            {step.detail}
          </p>
        ))}

      <Thought turn={turn} running={running} />
      <ToolRow turn={turn} running={running} />

      {waiting && (
        <p className="m-0 text-ui-2xs text-ink-faint motion-safe:animate-pulse">Đang suy nghĩ</p>
      )}

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
                  className="flex flex-col gap-1.5 rounded-panel border border-line p-2 text-ui-xs"
                >
                  {targetChapterExists ? (
                    <>
                      <p className="m-0 text-ink-muted">
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
                    <p className="m-0 text-error">Chương của đề xuất này đã bị xóa.</p>
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

      {turn.status === 'cancelled' && (
        <p className="m-0 flex items-center gap-1 text-ui-2xs text-ink-faint">
          <StopCircleIcon size={12} aria-hidden="true" />
          Đã dừng
        </p>
      )}

      {turn.status === 'interrupted' && (
        <p className="m-0 flex items-center gap-1 text-ui-2xs text-ink-faint">
          <StopCircleIcon size={12} aria-hidden="true" />
          Bị ngắt khi app đóng
        </p>
      )}

      {turn.status === 'error' && turn.error !== null && (
        <div className="flex flex-col gap-1.5 rounded-panel border border-error/35 bg-error/7 px-3 py-2 text-ui-xs leading-normal text-ink">
          <p className="m-0 flex items-start gap-1.5">
            <DangerCircleIcon size={14} className="mt-px shrink-0 text-error" />
            <span className="min-w-0">{turn.error.message}</span>
          </p>
          {turn.error.recoverAt !== null && (
            <p className="m-0 text-ink-muted">
              Hạn mức hồi phục khoảng{' '}
              {new Date(turn.error.recoverAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
              .
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {turn.error.account && (
              <Button
                size="sm"
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
            {turn.error.retryable && (
              <Button variant="ghost-muted" size="sm" onClick={() => onRetry(turn.question)}>
                Hỏi lại
              </Button>
            )}
            {retryWith && (
              <Button variant="ghost-muted" size="sm" onClick={retryWith.onClick}>
                Thử bằng {retryWith.label}
              </Button>
            )}
          </div>
        </div>
      )}

      {turn.status === 'done' && (
        <div className="flex items-center justify-end gap-1.5 text-ui-2xs text-ink-faint">
          <span title={usageLine(turn) + (turn.keyTail !== null ? ' · khóa …' + turn.keyTail : '')}>
            {turnTime(turn.finishedAt ?? turn.createdAt)}
          </span>
          <IconButton
            label="Sao chép"
            onClick={() => void navigator.clipboard.writeText(turn.answer)}
          >
            <CopyIcon size={12} />
          </IconButton>
          <IconButton label="Hỏi lại" onClick={() => onRetry(turn.question)}>
            <RefreshIcon size={12} />
          </IconButton>
        </div>
      )}
    </article>
  )
}
