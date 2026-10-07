import type { RefusalGroup } from '../../../shared/contracts/aiTranslate'

/**
 * Why a provider's safety filter stopped an answer, in four groups Mira acts on, plus the provider's own word.
 *
 * The groups decide what Mira may do next (`content-refusals.md`, mục 5): `prohibited` is never routed
 * anywhere else; `recitation` is a quotation filter, not a content problem. `BLOCKLIST` and `SPII` stay in
 * `other`: a blocklist and personal data are not the content group the product rules forbid moving. The raw
 * string is always kept, so the table can change later without losing what the provider said.
 */

export type FilterGroup = RefusalGroup

export interface FilterReason {
  group: FilterGroup
  /** The provider's reason as written, e.g. `PROHIBITED_CONTENT`; empty when it gave none. */
  raw: string
}

const GROUPS: Record<string, FilterGroup> = {
  PROHIBITED_CONTENT: 'prohibited',
  SAFETY: 'safety',
  RECITATION: 'recitation'
}

/** A reason word as the provider wrote it, into its group. Unknown or empty is `other`. */
export function groupFilterReason(raw: string): FilterReason {
  const word = raw.trim().toUpperCase()
  return { group: GROUPS[word] ?? 'other', raw: word }
}

/**
 * The reason inside an OpenAI-compatible `finish_reason`. Gemini writes `content_filter: PROHIBITED_CONTENT`;
 * OpenAI writes a bare `content_filter`, which is `other` with no raw word. `undefined` when the answer did
 * not end on a filter at all.
 */
export function readFilterReason(finishReason: unknown): FilterReason | undefined {
  if (typeof finishReason !== 'string' || !finishReason.startsWith('content_filter'))
    return undefined
  const colon = finishReason.indexOf(':')
  return groupFilterReason(colon < 0 ? '' : finishReason.slice(colon + 1))
}

/**
 * Evidence, in an error body, that the content itself was blocked by a safety filter: a `blockReason`, or a
 * safety reason or harm category written in the provider's own upper-case words. A closed list on purpose —
 * a body it does not recognise stays a request error, because calling a work "blocked content" on a guess is
 * the worse mistake (D2 of change `provider-error-reasons`). Lower-case words do not count: Mira's own
 * rejected `safety_settings` parameter comes back as "Unknown name "safety_settings"", which is a request
 * error.
 */
export function findBlockEvidence(body: string): FilterReason | undefined {
  const blockReason = /"?blockReason"?\s*[:=]\s*"?([A-Z_]+)/.exec(body)
  if (blockReason) return groupFilterReason(blockReason[1])
  if (/\bPROHIBITED_CONTENT\b/.test(body)) return groupFilterReason('PROHIBITED_CONTENT')
  if (/\bSAFETY\b/.test(body) || /\bHARM_CATEGORY_[A-Z_]+/.test(body)) {
    return groupFilterReason('SAFETY')
  }
  return undefined
}
