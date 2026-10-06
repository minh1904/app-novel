import type { ChatProposalInput, ChatProposalResult } from '../../../shared/contracts/aiProposals'
import { createProposal, getProposal, setProposalPartDecision } from '../../infra/storage/aiProposals'
import { getAiTurn } from '../../infra/storage/aiSessions'
import { StorageError } from '../../infra/storage/errors'
import { readText } from '../../infra/storage/textFile'
import type { LibraryStore } from '../library/library'
import type { Db } from '../../infra/storage/sqlite'
import { acceptProposalParts, textHash } from './proposalService'

/** Turns a finished fenced chat answer into a durable proposal, then optionally accepts it. */
export function createChatProposal(
  library: LibraryStore,
  input: ChatProposalInput
): ChatProposalResult {
  return library.withWork(input.workId, (db) => db.transaction(() =>
    createChatProposalInDb(db, input, library.appNow(), () => library.newAppId())
  ))
}

/** Caller may include this in the transaction that completes the AI turn. */
export function createChatProposalInDb(
  db: Db,
  input: ChatProposalInput,
  now: number,
  newId: () => string
): ChatProposalResult {
  if (
    input.range.to < input.range.from ||
    input.range.to > input.targetBaseContent.length ||
    input.targetBaseContent.slice(input.range.from, input.range.to) !== input.range.text
  ) throw new StorageError('validation', 'Vùng thay thế không khớp bản dịch lúc gửi.')

    const key = 'chat:' + input.commandId
    const prior = db.prepare('SELECT id FROM proposal WHERE run_key = ?').get<{ id: string }>(key)
    if (prior) {
      const saved = getProposal(db, prior.id)
      const part = saved.parts[0]
      const target = readText(db, input.chapterId, 'target')
      return {
        proposalId: saved.id, partId: part.id,
        status: part.status as ChatProposalResult['status'],
        content: part.status === 'applied' ? target.content : null,
        rev: part.status === 'applied' ? target.rev : null
      }
    }
    const turn = input.turnId ? getAiTurn(db, input.turnId) : null
    if (turn && (
      turn.chapterId !== input.chapterId || turn.status !== 'done' ||
      turn.action !== input.action ||
      (turn.range !== null && (
        turn.range.from !== input.range.from || turn.range.to !== input.range.to ||
        turn.range.text !== input.range.text
      ))
    )) throw new StorageError('validation', 'Lượt AI không khớp đề xuất.')
    const proposalId = newId()
    const partId = newId()
    createProposal(db, {
      id: proposalId, chapterId: input.chapterId,
      sessionId: turn?.sessionId, turnId: turn?.id, origin: 'chat',
      policy: input.action === 'apply' ? 'auto' : 'review',
      sourceRev: input.sourceRev, sourceHash: textHash(input.sourceContent),
      targetBaseRev: input.targetBaseRev, targetBaseContent: input.targetBaseContent,
      context: turn?.context,
      contextHash: turn ? textHash(JSON.stringify(turn.context)) : null,
      provider: turn?.provider, model: turn?.model,
      usage: turn?.usage, runKey: key, now,
      parts: [{
        id: partId, baseFrom: input.range.from, baseTo: input.range.to,
        beforeText: input.range.text, afterText: input.replacement
      }]
    })
    if (input.action === 'edit') {
      return { proposalId, partId, status: 'pending', content: null, rev: null }
    }
    if (input.blockAutoApply) {
      setProposalPartDecision(db, partId, 'conflict', null, 'unsaved-or-changed-editor', now)
      return { proposalId, partId, status: 'conflict', content: null, rev: null }
    }
    const source = readText(db, input.chapterId, 'source')
    if (source.rev !== input.sourceRev) {
      setProposalPartDecision(db, partId, 'stale', null, 'source-changed', now)
      return { proposalId, partId, status: 'stale', content: null, rev: null }
    }
    const accepted = acceptProposalParts(db, {
      chapterId: input.chapterId, partIds: [partId], commandId: input.commandId,
      actor: 'auto', now, newId
    })
    const status = accepted.accepted.includes(partId)
      ? 'applied'
      : getProposal(db, proposalId).parts[0].status as ChatProposalResult['status']
    return {
      proposalId, partId, status,
      content: status === 'applied' ? accepted.content : null,
      rev: status === 'applied' ? accepted.rev : null
    }
}
