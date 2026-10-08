import { createProposal } from '../../infra/storage/aiProposals'
import { getAiTurn } from '../../infra/storage/aiSessions'
import { StorageError } from '../../infra/storage/errors'
import type { Db } from '../../infra/storage/sqlite'
import type { ToolProposalInput } from '../ai/chatTools'
import { textHash } from './proposalService'

/**
 * A proposal a chat tool made while its turn was still running (change `agentic-chat`): always for review,
 * never applied here, and tied to the turn and its session. A repeated `commandId` returns the proposal it
 * already made, so a call that runs twice makes one.
 *
 * This is the only way chat creates a proposal. The fenced block at the end of an Edit answer, and the IPC
 * that let the renderer turn one into a proposal, went with the modes.
 */
export function createToolProposalInDb(
  db: Db,
  input: ToolProposalInput,
  now: number,
  newId: () => string
): { proposalId: string; partIds: string[] } {
  const { part } = input
  if (
    part.baseFrom !== null &&
    (part.baseTo === null ||
      part.baseTo < part.baseFrom ||
      input.targetBaseContent.slice(part.baseFrom, part.baseTo) !== part.beforeText)
  ) {
    throw new StorageError('validation', 'Vùng thay thế không khớp bản dịch lúc đề xuất.')
  }
  const turn = getAiTurn(db, input.turnId)
  if (turn.chapterId !== input.chapterId) {
    throw new StorageError('validation', 'Lượt AI không thuộc chương của đề xuất.')
  }
  const saved = createProposal(db, {
    id: newId(),
    chapterId: input.chapterId,
    sessionId: turn.sessionId,
    turnId: turn.id,
    origin: 'chat',
    policy: 'review',
    sourceRev: input.sourceRev,
    sourceHash: textHash(input.sourceContent),
    targetBaseRev: input.targetBaseRev,
    targetBaseContent: input.targetBaseContent,
    provider: turn.provider,
    model: turn.model,
    runKey: 'chat:' + input.commandId,
    now,
    parts: [{ id: newId(), ...part }]
  })
  return { proposalId: saved.id, partIds: saved.parts.map((item) => item.id) }
}
