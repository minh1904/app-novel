import * as v from 'valibot'
import { idSchema } from './library'

const chapterId = idSchema

/** Where one part of a proposal stands. */
export type ProposalPartStatus =
  | 'pending'
  | 'applied'
  | 'rejected'
  | 'conflict'
  | 'stale'
  | 'needs-placement'

export const acceptProposalSchema = v.strictObject({
  workId: idSchema,
  chapterId,
  partId: idSchema,
  commandId: idSchema
})
export type AcceptProposalInput = v.InferInput<typeof acceptProposalSchema>

export interface AcceptProposalResult {
  accepted: string[]
  skipped: Array<{ partId: string; reason: string }>
  content: string
  rev: number
}

export interface ProposalPartView {
  id: string
  baseFrom: number | null
  baseTo: number | null
  beforeText: string
  afterText: string
  sourceOrder: number | null
  status: ProposalPartStatus
  reason: string | null
}

export interface ProposalQueueItem {
  id: string
  chapterId: string
  sessionId?: string | null
  origin: 'chat' | 'translate'
  policy: 'review' | 'auto'
  createdAt: number
  parts: ProposalPartView[]
}

export const chapterProposalRefSchema = v.strictObject({ workId: idSchema, chapterId })
export const proposalDenySchema = v.strictObject({ workId: idSchema, chapterId, partId: idSchema })
export const proposalAcceptAllSchema = v.strictObject({
  workId: idSchema,
  chapterId,
  commandId: idSchema
})
