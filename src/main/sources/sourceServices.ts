import type { SecretCrypto } from '../infra/storage/secretStore'
import type { LibraryStore } from '../services/library/library'
import { AuthProfileService } from './authProfileService'
import { SourceBindingService } from './bindingService'
import { SourceCatalogService } from './catalogService'
import { SourceContentService } from './contentService'
import { SourceSyncService } from './syncService'
import { SourceRegistry } from './registry'
import { createSingleFileAdapter } from './singleFileAdapter'
import { createFolderAdapter } from './folderAdapter'
import type { NovelSourceAdapter } from './domain'

export interface SourceServices {
  bindings: SourceBindingService
  catalog: SourceCatalogService
  sync: SourceSyncService
  content: SourceContentService
  auth: AuthProfileService
  registry: SourceRegistry
}

export function createSourceServices(_library: LibraryStore, crypto: SecretCrypto): SourceServices {
  const bindings = new SourceBindingService()
  const catalog = new SourceCatalogService()
  const content = new SourceContentService()
  const auth = new AuthProfileService(crypto)

  const resolveAdapter = async (
    adapterId: string,
    remoteWorkId: string,
    languageTag: string
  ): Promise<NovelSourceAdapter> => {
    if (adapterId === 'mira.single-file' || adapterId === 'builtin.single-file') {
      const filePath = remoteWorkId.replace(/^file:/, '')
      return await createSingleFileAdapter(filePath, languageTag)
    }
    if (adapterId === 'mira.folder' || adapterId === 'builtin.folder') {
      const folderPath = remoteWorkId.replace(/^folder:/, '')
      return await createFolderAdapter(folderPath, languageTag)
    }
    throw new Error(`Adapter ${adapterId} is not installed or supported`)
  }

  const sync = new SourceSyncService(resolveAdapter)

  // Builtin registry
  const registry = new SourceRegistry([
    {
      manifestVersion: 1,
      sourceId: 'mira.single-file',
      displayName: 'Tệp văn bản',
      nativeNames: [],
      aliases: ['file', 'txt', 'md'],
      domains: [],
      countryCode: 'ZZ',
      languageTags: ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'],
      capabilities: ['identify', 'work', 'catalog', 'chapter'],
      adapterVersion: '1.0.0',
      apiVersion: '1.0.0',
      dataVersion: 1,
      auth: 'none',
      origin: { kind: 'builtin' },
      limits: { maxPages: 1, pageSize: 1, timeoutMs: 10000 },
      health: 'healthy'
    },
    {
      manifestVersion: 1,
      sourceId: 'mira.folder',
      displayName: 'Thư mục tệp',
      nativeNames: [],
      aliases: ['folder', 'directory'],
      domains: [],
      countryCode: 'ZZ',
      languageTags: ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'],
      capabilities: ['identify', 'work', 'catalog', 'chapter'],
      adapterVersion: '1.0.0',
      apiVersion: '1.0.0',
      dataVersion: 1,
      auth: 'none',
      origin: { kind: 'builtin' },
      limits: { maxPages: 1, pageSize: 10000, timeoutMs: 30000 },
      health: 'healthy'
    }
  ])

  return {
    bindings,
    catalog,
    sync,
    content,
    auth,
    registry
  }
}
