import { createHash } from 'node:crypto'
import type { AccessState, CatalogItem } from './domain'

export interface CatalogSnapshot {
  sourceId: string
  remoteWorkId: string
  items: CatalogItem[]
  complete: boolean
  exhausted: boolean
  semanticValid?: boolean
}

export interface CatalogStateItem extends CatalogItem {
  firstSeenAt: string
  lastSeenAt: string
  missingStreak: number
  missingSinceAt?: string
  removedAt?: string
}

export type CatalogEventKind =
  | 'added'
  | 'renamed'
  | 'moved'
  | 'access_changed'
  | 'missing_remote'
  | 'reappeared'

export interface CatalogEvent {
  kind: CatalogEventKind
  sourceId: string
  remoteWorkId: string
  remoteChapterId: string
  identityConfidence: 'stable' | 'fallback'
  dedupeKey: string
}

export interface SnapshotExpectation {
  sourceId: string
  remoteWorkId: string
  previousCount?: number
  maxDropRatio?: number
}

export interface SnapshotValidation {
  valid: boolean
  reasons: string[]
}

export function validateCatalogSnapshot(
  snapshot: CatalogSnapshot,
  expected: SnapshotExpectation
): SnapshotValidation {
  const reasons: string[] = []
  if (snapshot.sourceId !== expected.sourceId || snapshot.remoteWorkId !== expected.remoteWorkId) {
    reasons.push('work_identity_mismatch')
  }
  if (!snapshot.complete || !snapshot.exhausted) reasons.push('pagination_incomplete')
  if (snapshot.semanticValid === false) reasons.push('semantic_assertion_failed')
  const ids = snapshot.items.map((item) => item.remoteChapterId)
  if (ids.some((id) => id.length === 0) || new Set(ids).size !== ids.length) {
    reasons.push('duplicate_or_empty_chapter_identity')
  }
  if (expected.previousCount && expected.previousCount > 0) {
    const dropRatio = 1 - snapshot.items.length / expected.previousCount
    if (dropRatio > (expected.maxDropRatio ?? 1)) reasons.push('suspicious_count_drop')
  }
  return { valid: reasons.length === 0, reasons }
}

function dedupeKey(
  snapshot: Pick<CatalogSnapshot, 'sourceId' | 'remoteWorkId'>,
  remoteChapterId: string,
  kind: CatalogEventKind,
  signature: string
): string {
  return createHash('sha256')
    .update([snapshot.sourceId, snapshot.remoteWorkId, remoteChapterId, kind, signature].join('\0'))
    .digest('hex')
}

function event(
  snapshot: CatalogSnapshot,
  item: Pick<CatalogItem, 'remoteChapterId' | 'identityConfidence'>,
  kind: CatalogEventKind,
  signature: string
): CatalogEvent {
  return {
    kind,
    sourceId: snapshot.sourceId,
    remoteWorkId: snapshot.remoteWorkId,
    remoteChapterId: item.remoteChapterId,
    identityConfidence: item.identityConfidence ?? 'stable',
    dedupeKey: dedupeKey(snapshot, item.remoteChapterId, kind, signature)
  }
}

export interface CatalogDiffResult {
  valid: boolean
  validationReasons: string[]
  items: CatalogStateItem[]
  events: CatalogEvent[]
}

export function diffCatalog(
  previous: CatalogStateItem[],
  snapshot: CatalogSnapshot,
  observedAt: string,
  options: { removalThreshold?: number; maxDropRatio?: number } = {}
): CatalogDiffResult {
  const validation = validateCatalogSnapshot(snapshot, {
    sourceId: snapshot.sourceId,
    remoteWorkId: snapshot.remoteWorkId,
    previousCount: previous.filter((item) => item.removedAt === undefined).length,
    maxDropRatio: options.maxDropRatio
  })
  if (!validation.valid) {
    return { valid: false, validationReasons: validation.reasons, items: previous, events: [] }
  }

  const removalThreshold = options.removalThreshold ?? 3
  const priorById = new Map(previous.map((item) => [item.remoteChapterId, item]))
  const nextById = new Map(snapshot.items.map((item) => [item.remoteChapterId, item]))
  const items: CatalogStateItem[] = []
  const events: CatalogEvent[] = []

  for (const current of snapshot.items) {
    const prior = priorById.get(current.remoteChapterId)
    if (!prior) {
      items.push({ ...current, firstSeenAt: observedAt, lastSeenAt: observedAt, missingStreak: 0 })
      events.push(event(snapshot, current, 'added', JSON.stringify(current)))
      continue
    }

    if (prior.missingStreak > 0 || prior.removedAt !== undefined) {
      events.push(
        event(snapshot, current, 'reappeared', prior.missingSinceAt ?? String(prior.missingStreak))
      )
    }
    if (prior.title !== current.title) {
      events.push(event(snapshot, current, 'renamed', `${prior.title}\0${current.title}`))
    }
    if (prior.order !== current.order) {
      events.push(event(snapshot, current, 'moved', `${prior.order}\0${current.order}`))
    }
    if (prior.access !== current.access) {
      events.push(event(snapshot, current, 'access_changed', `${prior.access}\0${current.access}`))
    }
    items.push({
      ...prior,
      ...current,
      firstSeenAt: prior.firstSeenAt,
      lastSeenAt: observedAt,
      missingStreak: 0,
      missingSinceAt: undefined,
      removedAt: undefined
    })
  }

  for (const prior of previous) {
    if (nextById.has(prior.remoteChapterId)) continue
    const missingStreak = prior.missingStreak + 1
    const missingSinceAt = prior.missingSinceAt ?? observedAt
    const newlyRemoved = prior.removedAt === undefined && missingStreak >= removalThreshold
    const next = {
      ...prior,
      missingStreak,
      missingSinceAt,
      removedAt: newlyRemoved ? observedAt : prior.removedAt
    }
    items.push(next)
    if (newlyRemoved) {
      events.push(event(snapshot, prior, 'missing_remote', missingSinceAt))
    }
  }

  return { valid: true, validationReasons: [], items, events }
}

export function accessChanged(from: AccessState, to: AccessState): boolean {
  return from !== to
}
