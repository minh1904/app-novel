import { parse } from 'parse5'
import type {
  AdapterContext,
  CatalogPage,
  ChapterPage,
  NovelSourceAdapter,
  SourceManifest
} from '../domain'
import type { NetworkBroker } from '../broker'
import { identifyKakuyomu } from './identify'
import { parseKakuyomuWorkPage } from './parser'
import { parseKakuyomuEpisode } from './episodeParser'
import { attr, isElement, isText, walk, type ChildNode } from './traverse'

export const KAKUYOMU_SOURCE_ID = 'mira.jp.kakuyomu' as const
export const KAKUYOMU_ORIGIN = 'https://kakuyomu.jp' as const

export const kakuyomuManifest: SourceManifest = {
  manifestVersion: 1,
  sourceId: KAKUYOMU_SOURCE_ID,
  displayName: 'カクヨム (Kakuyomu)',
  nativeNames: ['カクヨム'],
  aliases: ['kakuyomu', 'kakuyomu.jp'],
  domains: ['kakuyomu.jp'],
  adapterVersion: '1.0.0',
  apiVersion: '1.0.0',
  dataVersion: 1,
  countryCode: 'JP',
  languageTags: ['ja'],
  capabilities: ['identify', 'work', 'catalog', 'chapter'],
  auth: 'none',
  origin: { kind: 'builtin' },
  limits: { maxPages: 10, pageSize: 100, timeoutMs: 15000 },
  health: 'unchecked',
  releaseGate: 'open',
  networkPolicy: {
    origins: [KAKUYOMU_ORIGIN],
    minIntervalMs: 1000,
    maxConcurrency: 1,
    maxRedirects: 5,
    maxAttempts: 1,
    maxResponseBytes: 8 * 1024 * 1024,
    requestTimeoutMs: 15_000,
    operationRequestBudget: 10
  }
}

export function extractNextDataJson(html: string): string | null {
  const doc = parse(html)
  const allNodes: ChildNode[] = (doc as unknown as { childNodes: ChildNode[] }).childNodes ?? []
  for (const node of walk(allNodes)) {
    if (isElement(node) && node.tagName === 'script') {
      if (attr(node, 'id') === '__NEXT_DATA__') {
        const textChild = node.childNodes.find(isText)
        if (textChild && isText(textChild)) {
          return textChild.value
        }
      }
    }
  }
  return null
}

export function createKakuyomuAdapter(broker: NetworkBroker): NovelSourceAdapter {
  return {
    manifest: kakuyomuManifest,

    async identify(input: { value: string }, _context: AdapterContext) {
      const result = identifyKakuyomu(input.value)
      if (!result) return null
      return { remoteWorkId: result.remoteWorkId }
    },

    async getWork(input: { remoteWorkId: string }, context: AdapterContext) {
      const url = `${KAKUYOMU_ORIGIN}/works/${input.remoteWorkId}`
      const response = await broker.request({ url, method: 'GET', signal: context.signal })
      const html = new TextDecoder('utf-8').decode(response.body)
      const nextDataJson = extractNextDataJson(html)
      if (!nextDataJson) {
        throw new Error('Không tìm thấy dữ liệu __NEXT_DATA__ trên trang tác phẩm Kakuyomu')
      }
      const parsed = parseKakuyomuWorkPage(nextDataJson, input.remoteWorkId)
      if (!parsed.complete && parsed.invalidReason) {
        throw new Error(`Lỗi phân tích tác phẩm Kakuyomu: ${parsed.invalidReason}`)
      }
      return {
        remoteWorkId: input.remoteWorkId,
        title: parsed.workMeta.title,
        languageTag: 'ja'
      }
    },

    async getCatalog(
      input: { remoteWorkId: string; cursor?: string },
      context: AdapterContext
    ): Promise<CatalogPage> {
      const url = `${KAKUYOMU_ORIGIN}/works/${input.remoteWorkId}`
      const response = await broker.request({ url, method: 'GET', signal: context.signal })
      const html = new TextDecoder('utf-8').decode(response.body)
      const nextDataJson = extractNextDataJson(html)
      if (!nextDataJson) {
        return {
          remoteWorkId: input.remoteWorkId,
          items: [],
          exhausted: true,
          complete: false
        }
      }
      const parsed = parseKakuyomuWorkPage(nextDataJson, input.remoteWorkId)
      return {
        remoteWorkId: input.remoteWorkId,
        items: parsed.items,
        exhausted: true,
        complete: parsed.complete
      }
    },

    async getChapter(
      input: { remoteWorkId: string; remoteChapterId: string },
      context: AdapterContext
    ): Promise<ChapterPage> {
      const url = `${KAKUYOMU_ORIGIN}/works/${input.remoteWorkId}/episodes/${input.remoteChapterId}`
      const response = await broker.request({ url, method: 'GET', signal: context.signal })
      const html = new TextDecoder('utf-8').decode(response.body)
      const parsed = parseKakuyomuEpisode(html)
      if (parsed.access === 'login_required') {
        throw new Error('Chương yêu cầu đăng nhập trên Kakuyomu')
      }
      if (parsed.access === 'parser_broken') {
        throw new Error('Không phân tích được nội dung chương Kakuyomu (parser_broken)')
      }
      return {
        remoteChapterId: input.remoteChapterId,
        text: parsed.text,
        contentHash: parsed.contentHash,
        payloadHash: parsed.contentHash,
        normalizationVersion: 1
      }
    }
  }
}
