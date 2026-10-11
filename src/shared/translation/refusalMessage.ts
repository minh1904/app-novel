import type { RefusalGroup } from '../contracts/aiTranslate'

const GROUP_LABEL: Record<RefusalGroup, string> = {
  prohibited: 'bị chặn theo chính sách nội dung',
  safety: 'bị bộ lọc an toàn chặn',
  recitation: 'bị bộ lọc trích dẫn chặn (không phải vấn đề nội dung)',
  other: 'bị bộ lọc chặn không rõ lý do'
}

const GROUP_ORDER: RefusalGroup[] = ['prohibited', 'safety', 'recitation', 'other']

/**
 * Câu thông báo mô tả các đoạn bị bộ lọc của nhà cung cấp từ chối dịch, thống kê theo từng lý do.
 * Thử lại với cùng cấu hình sẽ không có tác dụng; người dùng có thể tự dịch thủ công hoặc đổi mô hình khác.
 * Dùng chung giữa thông báo xử lý hàng loạt từ main và màn hình tóm tắt của renderer.
 */
export function describeRefusals(groups: RefusalGroup[]): string {
  const counts = new Map<RefusalGroup, number>()
  for (const group of groups) counts.set(group, (counts.get(group) ?? 0) + 1)
  const parts = GROUP_ORDER.filter((group) => counts.has(group)).map(
    (group) => `${counts.get(group)} đoạn ${GROUP_LABEL[group]}`
  )
  return 'Nhà cung cấp từ chối dịch ' + parts.join(', ') + '; cần dịch tay hoặc dùng model khác.'
}
