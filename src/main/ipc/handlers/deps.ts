import type { Channel } from '../../../shared/contracts/channels'
import { StorageError } from '../../infra/storage/errors'
import type { ChapterTranslator } from '../../services/ai/chapterTranslation'
import type { ParagraphTranslator } from '../../services/ai/paragraphTranslation'
import type { ChatService } from '../../services/ai/chatService'
import type { ConnectionService } from '../../services/ai/connectionService'
import { GlossaryService } from '../../services/context/glossaryService'
import { AddressingService } from '../../services/context/addressingService'
import type { ExportService } from '../../services/export/exportService'
import type { LibraryStore } from '../../services/library/library'
import type { SourceServices } from '../../sources/sourceServices'
import type { RawHandler } from '../handler'
import type { FilePicker } from '../filePicker'
import type { AgentService } from '../../services/agent/agentService'

/** What every area of handlers is built from. The AI services are optional: see `connectionsOf`. */
export interface HandlerDeps {
  library: LibraryStore
  files: FilePicker
  connections?: ConnectionService
  translator?: ChapterTranslator
  paragraphTranslator?: ParagraphTranslator
  chat?: ChatService
  glossary?: GlossaryService
  addressing?: AddressingService
  exportService?: ExportService
  sources?: SourceServices
  agent?: AgentService
}

/**
 * The handlers of every channel whose name starts with one of the prefixes, and of no other.
 *
 * Each area file returns this for its own prefixes, so adding a channel such as `works:foo` without
 * a handler is a compile error in `works.ts`, and a handler for a channel the area does not own is
 * an excess-property error. `createLibraryHandlers` then has to cover every `Channel` in total.
 */
export type AreaHandlers<Prefix extends string> = Record<
  Extract<Channel, `${Prefix}:${string}`>,
  RawHandler<unknown>
>

/** Kênh kết nối AI chỉ dùng được khi kho khóa mở được; nếu không thì nói rõ thay vì im lặng. */
function unavailable(): never {
  throw new StorageError('io', 'Chưa mở được kho cài đặt kết nối AI.')
}

export function connectionsOf(deps: HandlerDeps): ConnectionService {
  return deps.connections ?? unavailable()
}

export function translatorOf(deps: HandlerDeps): ChapterTranslator {
  return deps.translator ?? unavailable()
}

export function paragraphTranslatorOf(deps: HandlerDeps): ParagraphTranslator {
  return deps.paragraphTranslator ?? unavailable()
}

export function chatOf(deps: HandlerDeps): ChatService {
  return deps.chat ?? unavailable()
}

export function glossaryOf(deps: HandlerDeps): GlossaryService {
  return deps.glossary ?? new GlossaryService(deps.library)
}

export function addressingOf(deps: HandlerDeps): AddressingService {
  return deps.addressing ?? new AddressingService(deps.library)
}

export function exportServiceOf(deps: HandlerDeps): ExportService {
  return deps.exportService ?? unavailable()
}

export function sourcesOf(deps: HandlerDeps): SourceServices {
  return deps.sources ?? unavailable()
}

export function agentOf(deps: HandlerDeps): AgentService {
  return deps.agent ?? unavailable()
}
