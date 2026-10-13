import type { AgentContext } from '../../../../../shared/contracts/agent'
import type { ContextLabels } from '../adapter/workspaceAdapter'

export type ChipKey = 'work' | 'chapter' | 'selection' | 'caret'

export interface ContextChip {
  key: ChipKey
  label: string
}

const sideName = (side: 'source' | 'target'): string => (side === 'source' ? 'bản gốc' : 'bản dịch')

/** Chips for what the composer would send now, in the order a removal cascades. */
export function contextChips(context: AgentContext, labels: ContextLabels): ContextChip[] {
  const chips: ContextChip[] = []
  if (context.workId) chips.push({ key: 'work', label: labels.work ?? 'Tác phẩm đang mở' })
  if (context.chapterId) chips.push({ key: 'chapter', label: labels.chapter ?? 'Chương đang mở' })
  if (context.selection) {
    const { side, from, to } = context.selection
    chips.push({
      key: 'selection',
      label: from === to ? `Đoạn ${from} ${sideName(side)}` : `Đoạn ${from}–${to} ${sideName(side)}`
    })
  } else if (context.caret && (context.caret.source !== null || context.caret.target !== null)) {
    const side = context.caret.target !== null ? 'target' : 'source'
    chips.push({ key: 'caret', label: `Con trỏ ở đoạn ${context.caret[side]} ${sideName(side)}` })
  }
  return chips
}

/**
 * The snapshot sent with the turn: the context minus the removed chips. A chapter needs its work and
 * a paragraph needs its chapter, so removing one drops what depends on it.
 */
export function withoutChips(context: AgentContext, removed: ReadonlySet<ChipKey>): AgentContext {
  if (removed.has('work') || !context.workId) return {}
  const result: AgentContext = { workId: context.workId }
  if (removed.has('chapter') || !context.chapterId) return result
  result.chapterId = context.chapterId
  if (context.selection && !removed.has('selection')) result.selection = context.selection
  if (context.caret && !removed.has('caret') && !removed.has('selection'))
    result.caret = context.caret
  return result
}
