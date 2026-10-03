import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import { fail, type Result } from '../../shared/contracts/result'
import type { ChapterTranslator } from '../services/ai/chapterTranslation'
import type { ChatService } from '../services/ai/chatService'
import type { ConnectionService } from '../services/ai/connectionService'
import type { LibraryStore } from '../services/library/library'
import { noChunkSink, type ChunkSink, type RawHandler } from './handler'
import { noFilePicker, type FilePicker } from './filePicker'
import { aiHandlers } from './handlers/ai'
import { backupHandlers } from './handlers/backup'
import { chaptersHandlers } from './handlers/chapters'
import { chatHandlers } from './handlers/chat'
import type { HandlerDeps } from './handlers/deps'
import { imagesHandlers } from './handlers/images'
import { rowsHandlers } from './handlers/rows'
import { textHandlers } from './handlers/text'
import { worksHandlers } from './handlers/works'

/**
 * Channel → validated handler. Free of Electron imports so tests can call it directly.
 *
 * Each area of channels lives in its own file under `handlers/`. The return type is the record of
 * **every** `Channel`, so a channel that no area handles is still a compile error here.
 */
export function createLibraryHandlers(
  library: LibraryStore,
  files: FilePicker = noFilePicker,
  connections?: ConnectionService,
  translator?: ChapterTranslator,
  chat?: ChatService
): Record<Channel, RawHandler<unknown>> {
  const deps: HandlerDeps = { library, files, connections, translator, chat }
  return {
    ...worksHandlers(deps),
    ...chaptersHandlers(deps),
    ...textHandlers(deps),
    ...rowsHandlers(deps),
    ...imagesHandlers(deps),
    ...backupHandlers(deps),
    ...aiHandlers(deps),
    ...chatHandlers(deps)
  }
}

/**
 * Refuses every call whose sender is not trusted before validation or storage run. Generic over the
 * event type so the rule can be tested without Electron.
 */
export function guardHandlers<E>(
  handlers: Record<Channel, RawHandler<unknown>>,
  isTrustedSender: (event: E) => boolean,
  /** Cửa sổ của lời gọi, cho kênh đẩy sự kiện về. Thiếu thì không kênh nào đẩy được gì. */
  sinkOf: (event: E) => ChunkSink = () => noChunkSink
): Record<Channel, (event: E, raw: unknown) => Result<unknown> | Promise<Result<unknown>>> {
  const guarded = {} as Record<
    Channel,
    (event: E, raw: unknown) => Result<unknown> | Promise<Result<unknown>>
  >
  for (const channel of Object.values(CHANNELS)) {
    guarded[channel] = (event, raw) =>
      isTrustedSender(event)
        ? handlers[channel](raw, sinkOf(event))
        : fail('untrusted_sender', 'Nguồn gửi yêu cầu không được tin cậy.')
  }
  return guarded
}
