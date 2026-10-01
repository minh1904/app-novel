import type { SegmentText, TranslateRequest, TranslateResponse } from './types'

export interface Reconciled {
  /** One entry per requested segment that got a usable answer, in the order they were requested. */
  matched: SegmentText[]
  /** Requested ids with no usable answer (absent, or an empty text for a non-empty source). Retryable. */
  missing: string[]
  /** Answered ids that were never requested. Dropped. */
  extra: string[]
  /** Ids answered more than once. The first answer is used and the rest are dropped. */
  duplicates: string[]
}

/**
 * Pairs a provider's answer with the request by id. Shared by every provider, so the rule that a
 * translation only ever lands on the segment it was asked for lives in one place and is tested once.
 */
export function reconcile(request: TranslateRequest, response: TranslateResponse): Reconciled {
  const asked = new Map<string, string>()
  for (const segment of request.segments) {
    if (asked.has(segment.id)) throw new Error('Yêu cầu có segment ID bị trùng: ' + segment.id)
    asked.set(segment.id, segment.text)
  }

  const answers = new Map<string, string>()
  const extra: string[] = []
  const duplicates: string[] = []
  for (const item of response.items) {
    if (!asked.has(item.id)) {
      if (!extra.includes(item.id)) extra.push(item.id)
    } else if (answers.has(item.id)) {
      if (!duplicates.includes(item.id)) duplicates.push(item.id)
    } else {
      answers.set(item.id, item.text)
    }
  }

  const matched: SegmentText[] = []
  const missing: string[] = []
  for (const segment of request.segments) {
    const answer = answers.get(segment.id)
    const needsAnswer = segment.text.trim() !== ''
    // A blank source has nothing to translate, so a blank answer is fine for it.
    if (answer === undefined || (needsAnswer && answer.trim() === '')) missing.push(segment.id)
    else matched.push({ id: segment.id, text: answer })
  }
  return { matched, missing, extra, duplicates }
}
