import type { SecretCrypto } from '../infra/storage/secretStore'
import { SecretStore } from '../infra/storage/secretStore'
import { ChapterTranslator } from './ai/chapterTranslation'
import { ParagraphTranslator } from './ai/paragraphTranslation'
import { ChatService } from './ai/chatService'
import { ConnectionService } from './ai/connectionService'
import { GlossaryService } from './context/glossaryService'
import type { LibraryStore } from './library/library'
import { createAiSession, getAiSession, interruptAiTurns, startAiTurn, updateAiTurn } from '../infra/storage/aiSessions'
import { extractFence } from '../../shared/contracts/aiChat'
import { createChatProposalInDb } from './proposals/chatProposalService'

/** The AI services of the app, built over one library and one way of protecting keys. */
export interface Services {
  connections: ConnectionService
  translator: ChapterTranslator
  paragraphTranslator: ParagraphTranslator
  chat: ChatService
  glossary: GlossaryService
}

/**
 * Wires the services together. It takes the key-protection capability as an argument instead of
 * reaching for Electron's `safeStorage`, so this file needs nothing from Electron and the wiring can
 * be built and tested without a window. The Electron layer passes the real `SecretCrypto`.
 */
export function createServices({
  library,
  crypto,
  fetch: fetchImpl
}: {
  library: LibraryStore
  crypto: SecretCrypto
  /**
   * How requests reach the provider. The Electron layer passes `net.fetch` so they follow the system proxy;
   * left out, the global `fetch` is used, which is what tests and any non-Electron caller want.
   */
  fetch?: typeof fetch
}): Services {
  const connections = new ConnectionService({
    db: library.appDb,
    secrets: new SecretStore(crypto),
    now: () => library.appNow(),
    newId: () => library.newAppId(),
    fetchImpl
  })
  const translator = new ChapterTranslator({
    library,
    connections,
    now: () => library.appNow()
  })
  const paragraphTranslator = new ParagraphTranslator({
    library, connections, now: () => library.appNow()
  })
  for (const work of library.list().works) {
    library.withWork(work.id, (db) => db.transaction(() => interruptAiTurns(db, library.appNow())))
  }
  const chat = new ChatService({
    connections,
    records: {
      start: (requestId, input, provider, model) => library.withWork(input.workId, (db) =>
        db.transaction(() => {
          const sessionId = input.sessionId ?? library.newAppId()
          if (input.sessionId) getAiSession(db, sessionId)
          else createAiSession(db, sessionId, input.question.slice(0, 80), library.appNow())
          startAiTurn(db, {
            id: requestId, sessionId, chapterId: input.chapterId, action: input.mode,
            question: input.question, context: input.context,
            range: input.range,
            droppedTurns: input.droppedTurns ?? 0, provider, model,
            now: library.appNow()
          })
          return sessionId
        })
      ),
      update: (requestId, workId, patch) => library.withWork(workId, (db) => {
        updateAiTurn(db, requestId, patch, library.appNow())
      }),
      complete: (requestId, input, answer, tools, usage, costUsd, finishReason) =>
        library.withWork(input.workId, (db) => db.transaction(() => {
          const now = library.appNow()
          updateAiTurn(db, requestId, {
            answer, status: 'done', tools, usage, costUsd, finishReason
          }, now)
          const base = input.proposalBase
          const replacement = finishReason === 'stop' && input.mode !== 'hoi'
            ? extractFence(answer) : null
          if (!base || !input.range || replacement === null || input.mode === 'hoi') return null
          return createChatProposalInDb(db, {
            workId: input.workId, chapterId: input.chapterId,
            commandId: requestId, turnId: requestId, action: input.mode,
            blockAutoApply: base.blockAutoApply,
            sourceRev: base.sourceRev, sourceContent: base.sourceContent,
            targetBaseRev: base.targetRev, targetBaseContent: base.targetContent,
            range: { from: input.range.from, to: input.range.to, text: input.range.text },
            replacement
          }, now, () => library.newAppId())
        }))
    },
    // The same store the rest of the app reads through, handed over **read-only by construction**:
    // `ChatToolLibrary` names only `listChapters` and `readText`, so no tool can reach a writer.
    library,
    newId: () => library.newAppId(),
    now: () => library.appNow()
  })
  const glossary = new GlossaryService(library, () => library.appNow())
  return { connections, translator, paragraphTranslator, chat, glossary }
}
