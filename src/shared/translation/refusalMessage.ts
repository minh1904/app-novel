import type { RefusalGroup } from '../contracts/aiTranslate'

const GROUP_LABEL: Record<RefusalGroup, string> = {
  prohibited: 'bị chặn theo chính sách nội dung',
  safety: 'bị bộ lọc an toàn chặn',
  recitation: 'bị bộ lọc trích dẫn chặn (không phải vấn đề nội dung)',
  other: 'bị bộ lọc chặn không rõ lý do'
}

const GROUP_ORDER: RefusalGroup[] = ['prohibited', 'safety', 'recitation', 'other']

/**
 * The sentence for segments the provider's filter would not let through, counted by reason. Retrying is
 * useless for any of them; the person decides whether to translate by hand or use another model. Shared so
 * the batch message from main and the run summary on screen say the same thing.
 */
export function describeRefusals(groups: RefusalGroup[]): string {
  const counts = new Map<RefusalGroup, number>()
  for (const group of groups) counts.set(group, (counts.get(group) ?? 0) + 1)
  const parts = GROUP_ORDER.filter((group) => counts.has(group)).map(
    (group) => `${counts.get(group)} đoạn ${GROUP_LABEL[group]}`
  )
  return 'Nhà cung cấp từ chối dịch ' + parts.join(', ') + '; cần dịch tay hoặc dùng model khác.'
}
