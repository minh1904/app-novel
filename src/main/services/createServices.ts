import type { SecretCrypto } from '../infra/storage/secretStore'
import { SecretStore } from '../infra/storage/secretStore'
import { ChapterTranslator } from './ai/chapterTranslation'
import { ChatService } from './ai/chatService'
import { ConnectionService } from './ai/connectionService'
import type { LibraryStore } from './library/library'

/** The AI services of the app, built over one library and one way of protecting keys. */
export interface Services {
  connections: ConnectionService
  translator: ChapterTranslator
  chat: ChatService
}

/**
 * Wires the services together. It takes the key-protection capability as an argument instead of
 * reaching for Electron's `safeStorage`, so this file needs nothing from Electron and the wiring can
 * be built and tested without a window. The Electron layer passes the real `SecretCrypto`.
 */
export function createServices({
  library,
  crypto
}: {
  library: LibraryStore
  crypto: SecretCrypto
}): Services {
  const connections = new ConnectionService({
    db: library.appDb,
    secrets: new SecretStore(crypto),
    now: () => library.appNow(),
    newId: () => library.newAppId()
  })
  const translator = new ChapterTranslator({
    library,
    connections,
    now: () => library.appNow()
  })
  const chat = new ChatService({
    connections,
    // The same store the rest of the app reads through, handed over **read-only by construction**:
    // `ChatToolLibrary` names only `listChapters` and `readText`, so no tool can reach a writer.
    library,
    newId: () => library.newAppId(),
    now: () => library.appNow()
  })
  return { connections, translator, chat }
}
