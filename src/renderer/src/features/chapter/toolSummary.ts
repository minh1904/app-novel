import type { ChatToolStep } from '../../../../shared/contracts/aiChat'

/**
 * One line for every tool call of a turn, as Hermes shows it: "Đã đọc 2 chương, tìm 1 lần, đề xuất 1 sửa".
 * The calls themselves stay one click away; the line is what the reader skims past to the answer.
 *
 * A failed call is not counted as done work: it is counted apart, so "đọc 2 chương" never includes the
 * chapter that did not exist. Fallback notices are not tool calls and are shown elsewhere.
 */

/** The steps that are tool calls, in order: everything but fallback notices. */
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
