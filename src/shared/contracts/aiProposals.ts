import * as v from 'valibot'
import { idSchema } from './library'
import { TEXT_MAX_UNITS } from './text'

const chapterId = idSchema
const revision = v.pipe(v.number(), v.integer(), v.minValue(0))
const offset = v.pipe(v.number(), v.integer(), v.minValue(0))

export const chatProposalSchema = v.strictObject({
  workId: idSchema,
  chapterId,
  commandId: idSchema,
  turnId: v.optional(idSchema),
  action: v.picklist(['sua', 'ap_dung']),
  blockAutoApply: v.boolean(),
  sourceRev: revision,
  sourceContent: v.pipe(v.string(), v.maxLength(TEXT_MAX_UNITS)),
  targetBaseRev: revision,
  targetBaseContent: v.pipe(v.string(), v.maxLength(TEXT_MAX_UNITS)),
  range: v.strictObject({
    from: offset,
    to: offset,
    text: v.pipe(v.string(), v.maxLength(TEXT_MAX_UNITS))
  }),
  replacement: v.pipe(v.string(), v.minLength(1), v.maxLength(TEXT_MAX_UNITS))
})

export type ChatProposalInput = v.InferInput<typeof chatProposalSchema>

export interface ChatProposalResult {
  proposalId: string
  partId: string
  status: 'pending' | 'applied' | 'rejected' | 'conflict' | 'stale' | 'needs-placement'
  content: string | null
  rev: number | null
}

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
  status: ChatProposalResult['status']
  reason: string | null
}

export interface ProposalQueueItem {
  id: string
  chapterId: string
  origin: 'chat' | 'translate'
  policy: 'review' | 'auto'
  createdAt: number
  parts: ProposalPartView[]
}

export const chapterProposalRefSchema = v.strictObject({ workId: idSchema, chapterId })
export const proposalDenySchema = v.strictObject({ workId: idSchema, chapterId, partId: idSchema })
export const proposalAcceptAllSchema = v.strictObject({ workId: idSchema, chapterId, commandId: idSchema })
