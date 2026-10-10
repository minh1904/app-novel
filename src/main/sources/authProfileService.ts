import type { Db } from '../infra/storage/sqlite'
import { StorageError } from '../infra/storage/errors'
import type { SecretCrypto } from '../infra/storage/secretStore'

export interface AuthProfileSummary {
  id: string
  adapterId: string
  label: string
  accountPartition: string
  state: 'ok' | 'relogin' | 'expired'
  createdAt: number
  updatedAt: number
}

export interface CreateAuthProfileInput {
  adapterId: string
  label: string
  secret: string
  accountPartition?: string
}

export interface UpdateAuthProfileInput {
  label?: string
  secret?: string
  state?: 'ok' | 'relogin' | 'expired'
}

export class AuthProfileService {
  constructor(private readonly crypto: SecretCrypto) {}

  private ensureAdapterInstalled(libraryDb: Db, adapterId: string, now: number): void {
    const existing = libraryDb
      .prepare('SELECT 1 FROM source_adapter_install WHERE adapter_id = ?')
      .get<{ 1: number }>(adapterId)
    if (!existing) {
      libraryDb
        .prepare(
          `INSERT INTO source_adapter_install (
             adapter_id, version, manifest_json, artifact_sha256, trust_level, state,
             installed_at, updated_at
           ) VALUES (?, '1.0.0', '{}', '', 'builtin', 'enabled', ?, ?)`
        )
        .run(adapterId, now, now)
    }
  }

  async createProfile(
    libraryDb: Db,
    input: CreateAuthProfileInput,
    now: number,
    newId: () => string
  ): Promise<AuthProfileSummary> {
    if (!this.crypto.isEncryptionAvailable()) {
      throw new StorageError(
        'io',
        'Không thể lưu thông tin tài khoản vì mã hóa hệ thống không khả dụng'
      )
    }

    this.ensureAdapterInstalled(libraryDb, input.adapterId, now)

    const encrypted = await this.crypto.encrypt(input.secret)
    const id = newId()
    const partition = input.accountPartition ?? `partition:${id}`

    libraryDb
      .prepare(
        `INSERT INTO source_auth_profile (
           id, adapter_id, label, encrypted_secret, account_partition, state, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 'ok', ?, ?)`
      )
      .run(id, input.adapterId, input.label, encrypted, partition, now, now)

    return {
      id,
      adapterId: input.adapterId,
      label: input.label,
      accountPartition: partition,
      state: 'ok',
      createdAt: now,
      updatedAt: now
    }
  }

  listProfiles(libraryDb: Db, adapterId?: string): AuthProfileSummary[] {
    const query = adapterId
      ? `SELECT id, adapter_id, label, account_partition, state, created_at, updated_at
         FROM source_auth_profile WHERE adapter_id = ? ORDER BY created_at ASC`
      : `SELECT id, adapter_id, label, account_partition, state, created_at, updated_at
         FROM source_auth_profile ORDER BY created_at ASC`

    const rows = adapterId
      ? libraryDb.prepare(query).all<{
          id: string
          adapter_id: string
          label: string
          account_partition: string
          state: 'ok' | 'relogin' | 'expired'
          created_at: number
          updated_at: number
        }>(adapterId)
      : libraryDb.prepare(query).all<{
          id: string
          adapter_id: string
          label: string
          account_partition: string
          state: 'ok' | 'relogin' | 'expired'
          created_at: number
          updated_at: number
        }>()

    return rows.map((r) => ({
      id: r.id,
      adapterId: r.adapter_id,
      label: r.label,
      accountPartition: r.account_partition,
      state: r.state,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  getProfile(libraryDb: Db, id: string): AuthProfileSummary | null {
    const r = libraryDb
      .prepare(
        `SELECT id, adapter_id, label, account_partition, state, created_at, updated_at
         FROM source_auth_profile WHERE id = ?`
      )
      .get<{
        id: string
        adapter_id: string
        label: string
        account_partition: string
        state: 'ok' | 'relogin' | 'expired'
        created_at: number
        updated_at: number
      }>(id)

    if (!r) return null
    return {
      id: r.id,
      adapterId: r.adapter_id,
      label: r.label,
      accountPartition: r.account_partition,
      state: r.state,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  async updateProfile(
    libraryDb: Db,
    id: string,
    patch: UpdateAuthProfileInput,
    now: number
  ): Promise<AuthProfileSummary> {
    const current = this.getProfile(libraryDb, id)
    if (!current) {
      throw new StorageError('not_found', `Auth profile ${id} not found`)
    }

    if (patch.secret !== undefined) {
      if (!this.crypto.isEncryptionAvailable()) {
        throw new StorageError('io', 'Mã hóa hệ thống không khả dụng')
      }
      const encrypted = await this.crypto.encrypt(patch.secret)
      libraryDb
        .prepare('UPDATE source_auth_profile SET encrypted_secret = ?, updated_at = ? WHERE id = ?')
        .run(encrypted, now, id)
    }

    if (patch.label !== undefined || patch.state !== undefined) {
      libraryDb
        .prepare(
          `UPDATE source_auth_profile
           SET label = ?, state = ?, updated_at = ? WHERE id = ?`
        )
        .run(patch.label ?? current.label, patch.state ?? current.state, now, id)
    }

    return this.getProfile(libraryDb, id)!
  }

  deleteProfile(libraryDb: Db, id: string): void {
    libraryDb.prepare('DELETE FROM source_auth_profile WHERE id = ?').run(id)
  }

  async getDecryptedSecret(libraryDb: Db, id: string): Promise<string> {
    const row = libraryDb
      .prepare('SELECT encrypted_secret FROM source_auth_profile WHERE id = ?')
      .get<{ encrypted_secret: Uint8Array }>(id)
    if (!row) {
      throw new StorageError('not_found', `Auth profile ${id} not found`)
    }
    const { value } = await this.crypto.decrypt(row.encrypted_secret)
    return value
  }

  checkProfileStatus(
    libraryDb: Db,
    authProfileId: string | null
  ): 'ok' | 'login_required' | 'expired' {
    if (!authProfileId) return 'ok'
    const profile = this.getProfile(libraryDb, authProfileId)
    if (!profile) return 'login_required'
    if (profile.state === 'expired' || profile.state === 'relogin') return 'login_required'
    return 'ok'
  }
}
