import { CHANNELS } from '../../../shared/contracts/channels'
import {
  exportChapterSchema,
  exportWorkSchema,
  type ExportChapterInput,
  type ExportWorkInput
} from '../../../shared/contracts/export'
import { createAsyncHandler } from '../handler'
import { exportServiceOf, type AreaHandlers, type HandlerDeps } from './deps'

export function exportHandlers(deps: HandlerDeps): AreaHandlers<'export'> {
  return {
    [CHANNELS.exportChapter]: createAsyncHandler(exportChapterSchema, async (input: ExportChapterInput) => {
      const service = exportServiceOf(deps)
      return await service.exportChapter(input)
    }),
    [CHANNELS.exportWork]: createAsyncHandler(exportWorkSchema, async (input: ExportWorkInput) => {
      const service = exportServiceOf(deps)
      return await service.exportWork(input)
    })
  }
}
