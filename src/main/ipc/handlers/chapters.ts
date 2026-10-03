import { CHANNELS } from '../../../shared/channels'
import {
  chapterRefSchema,
  createChapterSchema,
  listChaptersSchema,
  moveChapterSchema,
  renameChapterSchema
} from '../../../shared/chapters'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/** Danh sách chương: thêm, đổi tên, chuyển chỗ, xóa, mở. */
export function chaptersHandlers({ library }: HandlerDeps): AreaHandlers<'chapters'> {
  return {
    [CHANNELS.chaptersList]: createHandler(listChaptersSchema, ({ workId }) => ({
      chapters: library.listChapters(workId)
    })),
    [CHANNELS.chaptersCreate]: createHandler(createChapterSchema, ({ workId, title }) =>
      library.createChapter(workId, title)
    ),
    [CHANNELS.chaptersRename]: createHandler(renameChapterSchema, ({ workId, chapterId, title }) =>
      library.renameChapter(workId, chapterId, title)
    ),
    [CHANNELS.chaptersMove]: createHandler(moveChapterSchema, ({ workId, chapterId, to }) =>
      library.moveChapter(workId, chapterId, to)
    ),
    [CHANNELS.chaptersDelete]: createHandler(chapterRefSchema, ({ workId, chapterId }) =>
      library.deleteChapter(workId, chapterId)
    ),
    [CHANNELS.chaptersOpen]: createHandler(chapterRefSchema, ({ workId, chapterId }) => ({
      work: library.openChapter(workId, chapterId)
    }))
  }
}
