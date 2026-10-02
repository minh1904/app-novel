import { CHANNELS, type Channel } from '../../shared/channels'
import {
  chapterRefSchema,
  createChapterSchema,
  listChaptersSchema,
  moveChapterSchema,
  renameChapterSchema
} from '../../shared/chapters'
import {
  createWorkSchema,
  getWorkSchema,
  setCoverSchema,
  updateWorkSchema
} from '../../shared/library'
import { deleteImageSchema, getImageSchema, putImageSchema } from '../../shared/images'
import { chapterLinksSchema, rowRefSchema, saveRowSchema } from '../../shared/rows'
import { fail, type Result } from '../../shared/result'
import { saveTextSchema, textRefSchema } from '../../shared/text'
import type { LibraryStore } from '../storage/library'
import { backupExportSchema } from '../../shared/backup'
import { backupFileName } from '../storage/backupName'
import { StorageError } from '../storage/errors'
import {
  addConnectionKeySchema,
  connectionRefSchema,
  createConnectionSchema,
  removeConnectionKeySchema,
  setConnectionModelsSchema,
  updateConnectionSchema
} from '../../shared/aiConnections'
import { translateBatchSchema, translatePlanSchema } from '../../shared/aiTranslate'
import type { ConnectionService } from '../providers/connectionService'
import type { ChapterTranslator } from '../providers/chapterTranslation'
import { createAsyncHandler, createHandler, type RawHandler } from './handler'
import { noFilePicker, type FilePicker } from './filePicker'

/** Channel → validated handler. Free of Electron imports so tests can call it directly. */
export function createLibraryHandlers(
  library: LibraryStore,
  files: FilePicker = noFilePicker,
  connections?: ConnectionService,
  translator?: ChapterTranslator
): Record<Channel, RawHandler<unknown>> {
  /** Kênh kết nối AI chỉ dùng được khi kho khóa mở được; nếu không thì nói rõ thay vì im lặng. */
  const ai = (): ConnectionService => {
    if (!connections) {
      throw new StorageError('io', 'Chưa mở được kho cài đặt kết nối AI.')
    }
    return connections
  }
  const translate = (): ChapterTranslator => {
    if (!translator) {
      throw new StorageError('io', 'Chưa mở được kho cài đặt kết nối AI.')
    }
    return translator
  }
  return {
    [CHANNELS.worksList]: createHandler(null, () => library.list()),
    [CHANNELS.worksGet]: createHandler(getWorkSchema, ({ id }) => library.get(id)),
    [CHANNELS.worksCreate]: createHandler(createWorkSchema, (input) => library.create(input)),
    [CHANNELS.worksUpdate]: createHandler(updateWorkSchema, ({ id, patch }) =>
      library.update(id, patch)
    ),
    [CHANNELS.worksCoverGet]: createHandler(getWorkSchema, ({ id }) => library.getCover(id)),
    [CHANNELS.worksCoverSet]: createHandler(setCoverSchema, ({ id, cover }) =>
      library.setCover(id, cover)
    ),
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
    })),
    [CHANNELS.backupExport]: createAsyncHandler(backupExportSchema, async ({ workId }) => {
      const work = library.get(workId)
      const chosen = await files.chooseSavePath(backupFileName(work.title, new Date()))
      if (chosen === null) throw new StorageError('cancelled', 'Đã hủy.')
      const path = /\.mira$/i.test(chosen) ? chosen : chosen + '.mira'
      library.exportWork(workId, path)
      return { path }
    }),
    [CHANNELS.backupRestore]: createAsyncHandler(null, async () => {
      const chosen = await files.chooseOpenPath()
      if (chosen === null) throw new StorageError('cancelled', 'Đã hủy.')
      return library.restoreWork(chosen)
    }),
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
    ),
    [CHANNELS.textGet]: createHandler(textRefSchema, ({ workId, chapterId, side }) =>
      library.readText(workId, chapterId, side)
    ),
    [CHANNELS.textSave]: createHandler(
      saveTextSchema,
      ({ workId, chapterId, side, content, expectedRev, segments }) =>
        library.saveText(workId, chapterId, side, content, expectedRev, segments)
    ),
    [CHANNELS.imagesPut]: createHandler(putImageSchema, ({ workId, data }) =>
      library.putImage(workId, data)
    ),
    [CHANNELS.imagesGet]: createHandler(getImageSchema, ({ workId, imageId }) =>
      library.getImage(workId, imageId)
    ),
    [CHANNELS.imagesDelete]: createHandler(deleteImageSchema, ({ workId, imageId }) =>
      library.deleteImage(workId, imageId)
    ),
    [CHANNELS.aiConnectionsList]: createHandler(null, () => ai().list()),
    [CHANNELS.aiConnectionsCreate]: createHandler(createConnectionSchema, (input) =>
      ai().create(input)
    ),
    [CHANNELS.aiConnectionsUpdate]: createHandler(updateConnectionSchema, (input) =>
      ai().update(input)
    ),
    [CHANNELS.aiConnectionsDelete]: createHandler(connectionRefSchema, ({ id }) => ai().delete(id)),
    [CHANNELS.aiConnectionsTest]: createAsyncHandler(connectionRefSchema, ({ id }) =>
      ai().test(id)
    ),
    [CHANNELS.aiKeysAdd]: createAsyncHandler(addConnectionKeySchema, ({ id, secret }) =>
      ai().addApiKey(id, secret)
    ),
    [CHANNELS.aiKeysRemove]: createHandler(removeConnectionKeySchema, ({ id, keyId }) =>
      ai().removeApiKey(id, keyId)
    ),
    [CHANNELS.aiModelsSet]: createHandler(setConnectionModelsSchema, ({ id, models }) =>
      ai().setModels(id, models)
    ),
    [CHANNELS.aiTranslatePlan]: createHandler(translatePlanSchema, (input) =>
      translate().plan(input)
    ),
    [CHANNELS.aiTranslateBatch]: createAsyncHandler(translateBatchSchema, (input) =>
      translate().runBatch(input)
    )
  }
}

/**
 * Refuses every call whose sender is not trusted before validation or storage run. Generic over the
 * event type so the rule can be tested without Electron.
 */
export function guardHandlers<E>(
  handlers: Record<Channel, RawHandler<unknown>>,
  isTrustedSender: (event: E) => boolean
): Record<Channel, (event: E, raw: unknown) => Result<unknown> | Promise<Result<unknown>>> {
  const guarded = {} as Record<
    Channel,
    (event: E, raw: unknown) => Result<unknown> | Promise<Result<unknown>>
  >
  for (const channel of Object.values(CHANNELS)) {
    guarded[channel] = (event, raw) =>
      isTrustedSender(event)
        ? handlers[channel](raw)
        : fail('untrusted_sender', 'Nguồn gửi yêu cầu không được tin cậy.')
  }
  return guarded
}
