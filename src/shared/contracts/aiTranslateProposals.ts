import * as v from 'valibot'
import { idSchema } from './library'
import { settingsKeySchema } from './modelSettings'
import type {
  SegmentRefusal,
  TranslateEstimate,
  TranslateFailure,
  TranslateUsage
} from './aiTranslate'

const chapterRef = { workId: idSchema, chapterId: idSchema }
const rev = v.pipe(v.number(), v.integer(), v.minValue(0))

export type TranslationPolicy = 'review' | 'auto'

export interface ParagraphTranslationPlan {
  runId: string
  sourceRev: number
  targetRev: number
  targetBaseContent: string
  connectionId: string
  connectionName: string
  entryId: string
  entryName: string
  model: string
  settingsKey: string
  catalogReadAt: string
  paragraphCount: number
  batches: Array<{ sourceIds: string[]; sourceChars: number }>
  hasTranslation: boolean
  estimate: TranslateEstimate
}

export const paragraphPlanSchema = v.strictObject({
  ...chapterRef, connectionId: idSchema, entryId: idSchema
})
export type ParagraphPlanInput = v.InferOutput<typeof paragraphPlanSchema>

export const paragraphBatchSchema = v.strictObject({
  ...chapterRef,
  runId: idSchema,
  connectionId: idSchema,
  entryId: idSchema,
  settingsKey: settingsKeySchema,
  sourceRev: rev,
  targetRev: rev,
  targetBaseContent: v.pipe(v.string(), v.maxLength(2_000_000)),
  policy: v.picklist(['review', 'auto']),
  sourceIds: v.pipe(v.array(idSchema), v.minLength(1), v.maxLength(2000))
})
export type ParagraphBatchInput = v.InferOutput<typeof paragraphBatchSchema>

export interface ParagraphBatchResult {
  proposalId: string | null
  proposed: string[]
  failed: string[]
  /** Những đoạn trong `failed` bị bộ lọc nội dung chặn, kèm lý do. */
  refusals: SegmentRefusal[]
  error: TranslateFailure | null
  usage: TranslateUsage | null
  keyTail: string | null
}

export const paragraphFinalizeSchema = v.strictObject({
  ...chapterRef, runId: idSchema, policy: v.picklist(['review', 'auto'])
})
export type ParagraphFinalizeInput = v.InferOutput<typeof paragraphFinalizeSchema>

export interface ParagraphFinalizeResult {
  proposed: number
  applied: number
  needsReview: number
  targetRev: number
  targetContent: string
}
