import * as v from 'valibot'
import { idSchema } from './library'
import type { ChatContextBlock, ChatMode, ChatRange, ChatUsage } from './aiChat'

export interface AiSessionView {
  id: string
  title: string
  lastChapterId: string | null
  createdAt: number
  updatedAt: number
}

export interface AiTurnView {
  id: string
  sessionId: string
  chapterId: string | null
  action: ChatMode
  question: string
  answer: string
  status: 'sending' | 'running' | 'done' | 'cancelled' | 'error' | 'interrupted'
  context: ChatContextBlock[]
  range: ChatRange | null
  tools: Array<{ name: string; detail: string }>
  droppedTurns: number
  provider: string | null
  model: string | null
  usage: ChatUsage | null
  costUsd: number | null
  finishReason: 'stop' | 'length' | 'tool_calls' | 'filter' | null
  createdAt: number
  updatedAt: number
  proposalId: string | null
  partId: string | null
  proposalStatus: 'pending' | 'applied' | 'rejected' | 'conflict' | 'stale' | 'needs-placement' | null
}

const pageSize = v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)))
export const aiSessionsListSchema = v.strictObject({
  workId: idSchema,
  limit: pageSize,
  beforeUpdatedAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  beforeId: v.optional(idSchema)
})

export const aiTurnsListSchema = v.strictObject({
  workId: idSchema,
  sessionId: idSchema,
  limit: pageSize,
  beforeCreatedAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  beforeId: v.optional(idSchema)
})
