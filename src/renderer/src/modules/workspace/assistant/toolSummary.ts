import type { ChatToolStep } from '../../../../../shared/contracts/aiChat'

/**
 * Tóm tắt các lệnh gọi công cụ trong một lượt hỏi thành một dòng ngắn gọn: ví dụ "Đã đọc 2 chương, tìm 1 lần, đề xuất 1 sửa".
 *
 * Lệnh gọi thất bại được thống kê riêng và không tính vào công việc đã hoàn thành. Thông báo chuyển sang model dự phòng không tính là lệnh gọi công cụ.
 */

/** Lọc danh sách các bước gọi công cụ theo thứ tự thực hiện, loại trừ thông báo chuyển model dự phòng. */
export function toolCalls(tools: ChatToolStep[]): ChatToolStep[] {
  return tools.filter((step) => step.name !== 'fallback')
}

const PROPOSAL_WORDS = { edit: 'sửa', translation: 'dịch', term: 'thuật ngữ' } as const

export function summarizeTools(tools: ChatToolStep[]): string {
  const calls = toolCalls(tools)
  if (calls.length === 0) return ''
  const chapters = new Set<string>()
  let searches = 0
  let lookups = 0
  let located = false
  let listed = false
  let failed = 0
  const proposals = { edit: 0, translation: 0, term: 0 }
  for (const step of calls) {
    if (step.status === 'error') {
      failed++
      continue
    }
    if (step.name === 'read_chapter' || step.name === 'read_segments') {
      chapters.add(/Chương (\d+)/.exec(step.detail)?.[1] ?? step.detail)
    } else if (step.name === 'search_work') searches++
    else if (step.name === 'list_glossary' || step.name === 'list_addressing') lookups++
    else if (step.name === 'get_current_chapter') located = true
    else if (step.name === 'list_chapters') listed = true
    else if (step.proposal) proposals[step.proposal.type]++
  }
  const parts: string[] = []
  if (located) parts.push('xem vị trí')
  if (listed) parts.push('liệt kê chương')
  if (chapters.size > 0) parts.push(`đọc ${chapters.size} chương`)
  if (searches > 0) parts.push(`tìm ${searches} lần`)
  if (lookups > 0) parts.push(`tra glossary/xưng hô ${lookups} lần`)
  const proposed = (Object.keys(proposals) as Array<keyof typeof proposals>)
    .filter((type) => proposals[type] > 0)
    .map((type) => `${proposals[type]} ${PROPOSAL_WORDS[type]}`)
  if (proposed.length > 0) parts.push('đề xuất ' + proposed.join(', '))
  const done = parts.length > 0 ? 'Đã ' + parts.join(', ') : ''
  const errors = failed > 0 ? `${failed} lần gọi lỗi` : ''
  return [done, errors].filter((part) => part !== '').join(' · ')
}
