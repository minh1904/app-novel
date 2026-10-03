import { CHANNELS } from '../../../shared/channels'
import {
  createWorkSchema,
  getWorkSchema,
  setCoverSchema,
  updateWorkSchema
} from '../../../shared/library'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/** Tác phẩm và ảnh bìa. */
export function worksHandlers({ library }: HandlerDeps): AreaHandlers<'works'> {
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
    )
  }
}
