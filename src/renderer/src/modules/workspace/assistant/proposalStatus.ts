import type {
  ProposalPartStatus,
  ProposalPartView
} from '../../../../../shared/contracts/aiProposals'

/** Tên hiển thị tiếng Việt của các trạng thái đề xuất, dùng chung cho hàng chờ và thẻ đề xuất. */
export const PART_STATUS_LABEL: Record<ProposalPartStatus, string> = {
  pending: 'Chờ duyệt',
  applied: 'Đã áp dụng',
  rejected: 'Đã bỏ',
  conflict: 'Xung đột',
  stale: 'Nguồn đã đổi',
  'needs-placement': 'Cần đặt vị trí'
}

const OPEN_STATUSES: ProposalPartStatus[] = ['pending', 'conflict', 'stale', 'needs-placement']

/** Kiểm tra một phần đề xuất có đang ở trạng thái chờ duyệt hay không. */
export const isOpenPart = (part: ProposalPartView): boolean => OPEN_STATUSES.includes(part.status)

/** Xác định trạng thái tổng thể cho đề xuất gồm nhiều phần: lấy trạng thái mở đầu tiên, hoặc trạng thái chung khi tất cả đã đóng. */
export function proposalStatus(parts: ProposalPartView[]): ProposalPartStatus | null {
  if (parts.length === 0) return null
  const open = parts.find(isOpenPart)
  if (open) return open.status
  return parts.every((part) => part.status === 'rejected') ? 'rejected' : 'applied'
}
