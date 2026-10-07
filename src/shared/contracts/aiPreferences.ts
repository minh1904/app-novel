import * as v from 'valibot'
import { idSchema } from './library'
import { THINKING_LEVELS } from './modelSettings'

/**
 * The app-wide model choices of Settings › Model (change `hermes-settings-modal`, spec `model-defaults`):
 * the main model, and the ordered fallbacks tried when it cannot answer.
 */

export const MAX_FALLBACKS = 8

export const modelRefSchema = v.strictObject({
  connectionId: idSchema,
  entryId: idSchema
})
export type ModelRef = v.InferOutput<typeof modelRefSchema>

export const mainModelSchema = v.strictObject({
  connectionId: idSchema,
  entryId: idSchema,
  /** The thinking level picked together with the main model; absent = the entry's own setting. */
  thinking: v.optional(v.picklist(THINKING_LEVELS))
})
export type MainModel = v.InferOutput<typeof mainModelSchema>

export const setMainModelSchema = v.strictObject({ main: v.nullable(mainModelSchema) })

export const setFallbacksSchema = v.strictObject({
  fallbacks: v.pipe(
    v.array(modelRefSchema, 'Danh sách dự phòng không hợp lệ.'),
    v.maxLength(MAX_FALLBACKS, 'Tối đa ' + MAX_FALLBACKS + ' model dự phòng.')
  )
})

export interface AiPreferences {
  main: MainModel | null
  fallbacks: ModelRef[]
  /** Onboarding was dismissed with "Để sau". */
  onboardingSkipped: boolean
}

export const setOnboardingSkippedSchema = v.strictObject({ skipped: v.boolean() })
