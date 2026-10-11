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
import { createKakuyomuAdapter, kakuyomuManifest, KAKUYOMU_SOURCE_ID } from './kakuyomu/adapter'
import { NetworkBroker, type NetworkBrokerPolicy } from './broker'
import type { NovelSourceAdapter } from './domain'
import { AdapterRuntime } from './runtime'

export interface SourceServices {
  bindings: SourceBindingService
  catalog: SourceCatalogService
  sync: SourceSyncService
  content: SourceContentService
  auth: AuthProfileService
  registry: SourceRegistry
  preview: (input: { sourceId: string; remoteWorkId: string; languageTag?: string }) => Promise<{
    title: string
    languageTag: string
    items: import('./domain').CatalogItem[]
  }>
  getChapter: (input: {
    sourceId: string
    remoteWorkId: string
    remoteChapterId: string
    languageTag?: string
  }) => Promise<import('./domain').ChapterPage>
}

export interface SourceServicesOptions {
  allowUnreleased?: boolean
  resolveBroker?: (policy: NetworkBrokerPolicy) => NetworkBroker
}

export function createSourceServices(
  _library: LibraryStore,
  crypto: SecretCrypto,
  options: SourceServicesOptions = {}
): SourceServices {
  const bindings = new SourceBindingService()
  const catalog = new SourceCatalogService()
  const content = new SourceContentService()
  const auth = new AuthProfileService(crypto)
  let kakuyomuAdapter: NovelSourceAdapter | null = null

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
    if (adapterId === KAKUYOMU_SOURCE_ID) {
      if (kakuyomuAdapter) return kakuyomuAdapter
      const networkPolicy = kakuyomuManifest.networkPolicy!
      const broker =
        options.resolveBroker?.({
          allowedOrigins: networkPolicy.origins,
          allowNetwork: kakuyomuManifest.releaseGate === 'open' || options.allowUnreleased === true,
          minIntervalMs: networkPolicy.minIntervalMs,
          maxRedirects: networkPolicy.maxRedirects,
          maxResponseBytes: networkPolicy.maxResponseBytes,
          requestTimeoutMs: networkPolicy.requestTimeoutMs
        }) ??
        new NetworkBroker({
          allowedOrigins: networkPolicy.origins,
          allowNetwork: kakuyomuManifest.releaseGate === 'open' || options.allowUnreleased === true,
          minIntervalMs: networkPolicy.minIntervalMs,
          maxRedirects: networkPolicy.maxRedirects,
          maxResponseBytes: networkPolicy.maxResponseBytes,
          requestTimeoutMs: networkPolicy.requestTimeoutMs
        })
      kakuyomuAdapter = createKakuyomuAdapter(broker)
      return kakuyomuAdapter
    }
    throw new Error(`Adapter ${adapterId} is not installed or supported`)
  }

  const sync = new SourceSyncService(resolveAdapter)

  // Builtin registry
  const registry = new SourceRegistry(
    [
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
      },
      kakuyomuManifest
    ],
    { allowUnreleased: options.allowUnreleased }
  )

  const preview = async (input: {
    sourceId: string
    remoteWorkId: string
    languageTag?: string
  }) => {
    const manifest = registry.get(input.sourceId)
    if (!manifest || !manifest.capabilities.includes('catalog')) {
      throw new Error('Nguồn này chưa được bật')
    }
    const adapter = await resolveAdapter(
      input.sourceId,
      input.remoteWorkId,
      input.languageTag ?? 'ja'
    )
    if (!adapter.getWork) throw new Error('Nguồn không hỗ trợ xem thông tin tác phẩm')
    const work = await adapter.getWork(
      { remoteWorkId: input.remoteWorkId },
      { signal: new AbortController().signal, now: () => new Date() }
    )
    const catalog = await new AdapterRuntime(adapter).getCatalog({
      remoteWorkId: input.remoteWorkId
    })
    if (!catalog.complete || !catalog.exhausted) {
      throw new Error('Nguồn trả về danh mục chưa đầy đủ; Mira không thể tạo bản raw an toàn')
    }
    return { title: work.title, languageTag: work.languageTag, items: catalog.items }
  }

  const getChapter = async (input: {
    sourceId: string
    remoteWorkId: string
    remoteChapterId: string
    languageTag?: string
  }) => {
    const adapter = await resolveAdapter(
      input.sourceId,
      input.remoteWorkId,
      input.languageTag ?? 'ja'
    )
    return new AdapterRuntime(adapter).getChapter(input)
  }

  return {
    bindings,
    catalog,
    sync,
    content,
    auth,
    registry,
    preview,
    getChapter
  }
}
