import * as v from 'valibot'

/** What the Settings switch shows: whether glass is on, and whether this Windows can draw it at all. */
export interface AppearanceState {
  glass: boolean
  glassSupported: boolean
}

export const setAppearanceInputSchema = v.object({
  glass: v.boolean('Giá trị hiệu ứng kính phải là bật hoặc tắt.')
})

export type SetAppearanceInput = v.InferOutput<typeof setAppearanceInputSchema>

/** The query parameter main adds to the page URL when the window opens with glass on. */
export const GLASS_QUERY_PARAM = 'glass'
