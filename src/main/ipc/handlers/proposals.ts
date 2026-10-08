import {
  acceptProposalSchema,
  chapterProposalRefSchema,
  proposalAcceptAllSchema,
  proposalDenySchema,
  type ProposalQueueItem
} from '../../../shared/contracts/aiProposals'
import { CHANNELS } from '../../../shared/contracts/channels'
import { idSchema } from '../../../shared/contracts/library'
import { createHandler } from '../handler'
import {
  acceptAllChapterParts,
  acceptProposalParts,
  denyProposalPart,
  undoLatestAccept
} from '../../services/proposals/proposalService'
import {
  latestTextSnapshot,
  listChapterProposals,
  pendingCountByChapter
} from '../../infra/storage/aiProposals'
import { readText } from '../../infra/storage/textFile'
import type { AreaHandlers, HandlerDeps } from './deps'

export function proposalHandlers({ library }: HandlerDeps): AreaHandlers<'ai:proposals'> {
  return {
    [CHANNELS.aiProposalAccept]: createHandler(acceptProposalSchema, (input) =>
      library.withWork(input.workId, (db) =>
        acceptProposalParts(db, {
          chapterId: input.chapterId,
          partIds: [input.partId],
          commandId: input.commandId,
          actor: 'user',
          now: library.appNow(),
          newId: () => library.newAppId()
        })
      )
    ),
    [CHANNELS.aiProposalDeny]: createHandler(proposalDenySchema, (input) =>
      library.withWork(input.workId, (db) => {
        denyProposalPart(db, input.chapterId, input.partId, library.appNow())
      })
    ),
    [CHANNELS.aiProposalAcceptAll]: createHandler(proposalAcceptAllSchema, (input) =>
      library.withWork(input.workId, (db) =>
        acceptAllChapterParts(db, {
          chapterId: input.chapterId,
          commandId: input.commandId,
          actor: 'user',
          now: library.appNow(),
          newId: () => library.newAppId()
        })
      )
    ),
    [CHANNELS.aiProposalUndo]: createHandler(chapterProposalRefSchema, (input) =>
      library.withWork(input.workId, (db) =>
        undoLatestAccept(db, input.chapterId, library.appNow(), () => library.newAppId())
      )
    ),
    [CHANNELS.aiProposalListChapter]: createHandler(chapterProposalRefSchema, (input) =>
      library.withWork(input.workId, (db) => ({
        undoAvailable: (() => {
          const checkpoint = latestTextSnapshot(db, input.chapterId)
          return (
            checkpoint !== null &&
            checkpoint.undoneAt === null &&
            readText(db, input.chapterId, 'target').rev === checkpoint.afterRev
          )
        })(),
        proposals: listChapterProposals(db, input.chapterId, 100).map(
          (proposal): ProposalQueueItem => ({
            id: proposal.id,
            chapterId: proposal.chapterId,
            sessionId: proposal.sessionId,
            origin: proposal.origin,
            policy: proposal.policy,
            createdAt: proposal.createdAt,
            parts: proposal.parts.map((part) => ({
              id: part.id,
              baseFrom: part.baseFrom,
              baseTo: part.baseTo,
              beforeText: part.beforeText,
              afterText: part.afterText,
              sourceOrder: part.sourceOrder,
              status: part.status,
              reason: part.reason
            }))
          })
        )
      }))
    ),
    [CHANNELS.aiProposalPendingCounts]: createHandler(
      v.strictObject({ workId: idSchema }),
      (input) => library.withWork(input.workId, (db) => ({ counts: pendingCountByChapter(db) }))
    )
  }
}
import * as v from 'valibot'
