import type { Db } from './sqlite'

export interface StoredSourceBinding {
  id: string
  adapterId: string
  adapterVersion: string
  remoteWorkId: string
  canonicalUrl: string | null
  countryCode: string | null
  languageTag: string
  label: string
  isPrimary: boolean
  enabled: boolean
  authProfileId: string | null
  schedulePolicyJson: string
  catalogCursorJson: string | null
  lastValidSyncAt: number | null
  lastAttemptAt: number | null
  nextCheckAt: number | null
  consecutiveFailures: number
  createdAt: number
  updatedAt: number
}

export interface StoredCatalogItem {
  id: string
  bindingId: string
  remoteChapterId: string
  remoteUrl: string | null
  chapterId: string | null
  ordinalKey: string
  volumeTitle: string | null
  title: string
  kind: string
  publishedAt: number | null
  remoteUpdatedAt: number | null
  revisionToken: string | null
  accessState: string
  firstSeenAt: number
  lastSeenAt: number
  missingStreak: number
  removedAt: number | null
  metadataHash: string
}

export interface StoredContentRevision {
  id: string
  catalogItemId: string
  contentHash: string
  payloadHash: string
  normalizedText: string
  normalizationVersion: number
  remoteUpdatedAt: number | null
  fetchedAt: number
  adapterVersion: string
  accessState: string
  isComplete: boolean
}

export interface StoredUpdateEvent {
  id: string
  bindingId: string
  catalogItemId: string | null
  kind: string
  dedupeKey: string
  payloadJson: string
  detectedAt: number
  seenAt: number | null
  actedAt: number | null
}

export interface StoredSyncRun {
  id: string
  bindingId: string
  trigger: 'manual' | 'import'
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_user'
  adapterVersion: string
  catalogComplete: boolean
  startedAt: number
  finishedAt: number | null
  failureKind: string | null
  failureMessage: string | null
  statsJson: string
}

export function listSourceBindings(db: Db): StoredSourceBinding[] {
  const rows = db
    .prepare(
      `SELECT id, adapter_id, adapter_version, remote_work_id, canonical_url, country_code,
              language_tag, label, is_primary, enabled, auth_profile_id, schedule_policy_json,
              catalog_cursor_json, last_valid_sync_at, last_attempt_at, next_check_at,
              consecutive_failures, created_at, updated_at
       FROM source_binding
       ORDER BY is_primary DESC, created_at ASC`
    )
    .all<{
      id: string
      adapter_id: string
      adapter_version: string
      remote_work_id: string
      canonical_url: string | null
      country_code: string | null
      language_tag: string
      label: string
      is_primary: number
      enabled: number
      auth_profile_id: string | null
      schedule_policy_json: string
      catalog_cursor_json: string | null
      last_valid_sync_at: number | null
      last_attempt_at: number | null
      next_check_at: number | null
      consecutive_failures: number
      created_at: number
      updated_at: number
    }>()

  return rows.map((r) => ({
    id: r.id,
    adapterId: r.adapter_id,
    adapterVersion: r.adapter_version,
    remoteWorkId: r.remote_work_id,
    canonicalUrl: r.canonical_url,
    countryCode: r.country_code,
    languageTag: r.language_tag,
    label: r.label,
    isPrimary: r.is_primary === 1,
    enabled: r.enabled === 1,
    authProfileId: r.auth_profile_id,
    schedulePolicyJson: r.schedule_policy_json,
    catalogCursorJson: r.catalog_cursor_json,
    lastValidSyncAt: r.last_valid_sync_at,
    lastAttemptAt: r.last_attempt_at,
    nextCheckAt: r.next_check_at,
    consecutiveFailures: r.consecutive_failures,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))
}

export function insertSourceBinding(db: Db, binding: StoredSourceBinding): void {
  db.prepare(
    `INSERT INTO source_binding (
       id, adapter_id, adapter_version, remote_work_id, canonical_url, country_code,
       language_tag, label, is_primary, enabled, auth_profile_id, schedule_policy_json,
       catalog_cursor_json, last_valid_sync_at, last_attempt_at, next_check_at,
       consecutive_failures, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    binding.id,
    binding.adapterId,
    binding.adapterVersion,
    binding.remoteWorkId,
    binding.canonicalUrl,
    binding.countryCode,
    binding.languageTag,
    binding.label,
    binding.isPrimary ? 1 : 0,
    binding.enabled ? 1 : 0,
    binding.authProfileId,
    binding.schedulePolicyJson,
    binding.catalogCursorJson,
    binding.lastValidSyncAt,
    binding.lastAttemptAt,
    binding.nextCheckAt,
    binding.consecutiveFailures,
    binding.createdAt,
    binding.updatedAt
  )
}

export function listCatalogItems(db: Db, bindingId?: string): StoredCatalogItem[] {
  const query = bindingId
    ? 'SELECT * FROM source_catalog_item WHERE binding_id = ? ORDER BY ordinal_key ASC'
    : 'SELECT * FROM source_catalog_item ORDER BY binding_id, ordinal_key ASC'
  const rows = bindingId
    ? db.prepare(query).all<{
        id: string
        binding_id: string
        remote_chapter_id: string
        remote_url: string | null
        chapter_id: string | null
        ordinal_key: string
        volume_title: string | null
        title: string
        kind: string
        published_at: number | null
        remote_updated_at: number | null
        revision_token: string | null
        access_state: string
        first_seen_at: number
        last_seen_at: number
        missing_streak: number
        removed_at: number | null
        metadata_hash: string
      }>(bindingId)
    : db.prepare(query).all<{
        id: string
        binding_id: string
        remote_chapter_id: string
        remote_url: string | null
        chapter_id: string | null
        ordinal_key: string
        volume_title: string | null
        title: string
        kind: string
        published_at: number | null
        remote_updated_at: number | null
        revision_token: string | null
        access_state: string
        first_seen_at: number
        last_seen_at: number
        missing_streak: number
        removed_at: number | null
        metadata_hash: string
      }>()

  return rows.map((r) => ({
    id: r.id,
    bindingId: r.binding_id,
    remoteChapterId: r.remote_chapter_id,
    remoteUrl: r.remote_url,
    chapterId: r.chapter_id,
    ordinalKey: r.ordinal_key,
    volumeTitle: r.volume_title,
    title: r.title,
    kind: r.kind,
    publishedAt: r.published_at,
    remoteUpdatedAt: r.remote_updated_at,
    revisionToken: r.revision_token,
    accessState: r.access_state,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    missingStreak: r.missing_streak,
    removedAt: r.removed_at,
    metadataHash: r.metadata_hash
  }))
}

export function insertCatalogItem(db: Db, item: StoredCatalogItem): void {
  db.prepare(
    `INSERT INTO source_catalog_item (
       id, binding_id, remote_chapter_id, remote_url, chapter_id, ordinal_key,
       volume_title, title, kind, published_at, remote_updated_at, revision_token,
       access_state, first_seen_at, last_seen_at, missing_streak, removed_at, metadata_hash
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    item.id,
    item.bindingId,
    item.remoteChapterId,
    item.remoteUrl,
    item.chapterId,
    item.ordinalKey,
    item.volumeTitle,
    item.title,
    item.kind,
    item.publishedAt,
    item.remoteUpdatedAt,
    item.revisionToken,
    item.accessState,
    item.firstSeenAt,
    item.lastSeenAt,
    item.missingStreak,
    item.removedAt,
    item.metadataHash
  )
}

export function getSourceBinding(db: Db, id: string): StoredSourceBinding | null {
  const r = db
    .prepare(
      `SELECT id, adapter_id, adapter_version, remote_work_id, canonical_url, country_code,
              language_tag, label, is_primary, enabled, auth_profile_id, schedule_policy_json,
              catalog_cursor_json, last_valid_sync_at, last_attempt_at, next_check_at,
              consecutive_failures, created_at, updated_at
       FROM source_binding
       WHERE id = ?`
    )
    .get<{
      id: string
      adapter_id: string
      adapter_version: string
      remote_work_id: string
      canonical_url: string | null
      country_code: string | null
      language_tag: string
      label: string
      is_primary: number
      enabled: number
      auth_profile_id: string | null
      schedule_policy_json: string
      catalog_cursor_json: string | null
      last_valid_sync_at: number | null
      last_attempt_at: number | null
      next_check_at: number | null
      consecutive_failures: number
      created_at: number
      updated_at: number
    }>(id)
  if (!r) return null
  return {
    id: r.id,
    adapterId: r.adapter_id,
    adapterVersion: r.adapter_version,
    remoteWorkId: r.remote_work_id,
    canonicalUrl: r.canonical_url,
    countryCode: r.country_code,
    languageTag: r.language_tag,
    label: r.label,
    isPrimary: r.is_primary === 1,
    enabled: r.enabled === 1,
    authProfileId: r.auth_profile_id,
    schedulePolicyJson: r.schedule_policy_json,
    catalogCursorJson: r.catalog_cursor_json,
    lastValidSyncAt: r.last_valid_sync_at,
    lastAttemptAt: r.last_attempt_at,
    nextCheckAt: r.next_check_at,
    consecutiveFailures: r.consecutive_failures,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export function updateSourceBinding(db: Db, binding: StoredSourceBinding): void {
  db.prepare(
    `UPDATE source_binding SET
       adapter_version = ?, canonical_url = ?, country_code = ?, language_tag = ?,
       label = ?, is_primary = ?, enabled = ?, auth_profile_id = ?, schedule_policy_json = ?,
       catalog_cursor_json = ?, last_valid_sync_at = ?, last_attempt_at = ?, next_check_at = ?,
       consecutive_failures = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    binding.adapterVersion,
    binding.canonicalUrl,
    binding.countryCode,
    binding.languageTag,
    binding.label,
    binding.isPrimary ? 1 : 0,
    binding.enabled ? 1 : 0,
    binding.authProfileId,
    binding.schedulePolicyJson,
    binding.catalogCursorJson,
    binding.lastValidSyncAt,
    binding.lastAttemptAt,
    binding.nextCheckAt,
    binding.consecutiveFailures,
    binding.updatedAt,
    binding.id
  )
}

export function deleteSourceBinding(db: Db, id: string): void {
  db.prepare('DELETE FROM source_binding WHERE id = ?').run(id)
}

export function getCatalogItem(db: Db, id: string): StoredCatalogItem | null {
  const r = db.prepare('SELECT * FROM source_catalog_item WHERE id = ?').get<{
    id: string
    binding_id: string
    remote_chapter_id: string
    remote_url: string | null
    chapter_id: string | null
    ordinal_key: string
    volume_title: string | null
    title: string
    kind: string
    published_at: number | null
    remote_updated_at: number | null
    revision_token: string | null
    access_state: string
    first_seen_at: number
    last_seen_at: number
    missing_streak: number
    removed_at: number | null
    metadata_hash: string
  }>(id)
  if (!r) return null
  return {
    id: r.id,
    bindingId: r.binding_id,
    remoteChapterId: r.remote_chapter_id,
    remoteUrl: r.remote_url,
    chapterId: r.chapter_id,
    ordinalKey: r.ordinal_key,
    volumeTitle: r.volume_title,
    title: r.title,
    kind: r.kind,
    publishedAt: r.published_at,
    remoteUpdatedAt: r.remote_updated_at,
    revisionToken: r.revision_token,
    accessState: r.access_state,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    missingStreak: r.missing_streak,
    removedAt: r.removed_at,
    metadataHash: r.metadata_hash
  }
}

export function updateCatalogItem(db: Db, item: StoredCatalogItem): void {
  db.prepare(
    `UPDATE source_catalog_item SET
       remote_url = ?, chapter_id = ?, ordinal_key = ?, volume_title = ?, title = ?,
       kind = ?, published_at = ?, remote_updated_at = ?, revision_token = ?, access_state = ?,
       last_seen_at = ?, missing_streak = ?, removed_at = ?, metadata_hash = ?
     WHERE id = ?`
  ).run(
    item.remoteUrl,
    item.chapterId,
    item.ordinalKey,
    item.volumeTitle,
    item.title,
    item.kind,
    item.publishedAt,
    item.remoteUpdatedAt,
    item.revisionToken,
    item.accessState,
    item.lastSeenAt,
    item.missingStreak,
    item.removedAt,
    item.metadataHash,
    item.id
  )
}

export function insertContentRevision(db: Db, rev: StoredContentRevision): void {
  db.prepare(
    `INSERT INTO source_content_revision (
       id, catalog_item_id, content_hash, payload_hash, normalized_text,
       normalization_version, remote_updated_at, fetched_at, adapter_version,
       access_state, is_complete
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    rev.id,
    rev.catalogItemId,
    rev.contentHash,
    rev.payloadHash,
    rev.normalizedText,
    rev.normalizationVersion,
    rev.remoteUpdatedAt,
    rev.fetchedAt,
    rev.adapterVersion,
    rev.accessState,
    rev.isComplete ? 1 : 0
  )
}

export function getContentRevision(db: Db, id: string): StoredContentRevision | null {
  const r = db.prepare('SELECT * FROM source_content_revision WHERE id = ?').get<{
    id: string
    catalog_item_id: string
    content_hash: string
    payload_hash: string
    normalized_text: string
    normalization_version: number
    remote_updated_at: number | null
    fetched_at: number
    adapter_version: string
    access_state: string
    is_complete: number
  }>(id)
  if (!r) return null
  return {
    id: r.id,
    catalogItemId: r.catalog_item_id,
    contentHash: r.content_hash,
    payloadHash: r.payload_hash,
    normalizedText: r.normalized_text,
    normalizationVersion: r.normalization_version,
    remoteUpdatedAt: r.remote_updated_at,
    fetchedAt: r.fetched_at,
    adapterVersion: r.adapter_version,
    accessState: r.access_state,
    isComplete: r.is_complete === 1
  }
}

export function getRevisionByHash(
  db: Db,
  catalogItemId: string,
  contentHash: string
): StoredContentRevision | null {
  const r = db
    .prepare(
      `SELECT * FROM source_content_revision
       WHERE catalog_item_id = ? AND content_hash = ?`
    )
    .get<{
      id: string
      catalog_item_id: string
      content_hash: string
      payload_hash: string
      normalized_text: string
      normalization_version: number
      remote_updated_at: number | null
      fetched_at: number
      adapter_version: string
      access_state: string
      is_complete: number
    }>(catalogItemId, contentHash)
  if (!r) return null
  return {
    id: r.id,
    catalogItemId: r.catalog_item_id,
    contentHash: r.content_hash,
    payloadHash: r.payload_hash,
    normalizedText: r.normalized_text,
    normalizationVersion: r.normalization_version,
    remoteUpdatedAt: r.remote_updated_at,
    fetchedAt: r.fetched_at,
    adapterVersion: r.adapter_version,
    accessState: r.access_state,
    isComplete: r.is_complete === 1
  }
}

export function listContentRevisions(db: Db, catalogItemId: string): StoredContentRevision[] {
  const rows = db
    .prepare(
      `SELECT * FROM source_content_revision
       WHERE catalog_item_id = ? ORDER BY fetched_at DESC, id DESC`
    )
    .all<{
      id: string
      catalog_item_id: string
      content_hash: string
      payload_hash: string
      normalized_text: string
      normalization_version: number
      remote_updated_at: number | null
      fetched_at: number
      adapter_version: string
      access_state: string
      is_complete: number
    }>(catalogItemId)
  return rows.map((r) => ({
    id: r.id,
    catalogItemId: r.catalog_item_id,
    contentHash: r.content_hash,
    payloadHash: r.payload_hash,
    normalizedText: r.normalized_text,
    normalizationVersion: r.normalization_version,
    remoteUpdatedAt: r.remote_updated_at,
    fetchedAt: r.fetched_at,
    adapterVersion: r.adapter_version,
    accessState: r.access_state,
    isComplete: r.is_complete === 1
  }))
}

export function insertUpdateEvent(db: Db, ev: StoredUpdateEvent): void {
  db.prepare(
    `INSERT OR IGNORE INTO source_update_event (
       id, binding_id, catalog_item_id, kind, dedupe_key, payload_json,
       detected_at, seen_at, acted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ev.id,
    ev.bindingId,
    ev.catalogItemId,
    ev.kind,
    ev.dedupeKey,
    ev.payloadJson,
    ev.detectedAt,
    ev.seenAt,
    ev.actedAt
  )
}

export function listUpdateEvents(db: Db, bindingId?: string): StoredUpdateEvent[] {
  const query = bindingId
    ? `SELECT id, binding_id, catalog_item_id, kind, dedupe_key, payload_json, detected_at, seen_at, acted_at
       FROM source_update_event WHERE binding_id = ? ORDER BY detected_at DESC, id DESC`
    : `SELECT id, binding_id, catalog_item_id, kind, dedupe_key, payload_json, detected_at, seen_at, acted_at
       FROM source_update_event ORDER BY detected_at DESC, id DESC`
  const rows = bindingId
    ? db.prepare(query).all<{
        id: string
        binding_id: string
        catalog_item_id: string | null
        kind: string
        dedupe_key: string
        payload_json: string
        detected_at: number
        seen_at: number | null
        acted_at: number | null
      }>(bindingId)
    : db.prepare(query).all<{
        id: string
        binding_id: string
        catalog_item_id: string | null
        kind: string
        dedupe_key: string
        payload_json: string
        detected_at: number
        seen_at: number | null
        acted_at: number | null
      }>()
  return rows.map((r) => ({
    id: r.id,
    bindingId: r.binding_id,
    catalogItemId: r.catalog_item_id,
    kind: r.kind,
    dedupeKey: r.dedupe_key,
    payloadJson: r.payload_json,
    detectedAt: r.detected_at,
    seenAt: r.seen_at,
    actedAt: r.acted_at
  }))
}

export function markEventSeen(db: Db, eventId: string, now: number): void {
  db.prepare(`UPDATE source_update_event SET seen_at = COALESCE(seen_at, ?) WHERE id = ?`).run(
    now,
    eventId
  )
}

export function markEventActed(db: Db, eventId: string, now: number): void {
  db.prepare(
    `UPDATE source_update_event SET acted_at = ?, seen_at = COALESCE(seen_at, ?) WHERE id = ?`
  ).run(now, now, eventId)
}

export function insertSyncRun(db: Db, run: StoredSyncRun): void {
  db.prepare(
    `INSERT INTO source_sync_run (
       id, binding_id, trigger, state, adapter_version, catalog_complete,
       started_at, finished_at, failure_kind, failure_message, stats_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    run.id,
    run.bindingId,
    run.trigger,
    run.state,
    run.adapterVersion,
    run.catalogComplete ? 1 : 0,
    run.startedAt,
    run.finishedAt,
    run.failureKind,
    run.failureMessage,
    run.statsJson
  )
}

export function updateSyncRun(db: Db, run: Partial<StoredSyncRun> & { id: string }): void {
  const current = db.prepare('SELECT * FROM source_sync_run WHERE id = ?').get<{
    id: string
    binding_id: string
    trigger: 'manual' | 'import'
    state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_user'
    adapter_version: string
    catalog_complete: number
    started_at: number
    finished_at: number | null
    failure_kind: string | null
    failure_message: string | null
    stats_json: string
  }>(run.id)
  if (!current) return

  db.prepare(
    `UPDATE source_sync_run SET
       state = ?, catalog_complete = ?, finished_at = ?, failure_kind = ?,
       failure_message = ?, stats_json = ?
     WHERE id = ?`
  ).run(
    run.state ?? current.state,
    run.catalogComplete !== undefined ? (run.catalogComplete ? 1 : 0) : current.catalog_complete,
    run.finishedAt !== undefined ? run.finishedAt : current.finished_at,
    run.failureKind !== undefined ? run.failureKind : current.failure_kind,
    run.failureMessage !== undefined ? run.failureMessage : current.failure_message,
    run.statsJson ?? current.stats_json,
    run.id
  )
}

export function getSyncRun(db: Db, id: string): StoredSyncRun | null {
  const r = db.prepare('SELECT * FROM source_sync_run WHERE id = ?').get<{
    id: string
    binding_id: string
    trigger: 'manual' | 'import'
    state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_user'
    adapter_version: string
    catalog_complete: number
    started_at: number
    finished_at: number | null
    failure_kind: string | null
    failure_message: string | null
    stats_json: string
  }>(id)
  if (!r) return null
  return {
    id: r.id,
    bindingId: r.binding_id,
    trigger: r.trigger,
    state: r.state,
    adapterVersion: r.adapter_version,
    catalogComplete: r.catalog_complete === 1,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    failureKind: r.failure_kind,
    failureMessage: r.failure_message,
    statsJson: r.stats_json
  }
}

export function rebuildScheduleIndex(
  libraryDb: Db,
  workBindings: Array<{ workId: string; bindings: StoredSourceBinding[] }>
): void {
  libraryDb.transaction(() => {
    libraryDb.prepare('DELETE FROM source_schedule_index').run()
    const insert = libraryDb.prepare(
      `INSERT INTO source_schedule_index (
         work_id, binding_id, enabled, next_check_at, priority, last_result
       ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (const { workId, bindings } of workBindings) {
      for (const b of bindings) {
        insert.run(workId, b.id, b.enabled ? 1 : 0, b.nextCheckAt, 0, 'ok')
      }
    }
  })
}
