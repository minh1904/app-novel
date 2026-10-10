export type SourceCapability =
  | 'identify'
  | 'metadata'
  | 'catalog'
  | 'chapter'
  | 'session'
  | 'browser'
  | 'work'
export type SourceHealth = 'healthy' | 'degraded' | 'broken' | 'inconclusive' | 'unchecked'
export type AccessState =
  | 'public'
  | 'login_required'
  | 'age_verification_required'
  | 'entitlement_required'
  | 'manual_intervention_required'
  | 'temporarily_unavailable'
  | 'parser_broken'

export interface SourceManifest {
  manifestVersion: 1
  sourceId: string
  displayName: string
  nativeNames: string[]
  aliases: string[]
  domains: string[]
  adapterVersion: string
  apiVersion: string
  dataVersion: number
  countryCode: string
  languageTags: string[]
  capabilities: SourceCapability[]
  auth: 'none' | 'optional' | 'required'
  origin: { kind: 'builtin' } | { kind: 'package'; packageName: string }
  limits: { maxPages: number; pageSize: number; timeoutMs: number }
  health?: SourceHealth
}

export interface CatalogItem {
  remoteChapterId: string
  title: string
  order: number
  url?: string
  access: AccessState
  contentHash?: string
  payloadHash?: string
  identityConfidence?: 'stable' | 'fallback'
}

export interface CatalogPage {
  items: CatalogItem[]
  nextCursor?: string
  exhausted: boolean
  complete: boolean
  remoteWorkId: string
}

export interface ChapterPage {
  remoteChapterId: string
  text: string
  contentHash: string
  payloadHash: string
  normalizationVersion: 1
}

export interface AdapterContext {
  signal: AbortSignal
  now: () => Date
}

export interface NovelSourceAdapter {
  manifest: SourceManifest
  identify?: (
    input: { value: string },
    context: AdapterContext
  ) => Promise<{ remoteWorkId: string } | null>
  getWork?: (
    input: { remoteWorkId: string },
    context: AdapterContext
  ) => Promise<{ remoteWorkId: string; title: string; languageTag: string }>
  getCatalog?: (
    input: { remoteWorkId: string; cursor?: string },
    context: AdapterContext
  ) => Promise<CatalogPage>
  getChapter?: (
    input: { remoteWorkId: string; remoteChapterId: string },
    context: AdapterContext
  ) => Promise<ChapterPage>
  checkSession?: (
    input: { remoteWorkId: string },
    context: AdapterContext
  ) => Promise<{ state: 'valid' | 'login_required' }>
}
