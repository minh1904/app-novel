import type { ChatToolProposal } from '../../../shared/contracts/aiChat'
import {
  aiSessionsListSchema,
  aiTurnsListSchema,
  type AiTurnView
} from '../../../shared/contracts/aiHistory'
import { CHANNELS } from '../../../shared/contracts/channels'
import { listAiSessions, listAiTurns, type StoredTurn } from '../../infra/storage/aiSessions'
import type { Db } from '../../infra/storage/sqlite'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/**
 * Các đề xuất do một lượt tạo ra, theo đúng thứ tự đã tạo. Bản ghi của tool được ưu tiên trước
 * vì chỉ tool mới biết đề xuất thuật ngữ (mục thuật ngữ không lưu turn_id). Các đề xuất lưu theo lượt
 * mà không có tool step nào nhắc tới là của lượt Edit hoặc Apply cũ; chúng được hiển thị tương tự
 * để phiên cũ vẫn đọc được các đề xuất tương ứng.
 */
function proposalsOf(db: Db, turn: StoredTurn): ChatToolProposal[] {
  const fromTools = turn.tools.flatMap((step) => (step.proposal ? [step.proposal] : []))
  const named = new Set(
    fromTools.flatMap((proposal) => (proposal.type === 'term' ? [] : [proposal.proposalId]))
  )
  const rows = db
    .prepare(
      `SELECT p.id AS proposal_id, pp.id AS part_id, pp.source_order
      FROM proposal p JOIN proposal_part pp ON pp.proposal_id = p.id
      WHERE p.turn_id = ? ORDER BY p.created_at, p.id, pp.ordinal`
    )
    .all<{ proposal_id: string; part_id: string; source_order: number | null }>(turn.id)
  const stored = new Map<string, ChatToolProposal & { type: 'edit' | 'translation' }>()
  for (const row of rows) {
    if (named.has(row.proposal_id) || turn.chapterId === null) continue
    const known = stored.get(row.proposal_id)
    if (known) {
      known.partIds.push(row.part_id)
      continue
    }
    stored.set(row.proposal_id, {
      type: row.source_order === null ? 'edit' : 'translation',
      proposalId: row.proposal_id,
      partIds: [row.part_id],
      chapterId: turn.chapterId,
      label: turn.action === 'apply' ? 'Áp dụng thẳng (lượt cũ)' : 'Đề xuất sửa (lượt cũ)'
    })
  }
  return [...fromTools, ...stored.values()]
}

export function sessionHandlers({ library }: HandlerDeps): AreaHandlers<'ai:sessions'> {
  return {
    [CHANNELS.aiSessionsList]: createHandler(aiSessionsListSchema, (input) =>
      library.withWork(input.workId, (db) => ({
        sessions: listAiSessions(
          db,
          input.limit ?? 30,
          input.beforeUpdatedAt === undefined || input.beforeId === undefined
            ? undefined
            : { updatedAt: input.beforeUpdatedAt, id: input.beforeId }
        )
      }))
    ),
    [CHANNELS.aiTurnsList]: createHandler(aiTurnsListSchema, (input) =>
      library.withWork(input.workId, (db) => ({
        turns: listAiTurns(
          db,
          input.sessionId,
          input.limit ?? 100,
          input.beforeCreatedAt === undefined || input.beforeId === undefined
            ? undefined
            : { createdAt: input.beforeCreatedAt, id: input.beforeId }
        ).map((turn): AiTurnView => ({ ...turn, proposals: proposalsOf(db, turn) }))
      }))
    )
  }
}
