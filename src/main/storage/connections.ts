import { StorageError } from './errors'
import type { Db } from './sqlite'

/**
 * Kết nối AI và khóa của chúng, lưu trong `library.db` (phạm vi ứng dụng, không theo tác phẩm).
 *
 * Quy tắc xuyên suốt: **không hàm nào ở đây trả khóa dạng rõ**. `ConnectionView` là thứ đi qua IPC
 * và chỉ có bốn ký tự cuối. Bản mã chỉ lấy được bằng `readKeyCiphers`, dùng trong main process để
 * gọi nhà cung cấp (D2 của change `ai-connection`).
 */

export type KeyState = 'ok' | 'invalid'
/** Phạm vi hạn mức đã làm khóa bị đóng băng; `null` khi không xác định được (D11). */
export type QuotaScope = 'minute' | 'day'

export interface ConnectionKeyView {
  id: string
  /** Bốn ký tự cuối, để người dùng nhận ra khóa nào. */
  tail: string
  state: KeyState
  /** Mốc hết đóng băng, ms epoch. */
  frozenUntil: number | null
  frozenScope: QuotaScope | null
}

export interface ConnectionView {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  /** Id nhà cung cấp của preset, để tra bảng giá; `null` khi người dùng tự nhập URL. */
  providerId: string | null
  defaultModel: string | null
  checkedAt: number | null
  keys: ConnectionKeyView[]
  /** Model người dùng chọn dùng trong Mira, theo thứ tự hiển thị. */
  models: string[]
}

export interface ConnectionInput {
  name: string
  baseUrl: string
  providerId?: string | null
  enabled?: boolean
}

export interface ConnectionPatch {
  name?: string
  baseUrl?: string
  providerId?: string | null
  enabled?: boolean
  defaultModel?: string | null
  checkedAt?: number | null
}

/** Bản mã của một khóa; chỉ dùng trong main process. */
export interface KeyCipher {
  id: string
  cipher: Uint8Array
  state: KeyState
  frozenUntil: number | null
  frozenScope: QuotaScope | null
  freezeStrikes: number
}

interface ConnectionRow {
  id: string
  name: string
  base_url: string
  enabled: number
  provider_id: string | null
  default_model: string | null
  checked_at: number | null
}

interface KeyRow {
  id: string
  connection_id: string
  tail: string
  state: string
  frozen_until: number | null
  frozen_scope: string | null
}

function toKeyState(value: string): KeyState {
  return value === 'invalid' ? 'invalid' : 'ok'
}

function toQuotaScope(value: string | null): QuotaScope | null {
  return value === 'minute' || value === 'day' ? value : null
}

function nextOrd(db: Db, sql: string, ...params: string[]): number {
  const row = db.prepare(sql).get<{ next: number | null }>(...params)
  return row?.next ?? 0
}

export function listConnections(db: Db): ConnectionView[] {
  const rows = db
    .prepare(
      'SELECT id, name, base_url, enabled, provider_id, default_model, checked_at' +
        ' FROM ai_connection ORDER BY ord, created_at'
    )
    .all<ConnectionRow>()
  if (rows.length === 0) return []

  const keys = db
    .prepare(
      'SELECT id, connection_id, tail, state, frozen_until, frozen_scope' +
        ' FROM ai_key ORDER BY connection_id, ord, created_at'
    )
    .all<KeyRow>()
  const models = db
    .prepare('SELECT connection_id, model_id FROM ai_model ORDER BY connection_id, ord')
    .all<{ connection_id: string; model_id: string }>()

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    enabled: row.enabled !== 0,
    providerId: row.provider_id,
    defaultModel: row.default_model,
    checkedAt: row.checked_at,
    keys: keys
      .filter((key) => key.connection_id === row.id)
      .map((key) => ({
        id: key.id,
        tail: key.tail,
        state: toKeyState(key.state),
        frozenUntil: key.frozen_until,
        frozenScope: toQuotaScope(key.frozen_scope)
      })),
    models: models.filter((model) => model.connection_id === row.id).map((m) => m.model_id)
  }))
}

export function getConnection(db: Db, id: string): ConnectionView {
  const found = listConnections(db).find((connection) => connection.id === id)
  if (!found) throw new StorageError('not_found', 'Không có kết nối AI này.')
  return found
}

export function insertConnection(
  db: Db,
  id: string,
  input: ConnectionInput,
  now: number
): ConnectionView {
  const name = input.name.trim()
  const baseUrl = input.baseUrl.trim()
  if (name === '') throw new StorageError('validation', 'Tên kết nối không được để trống.')
  if (baseUrl === '') throw new StorageError('validation', 'Địa chỉ không được để trống.')

  const ord = nextOrd(db, 'SELECT MAX(ord) + 1 AS next FROM ai_connection')
  db.prepare(
    'INSERT INTO ai_connection (id, name, base_url, enabled, provider_id, default_model,' +
      ' checked_at, ord, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)'
  ).run(id, name, baseUrl, input.enabled === false ? 0 : 1, input.providerId ?? null, ord, now, now)
  return getConnection(db, id)
}

export function patchConnection(
  db: Db,
  id: string,
  patch: ConnectionPatch,
  now: number
): ConnectionView {
  const current = getConnection(db, id)
  const name = patch.name === undefined ? current.name : patch.name.trim()
  const baseUrl = patch.baseUrl === undefined ? current.baseUrl : patch.baseUrl.trim()
  if (name === '') throw new StorageError('validation', 'Tên kết nối không được để trống.')
  if (baseUrl === '') throw new StorageError('validation', 'Địa chỉ không được để trống.')

  db.prepare(
    'UPDATE ai_connection SET name = ?, base_url = ?, enabled = ?, provider_id = ?,' +
      ' default_model = ?, checked_at = ?, updated_at = ? WHERE id = ?'
  ).run(
    name,
    baseUrl,
    (patch.enabled ?? current.enabled) ? 1 : 0,
    patch.providerId === undefined ? current.providerId : patch.providerId,
    patch.defaultModel === undefined ? current.defaultModel : patch.defaultModel,
    patch.checkedAt === undefined ? current.checkedAt : patch.checkedAt,
    now,
    id
  )
  return getConnection(db, id)
}

export function deleteConnection(db: Db, id: string): void {
  const result = db.prepare('DELETE FROM ai_connection WHERE id = ?').run(id)
  if (result.changes === 0) throw new StorageError('not_found', 'Không có kết nối AI này.')
}

/** Thêm một khóa đã được mã hoá. Chỉ nhận bản mã — hàm này không biết khóa thật. */
export function addKey(
  db: Db,
  connectionId: string,
  keyId: string,
  sealed: { cipher: Uint8Array; tail: string },
  now: number
): ConnectionView {
  getConnection(db, connectionId)
  const ord = nextOrd(
    db,
    'SELECT MAX(ord) + 1 AS next FROM ai_key WHERE connection_id = ?',
    connectionId
  )
  db.prepare(
    'INSERT INTO ai_key (id, connection_id, secret, tail, ord, state, frozen_until,' +
      ' frozen_scope, freeze_strikes, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?)'
  ).run(keyId, connectionId, sealed.cipher, sealed.tail, ord, 'ok', now)
  return getConnection(db, connectionId)
}

export function removeKey(db: Db, keyId: string): void {
  const result = db.prepare('DELETE FROM ai_key WHERE id = ?').run(keyId)
  if (result.changes === 0) throw new StorageError('not_found', 'Không có khóa này.')
}

/** Đặt lại danh sách model đã chọn, giữ đúng thứ tự người dùng xếp. */
export function setModels(db: Db, connectionId: string, modelIds: string[]): ConnectionView {
  getConnection(db, connectionId)
  db.transaction(() => {
    db.prepare('DELETE FROM ai_model WHERE connection_id = ?').run(connectionId)
    const insert = db.prepare(
      'INSERT INTO ai_model (connection_id, model_id, ord) VALUES (?, ?, ?)'
    )
    const seen = new Set<string>()
    let ord = 0
    for (const modelId of modelIds) {
      const id = modelId.trim()
      if (id === '' || seen.has(id)) continue
      seen.add(id)
      insert.run(connectionId, id, ord++)
    }
  })
  return getConnection(db, connectionId)
}

/**
 * Bản mã của mọi khóa trong một kết nối, theo thứ tự người dùng khai — thứ tự đó là thứ tự
 * `fill-first` dùng. **Chỉ gọi trong main process.**
 */
export function readKeyCiphers(db: Db, connectionId: string): KeyCipher[] {
  return db
    .prepare(
      'SELECT id, secret, state, frozen_until, frozen_scope, freeze_strikes' +
        ' FROM ai_key WHERE connection_id = ? ORDER BY ord, created_at'
    )
    .all<{
      id: string
      secret: Uint8Array
      state: string
      frozen_until: number | null
      frozen_scope: string | null
      freeze_strikes: number
    }>(connectionId)
    .map((row) => ({
      id: row.id,
      cipher: row.secret,
      state: toKeyState(row.state),
      frozenUntil: row.frozen_until,
      frozenScope: toQuotaScope(row.frozen_scope),
      freezeStrikes: row.freeze_strikes
    }))
}

/** Ghi lại bản mã mới sau khi hệ điều hành xoay khóa. */
export function reSealKey(db: Db, keyId: string, cipher: Uint8Array): void {
  db.prepare('UPDATE ai_key SET secret = ? WHERE id = ?').run(cipher, keyId)
}

export function freezeKey(
  db: Db,
  keyId: string,
  until: number,
  scope: QuotaScope | null,
  strikes: number
): void {
  db.prepare(
    'UPDATE ai_key SET frozen_until = ?, frozen_scope = ?, freeze_strikes = ? WHERE id = ?'
  ).run(until, scope, strikes, keyId)
}

/** Khóa sai thì bỏ qua hẳn, **không** đóng băng theo thời gian (D4/D11). */
export function markKeyInvalid(db: Db, keyId: string): void {
  db.prepare(
    "UPDATE ai_key SET state = 'invalid', frozen_until = NULL, frozen_scope = NULL" +
      ' WHERE id = ?'
  ).run(keyId)
}

/** Gọi sau một lần dùng thành công: khóa sống lại và bộ đếm tăng dần về 0. */
export function clearKeyFreeze(db: Db, keyId: string): void {
  db.prepare(
    "UPDATE ai_key SET state = 'ok', frozen_until = NULL, frozen_scope = NULL," +
      ' freeze_strikes = 0 WHERE id = ?'
  ).run(keyId)
}
