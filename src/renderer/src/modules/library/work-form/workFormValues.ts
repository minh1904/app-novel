import type { SourceLanguage, WorkPatch } from '../../../../../shared/contracts/library'

export interface WorkFormValues {
  title: string
  sourceLang: SourceLanguage
  originalTitle: string
  author: string
  genre: string
  description: string
  /** Ảnh bìa dưới dạng data URL JPEG, hoặc null nếu không có. */
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

/** Chỉ gửi các trường có thay đổi; trường tùy chọn bị xóa trắng sẽ gửi giá trị `null` để xóa trong cơ sở dữ liệu. */
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
