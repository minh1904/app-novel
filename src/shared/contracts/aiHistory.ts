import * as v from 'valibot'
import { idSchema } from './library'
import type {
  ChatAction,
  ChatContextBlock,
  ChatLocation,
  ChatRange,
  ChatToolProposal,
  ChatToolStep,
  ChatUsage
} from './aiChat'

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
  /** Chế độ của lượt cũ, hoặc `chat` cho lượt không chế độ. */
  action: ChatAction
  question: string
  answer: string
  status: 'sending' | 'running' | 'done' | 'cancelled' | 'error' | 'interrupted'
  /** Khối đã gửi kèm; chỉ lượt cũ có. */
  context: ChatContextBlock[]
  /** Khoảng của lượt Sửa cũ; lượt mới luôn `null`. */
  range: ChatRange | null
  /** Vị trí người dùng lúc gửi; `null` ở lượt cũ. */
  location: ChatLocation | null
  tools: ChatToolStep[]
  droppedTurns: number
  provider: string | null
  model: string | null
  usage: ChatUsage | null
  costUsd: number | null
  finishReason: 'stop' | 'length' | 'tool_calls' | 'filter' | null
  createdAt: number
  updatedAt: number
  /** Đề xuất lượt đã tạo: từ tool ghi, hoặc từ khối rào của lượt Sửa cũ. Trạng thái đọc từ hàng chờ. */
  proposals: ChatToolProposal[]
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
