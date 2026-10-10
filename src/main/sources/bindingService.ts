import type { Db } from '../infra/storage/sqlite'
import { StorageError } from '../infra/storage/errors'
import {
  deleteSourceBinding as deleteStoredBinding,
  getSourceBinding,
  insertSourceBinding,
  listSourceBindings,
  updateSourceBinding,
  type StoredSourceBinding
} from '../infra/storage/sourceStorage'
import type {
  SourceBinding,
  SourceBindingCreateInput,
  SourceBindingUpdateInput
} from '../../shared/contracts/sources'

export function storedToContractBinding(
  stored: StoredSourceBinding,
  workId: string
): SourceBinding {
  return {
    id: stored.id,
    workId,
    sourceId: stored.adapterId,
    adapterVersion: stored.adapterVersion,
    remoteWorkId: stored.remoteWorkId,
    canonicalUrl: stored.canonicalUrl,
    countryCode: stored.countryCode,
    languageTag: stored.languageTag,
    label: stored.label,
    role: stored.isPrimary ? 'primary' : 'reference',
    authProfileId: stored.authProfileId,
    enabled: stored.enabled,
    checkpoint: stored.catalogCursorJson,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt
  }
}

export class SourceBindingService {
  listBindings(db: Db, workId: string): SourceBinding[] {
    const stored = listSourceBindings(db)
    return stored.map((b) => storedToContractBinding(b, workId))
  }

  getBinding(db: Db, workId: string, id: string): SourceBinding | null {
    const stored = getSourceBinding(db, id)
    if (!stored) return null
    return storedToContractBinding(stored, workId)
  }

  createBinding(
    db: Db,
    workId: string,
    input: Omit<SourceBindingCreateInput, 'expectedPreviewId'>,
    now: number,
    newId: () => string
  ): SourceBinding {
    return db.transaction(() => {
      const isPrimary = input.role === 'primary'

      if (isPrimary) {
        // Unset previous primary if any
        const existing = listSourceBindings(db)
        for (const b of existing) {
          if (b.isPrimary) {
            updateSourceBinding(db, {
              ...b,
              isPrimary: false,
              updatedAt: now
            })
          }
        }
      }

      const id = newId()
      const stored: StoredSourceBinding = {
        id,
        adapterId: input.sourceId,
        adapterVersion: '1.0.0', // Set to manifest or adapter default
        remoteWorkId: input.remoteWorkId,
        canonicalUrl: null,
        countryCode: null,
        languageTag: input.languageTag,
        label: input.label,
        isPrimary,
        enabled: true,
        authProfileId: input.authProfileId ?? null,
        schedulePolicyJson: '{}',
        catalogCursorJson: null,
        lastValidSyncAt: null,
        lastAttemptAt: null,
        nextCheckAt: null,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now
      }

      insertSourceBinding(db, stored)
      return storedToContractBinding(stored, workId)
    })
  }

  updateBinding(
    db: Db,
    workId: string,
    bindingId: string,
    patch: SourceBindingUpdateInput['patch'],
    now: number
  ): SourceBinding {
    return db.transaction(() => {
      const stored = getSourceBinding(db, bindingId)
      if (!stored) {
        throw new StorageError('not_found', `Binding ${bindingId} not found`)
      }

      if (patch.role === 'primary' && !stored.isPrimary) {
        const existing = listSourceBindings(db)
        for (const b of existing) {
          if (b.isPrimary && b.id !== bindingId) {
            updateSourceBinding(db, {
              ...b,
              isPrimary: false,
              updatedAt: now
            })
          }
        }
      }

      const updated: StoredSourceBinding = {
        ...stored,
        label: patch.label ?? stored.label,
        isPrimary: patch.role ? patch.role === 'primary' : stored.isPrimary,
        authProfileId:
          patch.authProfileId !== undefined ? patch.authProfileId : stored.authProfileId,
        enabled: patch.enabled !== undefined ? patch.enabled : stored.enabled,
        updatedAt: now
      }

      updateSourceBinding(db, updated)
      return storedToContractBinding(updated, workId)
    })
  }

  deleteBinding(db: Db, _workId: string, bindingId: string): void {
    const stored = getSourceBinding(db, bindingId)
    if (!stored) {
      throw new StorageError('not_found', `Binding ${bindingId} not found`)
    }
    deleteStoredBinding(db, bindingId)
  }
}
