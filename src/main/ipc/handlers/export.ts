import { CHANNELS, EVENT_CHANNELS } from '../../../shared/contracts/channels'
import {
  exportCancelSchema,
  exportChapterSchema,
  exportRevealSchema,
  exportWorkSchema,
  type ExportChapterInput,
  type ExportWorkInput
} from '../../../shared/contracts/export'
import { StorageError } from '../../infra/storage/errors'
import { createAsyncHandler, createHandler } from '../handler'
import { exportServiceOf, type AreaHandlers, type HandlerDeps } from './deps'

export function exportHandlers(deps: HandlerDeps): AreaHandlers<'export'> {
  return {
    [CHANNELS.exportChapter]: createAsyncHandler(
      exportChapterSchema,
      async (input: ExportChapterInput) => {
        const service = exportServiceOf(deps)
        return await service.exportChapter(input)
      }
    ),
    // Progress goes back to the window that asked, so the handler needs the sink as well.
    [CHANNELS.exportWork]: (raw, sink) =>
      createAsyncHandler(exportWorkSchema, async (input: ExportWorkInput) => {
        const service = exportServiceOf(deps)
        return await service.exportWork(input, (progress) => {
          if (sink && !sink.isDestroyed()) sink.send(EVENT_CHANNELS.exportProgress, progress)
        })
      })(raw),
    [CHANNELS.exportCancel]: createHandler(exportCancelSchema, ({ workId }) => {
      exportServiceOf(deps).cancel(workId)
    }),
    [CHANNELS.exportReveal]: createHandler(exportRevealSchema, ({ path }) => {
      if (!exportServiceOf(deps).reveal(path)) {
        throw new StorageError(
          'not_found',
          'Không mở được thư mục: tệp này không do Mira vừa xuất.'
        )
      }
    })
  }
}
