import { randomUUID } from 'node:crypto'
import type { Db } from '../infra/storage/sqlite'
import {
  insertCatalogItem,
  insertSourceBinding,
  type StoredCatalogItem,
  type StoredSourceBinding
} from '../infra/storage/sourceStorage'
import type { CatalogItem } from './domain'

export interface ChapterSummaryForMatching {
  id: string
  number: number
  title: string
}

export interface MatchCandidate {
  remoteChapterId: string
  title: string
  order: number
  matchedChapterId: string | null
  confidence: 'high' | 'unmatched' | 'error'
  error?: string
}

export interface ImportMatchingPreview {
  previewId: string
  sourceId: string
  remoteWorkId: string
  totalCount: number
  matchedCount: number
  unmatchedCount: number
  errorCount: number
  items: MatchCandidate[]
}

/** Extract integer chapter number from titles like 'Chương 1', 'Chapter 02', '003 - Title', '第4章', '5.txt'. */
export function extractChapterNumber(title: string): number | null {
  const match = /(?:chương|chapter|ch|hồi|tập|đoạn|thứ|第)?\s*(\d+)/i.exec(title)
  if (match) {
    const num = Number.parseInt(match[1], 10)
    if (!Number.isNaN(num) && num > 0) return num
  }
  return null
}

export function generateMatchingPreview(input: {
  sourceId: string
  remoteWorkId: string
  catalogItems: Array<CatalogItem & { error?: string }>
  existingChapters: ChapterSummaryForMatching[]
}): ImportMatchingPreview {
  const chaptersByNumber = new Map<number, ChapterSummaryForMatching>()
  for (const ch of input.existingChapters) {
    chaptersByNumber.set(ch.number, ch)
  }

  const items: MatchCandidate[] = []
  let matchedCount = 0
  let unmatchedCount = 0
  let errorCount = 0

  const usedChapterIds = new Set<string>()

  for (const raw of input.catalogItems) {
    if (raw.error) {
      errorCount += 1
      items.push({
        remoteChapterId: raw.remoteChapterId,
        title: raw.title,
        order: raw.order,
        matchedChapterId: null,
        confidence: 'error',
        error: raw.error
      })
      continue
    }

    const num = extractChapterNumber(raw.title) ?? raw.order
    const chapter = chaptersByNumber.get(num)
    if (chapter && !usedChapterIds.has(chapter.id)) {
      usedChapterIds.add(chapter.id)
      matchedCount += 1
      items.push({
        remoteChapterId: raw.remoteChapterId,
        title: raw.title,
        order: raw.order,
        matchedChapterId: chapter.id,
        confidence: 'high'
      })
    } else {
      unmatchedCount += 1
      items.push({
        remoteChapterId: raw.remoteChapterId,
        title: raw.title,
        order: raw.order,
        matchedChapterId: null,
        confidence: 'unmatched'
      })
    }
  }

  return {
    previewId: randomUUID(),
    sourceId: input.sourceId,
    remoteWorkId: input.remoteWorkId,
    totalCount: input.catalogItems.length,
    matchedCount,
    unmatchedCount,
    errorCount,
    items
  }
}

export class MatchingPreviewService {
  private readonly previews = new Map<string, ImportMatchingPreview>()

  createPreview(input: {
    sourceId: string
    remoteWorkId: string
    catalogItems: Array<CatalogItem & { error?: string }>
    existingChapters: ChapterSummaryForMatching[]
  }): ImportMatchingPreview {
    const preview = generateMatchingPreview(input)
    this.previews.set(preview.previewId, preview)
    return preview
  }

  getPreview(previewId: string): ImportMatchingPreview | undefined {
    return this.previews.get(previewId)
  }

  confirm(
    db: Db,
    previewId: string,
    bindingMeta: {
      id: string
      adapterVersion: string
      languageTag: string
      label: string
      isPrimary?: boolean
      now: number
    }
  ): StoredSourceBinding {
    const preview = this.previews.get(previewId)
    if (!preview) throw new Error(`Preview not found: ${previewId}`)

    const binding: StoredSourceBinding = {
      id: bindingMeta.id,
      adapterId: preview.sourceId,
      adapterVersion: bindingMeta.adapterVersion,
      remoteWorkId: preview.remoteWorkId,
      canonicalUrl: null,
      countryCode: null,
      languageTag: bindingMeta.languageTag,
      label: bindingMeta.label,
      isPrimary: bindingMeta.isPrimary ?? false,
      enabled: true,
      authProfileId: null,
      schedulePolicyJson: '{}',
      catalogCursorJson: null,
      lastValidSyncAt: bindingMeta.now,
      lastAttemptAt: bindingMeta.now,
      nextCheckAt: null,
      consecutiveFailures: 0,
      createdAt: bindingMeta.now,
      updatedAt: bindingMeta.now
    }

    db.transaction(() => {
      insertSourceBinding(db, binding)
      for (const item of preview.items) {
        if (item.confidence === 'error') continue
        const catalogItem: StoredCatalogItem = {
          id: randomUUID(),
          bindingId: binding.id,
          remoteChapterId: item.remoteChapterId,
          remoteUrl: null,
          chapterId: item.matchedChapterId,
          ordinalKey: String(item.order).padStart(6, '0'),
          volumeTitle: null,
          title: item.title,
          kind: 'chapter',
          publishedAt: null,
          remoteUpdatedAt: null,
          revisionToken: null,
          accessState: 'public',
          firstSeenAt: bindingMeta.now,
          lastSeenAt: bindingMeta.now,
          missingStreak: 0,
          removedAt: null,
          metadataHash: 'init'
        }
        insertCatalogItem(db, catalogItem)
      }
    })

    this.previews.delete(previewId)
    return binding
  }
}
