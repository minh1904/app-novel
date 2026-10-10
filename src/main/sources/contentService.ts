import { createHash } from 'node:crypto'
import type { Db } from '../infra/storage/sqlite'
import { StorageError } from '../infra/storage/errors'
import { readText, saveText } from '../infra/storage/textFile'
import {
  getCatalogItem,
  getContentRevision,
  getRevisionByHash,
  insertContentRevision,
  insertUpdateEvent,
  listUpdateEvents,
  markEventActed,
  type StoredContentRevision
} from '../infra/storage/sourceStorage'
import { contentIdentity, normalizeSourceText } from './normalization'

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export interface SaveRevisionInput {
  catalogItemId: string
  payload?: Uint8Array
  rawText?: string
  adapterVersion: string
  accessState?:
    | 'public'
    | 'login_required'
    | 'age_verification_required'
    | 'entitlement_required'
    | 'manual_intervention_required'
    | 'temporarily_unavailable'
    | 'parser_broken'
  remoteUpdatedAt?: number | null
  isComplete?: boolean
}

export interface RevisionApplyPreview {
  chapterId: string
  catalogItemId: string
  revisionId: string
  newContent: string
  currentContent: string
  expectedRev: number
  targetContent: string
  hasTarget: boolean
}

export interface ApplyRevisionArgs {
  chapterId: string
  revisionId: string
  expectedRev: number
}

export class SourceContentService {
  saveRevision(
    db: Db,
    input: SaveRevisionInput,
    now: number,
    newId: () => string
  ): StoredContentRevision {
    const catalogItem = getCatalogItem(db, input.catalogItemId)
    if (!catalogItem) {
      throw new StorageError('not_found', `Catalog item ${input.catalogItemId} not found`)
    }

    let normalizedText: string
    let contentHash: string
    let payloadHash: string

    if (input.payload) {
      const identity = contentIdentity(input.payload)
      normalizedText = identity.text
      contentHash = identity.contentHash
      payloadHash = identity.payloadHash
    } else if (input.rawText !== undefined) {
      normalizedText = normalizeSourceText(input.rawText)
      contentHash = sha256(normalizedText)
      payloadHash = sha256(input.rawText)
    } else {
      throw new StorageError('validation', 'Either payload or rawText must be provided')
    }

    const existing = getRevisionByHash(db, input.catalogItemId, contentHash)
    if (existing) {
      return existing
    }

    const revision: StoredContentRevision = {
      id: newId(),
      catalogItemId: input.catalogItemId,
      contentHash,
      payloadHash,
      normalizedText,
      normalizationVersion: 1,
      remoteUpdatedAt: input.remoteUpdatedAt ?? null,
      fetchedAt: now,
      adapterVersion: input.adapterVersion,
      accessState: input.accessState ?? 'public',
      isComplete: input.isComplete ?? true
    }

    insertContentRevision(db, revision)

    // Check if item is linked to an existing chapter
    if (catalogItem.chapterId) {
      const currentSource = readText(db, catalogItem.chapterId, 'source')
      if (currentSource.content.length > 0) {
        const currentHash = sha256(normalizeSourceText(currentSource.content))
        if (currentHash !== contentHash) {
          const dedupeKey = sha256(
            ['raw_changed', catalogItem.bindingId, catalogItem.id, contentHash].join('\0')
          )
          insertUpdateEvent(db, {
            id: newId(),
            bindingId: catalogItem.bindingId,
            catalogItemId: catalogItem.id,
            kind: 'raw_changed',
            dedupeKey,
            payloadJson: JSON.stringify({
              chapterId: catalogItem.chapterId,
              revisionId: revision.id,
              oldContentHash: currentHash,
              newContentHash: contentHash
            }),
            detectedAt: now,
            seenAt: null,
            actedAt: null
          })
        }
      }
    }

    return revision
  }

  previewApply(db: Db, chapterId: string, revisionId: string): RevisionApplyPreview {
    const revision = getContentRevision(db, revisionId)
    if (!revision) {
      throw new StorageError('not_found', `Revision ${revisionId} not found`)
    }

    const currentSource = readText(db, chapterId, 'source')
    const currentTarget = readText(db, chapterId, 'target')

    return {
      chapterId,
      catalogItemId: revision.catalogItemId,
      revisionId: revision.id,
      newContent: revision.normalizedText,
      currentContent: currentSource.content,
      expectedRev: currentSource.rev,
      targetContent: currentTarget.content,
      hasTarget: currentTarget.content.length > 0
    }
  }

  applyRevision(
    db: Db,
    args: ApplyRevisionArgs,
    now: number,
    newId: () => string
  ): { currentRev: number; revision: StoredContentRevision } {
    const revision = getContentRevision(db, args.revisionId)
    if (!revision) {
      throw new StorageError('not_found', `Revision ${args.revisionId} not found`)
    }

    const currentSource = readText(db, args.chapterId, 'source')
    if (currentSource.rev !== args.expectedRev) {
      throw new StorageError(
        'conflict',
        `Revision conflict: expected ${args.expectedRev}, found ${currentSource.rev}`
      )
    }

    // Save into chapter_text.source - target remains completely untouched!
    const saved = saveText(
      db,
      {
        chapterId: args.chapterId,
        side: 'source',
        content: revision.normalizedText,
        expectedRev: args.expectedRev,
        segments: []
      },
      now,
      newId
    )

    // Mark corresponding raw_changed update events as acted
    const events = listUpdateEvents(db)
    for (const ev of events) {
      if (ev.catalogItemId === revision.catalogItemId && ev.kind === 'raw_changed' && !ev.actedAt) {
        markEventActed(db, ev.id, now)
      }
    }

    return { currentRev: saved.rev, revision }
  }
}
