import { CHANNELS, type Channel } from '../../shared/channels'
import {
  createWorkSchema,
  getWorkSchema,
  setCoverSchema,
  updateWorkSchema
} from '../../shared/library'
import { fail, type Result } from '../../shared/result'
import type { LibraryStore } from '../storage/library'
import { createHandler, type RawHandler } from './handler'

/** Channel → validated handler. Free of Electron imports so tests can call it directly. */
export function createLibraryHandlers(library: LibraryStore): Record<Channel, RawHandler<unknown>> {
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

/**
 * Refuses every call whose sender is not trusted before validation or storage run. Generic over the
 * event type so the rule can be tested without Electron.
 */
export function guardHandlers<E>(
  handlers: Record<Channel, RawHandler<unknown>>,
  isTrustedSender: (event: E) => boolean
): Record<Channel, (event: E, raw: unknown) => Result<unknown>> {
  const guarded = {} as Record<Channel, (event: E, raw: unknown) => Result<unknown>>
  for (const channel of Object.values(CHANNELS)) {
    guarded[channel] = (event, raw) =>
      isTrustedSender(event)
        ? handlers[channel](raw)
        : fail('untrusted_sender', 'Nguồn gửi yêu cầu không được tin cậy.')
  }
  return guarded
}
