import { useCallback, useEffect, useState, type JSX } from 'react'
import type { ChatToolProposal } from '../../../../../shared/contracts/aiChat'
import type {
  ProposalPartStatus,
  ProposalPartView,
  ProposalQueueItem
} from '../../../../../shared/contracts/aiProposals'
import type { ContextStatus } from '../../../../../shared/contracts/glossary'
import { Button } from '../../../components/Button'
import { cx } from '../../../components/cx'
import { isOpenPart, PART_STATUS_LABEL, proposalStatus } from './proposalStatus'

/**
 * One proposal, shown the same way wherever it appears: in the chapter's queue and under the chat turn
 * that made it (change `agentic-chat`). Its status is always read from the queue (or the glossary, for a
 * term), never kept by the card, so the two places cannot disagree.
 */

const TONE: Record<ProposalPartStatus, string> = {
  pending: 'text-ink-muted',
  applied: 'text-success',
  rejected: 'text-ink-muted',
  conflict: 'text-error',
  stale: 'text-warning',
  'needs-placement': 'text-warning'
}

/** The card itself: a title, a status, the text before and after, and what can be done with it. */
export function ProposalCard({
  title,
  status,
  statusLabel,
  before,
  after,
  note,
  onAccept,
  onDeny,
  onShow,
  acceptDisabled
}: {
  title: string
  status: ProposalPartStatus | null
  /** Overrides the label of `status`, for a term whose states are named differently. */
  statusLabel?: string
  before: string
  after: string
  note?: string
  onAccept?: () => void
  onDeny?: () => void
  onShow?: () => void
  acceptDisabled?: boolean
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const label = statusLabel ?? (status === null ? 'Đang tải…' : PART_STATUS_LABEL[status])
  return (
    <div className="rounded-panel border border-line-strong bg-canvas p-2 text-ui-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-ink">{title}</span>
        <span className={cx('shrink-0', status === null ? 'text-ink-muted' : TONE[status])}>
          {label}
        </span>
      </div>
      {note && <p className="mt-1 text-ink-muted">{note}</p>}
      <button
        type="button"
        aria-expanded={open}
        className="mt-1 cursor-pointer text-ink-muted underline hover:text-ink"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Thu gọn' : 'Xem trước và sau'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {before !== '' && (
            <div>
              <p className="text-ink-muted">Trước</p>
              <pre className="selectable max-h-32 overflow-auto whitespace-pre-wrap text-ink">
                {before}
              </pre>
            </div>
          )}
          <div>
            <p className="text-ink-muted">Sau</p>
            <pre className="selectable max-h-32 overflow-auto whitespace-pre-wrap text-ink">
              {after}
            </pre>
          </div>
        </div>
      )}
      {(onAccept || onDeny || onShow) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {onShow && (
            <Button size="sm" variant="outline" onClick={onShow}>
              Xem trong bản dịch
            </Button>
          )}
          {onAccept && (
            <Button size="sm" disabled={acceptDisabled} onClick={onAccept}>
              Chấp nhận
            </Button>
          )}
          {onDeny && (
            <Button size="sm" variant="outline" onClick={onDeny}>
              Bỏ
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** What the panel does with a text proposal; the same functions serve the queue and the turn cards. */
export interface ProposalActions {
  accept(partIds: string[]): void
  deny(partIds: string[]): void
  show(part: ProposalPartView): void
}

/** A text proposal under a turn, read from the queue by id. */
export function TextProposalCard({
  proposal,
  item,
  actions
}: {
  proposal: Extract<ChatToolProposal, { type: 'edit' | 'translation' }>
  /** The proposal as the queue has it; absent while the queue reloads or when it is no longer listed. */
  item: ProposalQueueItem | undefined
  actions: ProposalActions
}): JSX.Element {
  const parts = item?.parts.filter((part) => proposal.partIds.includes(part.id)) ?? []
  const status = proposalStatus(parts)
  const open = parts.filter(isOpenPart)
  const placeable = open.filter((part) => part.status !== 'needs-placement')
  const shown = parts.find(
    (part) => part.baseFrom !== null && part.baseTo !== null && isOpenPart(part)
  )
  return (
    <ProposalCard
      title={proposal.label}
      status={item === undefined ? null : status}
      statusLabel={item === undefined ? 'Không còn trong hàng chờ của chương' : undefined}
      before={parts.map((part) => part.beforeText).join('\n\n')}
      after={parts.map((part) => part.afterText).join('\n\n')}
      note={
        open.some((part) => part.status === 'needs-placement')
          ? 'Chưa tìm được chỗ đặt trong bản dịch; đặt vị trí trong hàng chờ.'
          : undefined
      }
      onShow={shown ? () => actions.show(shown) : undefined}
      onAccept={
        open.length > 0 ? () => actions.accept(placeable.map((part) => part.id)) : undefined
      }
      acceptDisabled={placeable.length === 0}
      onDeny={open.length > 0 ? () => actions.deny(open.map((part) => part.id)) : undefined}
    />
  )
}

const TERM_LABEL: Record<ContextStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã bỏ'
}

const TERM_TONE: Record<ContextStatus, ProposalPartStatus> = {
  pending: 'pending',
  approved: 'applied',
  rejected: 'rejected'
}

/** A term proposal: a pending glossary entry, approved or rejected right here. */
export function TermProposalCard({
  workId,
  proposal
}: {
  workId: string
  proposal: Extract<ChatToolProposal, { type: 'term' }>
}): JSX.Element {
  const [status, setStatus] = useState<ContextStatus | 'missing' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void window.mira.glossary.get({ workId, entryId: proposal.entryId }).then((result) => {
      if (active) setStatus(result.ok ? result.value.status : 'missing')
    })
    return () => {
      active = false
    }
  }, [workId, proposal.entryId])

  const decide = useCallback(
    async (next: ContextStatus): Promise<void> => {
      const result = await window.mira.glossary.update({
        workId,
        entryId: proposal.entryId,
        status: next
      })
      if (result.ok) {
        setStatus(result.value.status)
        setError(null)
      } else setError(result.error.message)
    },
    [workId, proposal.entryId]
  )

  const known = status !== null && status !== 'missing'
  return (
    <ProposalCard
      title={proposal.label}
      status={known ? TERM_TONE[status] : null}
      statusLabel={
        status === 'missing'
          ? 'Mục đã bị xóa khỏi glossary'
          : known
            ? TERM_LABEL[status]
            : undefined
      }
      before=""
      after={`${proposal.term} → ${proposal.translation}`}
      note={error ?? undefined}
      onAccept={status === 'pending' ? () => void decide('approved') : undefined}
      onDeny={status === 'pending' ? () => void decide('rejected') : undefined}
    />
  )
}
