import { CHANNELS } from '../../../shared/channels'
import { chapterLinksSchema, rowRefSchema, saveRowSchema } from '../../../shared/rows'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/**
 * Hàng của mode Từng câu và các liên kết của chúng. Cả khu vực này bị xóa khi gỡ mode Từng câu, nên
 * nó nằm riêng một tệp. `links:list` thuộc về đây dù không mang tiền tố `rows:`.
 */
export function rowsHandlers({ library }: HandlerDeps): AreaHandlers<'rows' | 'links'> {
  return {
    [CHANNELS.linksList]: createHandler(chapterLinksSchema, ({ workId, chapterId }) => ({
      links: library.listLinks(workId, chapterId)
    })),
    [CHANNELS.rowSave]: createHandler(
      saveRowSchema,
      ({ workId, chapterId, sourceId, text, expectedRev }) =>
        library.saveRow(workId, { chapterId, sourceId, text, expectedRev })
    ),
    [CHANNELS.rowReview]: createHandler(rowRefSchema, ({ workId, chapterId, sourceId }) => ({
      links: library.reviewRow(workId, { chapterId, sourceId })
    })),
    [CHANNELS.rowsAutoPair]: createHandler(chapterLinksSchema, ({ workId, chapterId }) =>
      library.autoPairRows(workId, chapterId)
    )
  }
}
