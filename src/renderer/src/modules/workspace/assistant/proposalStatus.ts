import type {
  ProposalPartStatus,
  ProposalPartView
} from '../../../../../shared/contracts/aiProposals'

/** What a proposal's status is called, in the queue and under a chat turn alike. */
export const PART_STATUS_LABEL: Record<ProposalPartStatus, string> = {
  pending: 'Chờ duyệt',
  applied: 'Đã áp dụng',
  rejected: 'Đã bỏ',
  conflict: 'Xung đột',
  stale: 'Nguồn đã đổi',
  'needs-placement': 'Cần đặt vị trí'
}

const OPEN_STATUSES: ProposalPartStatus[] = ['pending', 'conflict', 'stale', 'needs-placement']

/** A part still waiting for a decision. */
export const isOpenPart = (part: ProposalPartView): boolean => OPEN_STATUSES.includes(part.status)

/** One status for a proposal of several parts: the first still open, else what they all became. */
export function proposalStatus(parts: ProposalPartView[]): ProposalPartStatus | null {
  if (parts.length === 0) return null
  const open = parts.find(isOpenPart)
  if (open) return open.status
  return parts.every((part) => part.status === 'rejected') ? 'rejected' : 'applied'
}
