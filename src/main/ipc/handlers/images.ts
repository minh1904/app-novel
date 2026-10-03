import { CHANNELS } from '../../../shared/channels'
import { deleteImageSchema, getImageSchema, putImageSchema } from '../../../shared/images'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/** Ảnh dán hoặc thả vào bản dịch, lưu trong tệp của tác phẩm. */
export function imagesHandlers({ library }: HandlerDeps): AreaHandlers<'images'> {
  return {
    [CHANNELS.imagesPut]: createHandler(putImageSchema, ({ workId, data }) =>
      library.putImage(workId, data)
    ),
    [CHANNELS.imagesGet]: createHandler(getImageSchema, ({ workId, imageId }) =>
      library.getImage(workId, imageId)
    ),
    [CHANNELS.imagesDelete]: createHandler(deleteImageSchema, ({ workId, imageId }) =>
      library.deleteImage(workId, imageId)
    )
  }
}
