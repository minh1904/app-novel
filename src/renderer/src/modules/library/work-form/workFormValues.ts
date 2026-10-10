import type { SourceLanguage, WorkPatch } from '../../../../../shared/contracts/library'

export interface WorkFormValues {
  title: string
  sourceLang: SourceLanguage
  originalTitle: string
  author: string
  genre: string
  description: string
  /** The cover as a JPEG data URL, or null for none. */
  cover: string | null
}

export const emptyWorkForm: WorkFormValues = {
  title: '',
  sourceLang: 'zh-Hans',
  originalTitle: '',
  author: '',
  genre: '',
  description: '',
  cover: null
}

/** Only what changed is sent; a blanked optional field is sent as `null` so it is cleared. */
export function buildPatch(before: WorkFormValues, after: WorkFormValues): WorkPatch {
  const patch: WorkPatch = {}
  if (after.title !== before.title) patch.title = after.title
  const optional = ['originalTitle', 'author', 'genre', 'description'] as const
  for (const key of optional) {
    if (after[key] === before[key]) continue
    patch[key] = after[key].trim() === '' ? null : after[key]
  }
  if (after.cover !== before.cover) patch.cover = after.cover
  return patch
}
