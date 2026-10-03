import { CHANNELS } from '../../../shared/channels'
import { saveTextSchema, textRefSchema } from '../../../shared/text'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/** Văn bản của một bên (gốc hoặc dịch) trong một chương. */
export function textHandlers({ library }: HandlerDeps): AreaHandlers<'text'> {
  return {
    [CHANNELS.textGet]: createHandler(textRefSchema, ({ workId, chapterId, side }) =>
      library.readText(workId, chapterId, side)
    ),
    [CHANNELS.textSave]: createHandler(
      saveTextSchema,
      ({ workId, chapterId, side, content, expectedRev, segments }) =>
        library.saveText(workId, chapterId, side, content, expectedRev, segments)
    )
  }
}
