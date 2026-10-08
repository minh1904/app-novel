import {
  ENTRY_MODEL_MAX,
  ENTRY_NAME_MAX,
  readModelSettings,
  type ModelSettings
} from '../../../shared/contracts/modelSettings'
import { StorageError } from './errors'
import type { Db } from './sqlite'

/**
 * Kết nối AI và khóa của chúng, lưu trong `library.db` (phạm vi ứng dụng, không theo tác phẩm).
 *
 * Quy tắc xuyên suốt: **không hàm nào ở đây trả khóa dạng rõ**. `ConnectionView` là thứ đi qua IPC
 * và chỉ có bốn ký tự cuối. Bản mã chỉ lấy được bằng `readKeyCiphers`, dùng trong main process để
 * gọi nhà cung cấp (D2 của change `ai-connection`).
 *
 * Model là các **mục** (`ModelEntry`) có id riêng, nhân bản được (change `ai-model-settings`). Ở đây một mục
 * chỉ là dữ liệu đã lưu; khả năng của model (mức suy luận nào được đưa ra) thuộc tầng dịch vụ, nơi biết
 * bảng giá đi kèm bản cài.
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

/** Một model người dùng dùng trong Mira, như đã lưu. Hai mục có thể trỏ cùng một `model`. */
export interface ModelEntry {
  id: string
  /** Tên hiển thị của người dùng; mặc định bằng tên model thật. */
  name: string
  /** Tên model thật gửi cho nhà cung cấp. */
  model: string
  settings: ModelSettings
}

/** How a connection is reached: a pasted API key, or an account login. */
export type AuthKind = 'api_key' | 'oauth'
export type OAuthProvider = 'codex' | 'copilot'
/** Which wire protocol a connection speaks; `auto` decides from the address (design D1). */
export type ApiMode = 'auto' | 'chat_completions' | 'responses' | 'anthropic_messages'

/** The login behind an account connection, as far as it may be shown: never a token. */
export interface AccountView {
  /** The email or login the provider gave, when it gave one. */
  label: string | null
  /** `relogin` once a refresh was refused for good. */
  state: 'ok' | 'relogin'
  expiresAt: number | null
}

export interface ConnectionView {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  authKind: AuthKind
  oauthProvider: OAuthProvider | null
  apiMode: ApiMode
  /** Only for an account connection. */
  account: AccountView | null
  /** Id nhà cung cấp của preset, để tra bảng giá; `null` khi người dùng tự nhập URL. */
  providerId: string | null
  /** Id của **mục** mặc định (không phải tên model); `null` khi chưa chọn. */
  defaultEntryId: string | null
  checkedAt: number | null
  keys: ConnectionKeyView[]
  /** Mục model của kết nối, theo thứ tự người dùng xếp. */
  models: ModelEntry[]
}

export interface ConnectionInput {
  name: string
  baseUrl: string
  providerId?: string | null
  enabled?: boolean
  authKind?: AuthKind
  oauthProvider?: OAuthProvider | null
  apiMode?: ApiMode
}

export interface ConnectionPatch {
  name?: string
  baseUrl?: string
  providerId?: string | null
  enabled?: boolean
  /** Phải là id một mục của chính kết nối này, hoặc `null`. */
  defaultEntryId?: string | null
  checkedAt?: number | null
  apiMode?: ApiMode
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
  auth_kind: string
  oauth_provider: string | null
  api_mode: string
  account_label: string | null
  token_state: string | null
  token_expires: number | null
}

function toApiMode(value: string): ApiMode {
  return value === 'chat_completions' || value === 'responses' || value === 'anthropic_messages'
    ? value
    : 'auto'
}

interface KeyRow {
  id: string
  connection_id: string
  tail: string
  state: string
  frozen_until: number | null
  frozen_scope: string | null
}

interface EntryRow {
  id: string
  connection_id: string
  name: string
  model_id: string
  settings: string
}

/**
 * Cài đặt đọc không bao giờ ném: dữ liệu có thể hỏng hoặc do một bản sau ghi. Trường hỏng bị bỏ riêng
 * trường đó (không gửi giá trị hỏng cho nhà cung cấp) và mục vẫn dùng được. Kho không có chỗ ghi log nên
 * `dropped` không đi đâu; tầng dưới không thể nói gì với người dùng về nó.
 */
function toEntry(row: EntryRow): ModelEntry {
  return {
    id: row.id,
    name: row.name,
    model: row.model_id,
    settings: readModelSettings(row.settings).settings
  }
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
      'SELECT c.id, c.name, c.base_url, c.enabled, c.provider_id, c.default_model, c.checked_at,' +
        ' c.auth_kind, c.oauth_provider, c.api_mode, t.account_label, t.state AS token_state,' +
        ' t.expires_at AS token_expires' +
        ' FROM ai_connection c LEFT JOIN ai_oauth_token t ON t.connection_id = c.id' +
        ' ORDER BY c.ord, c.created_at'
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
    .prepare(
      'SELECT id, connection_id, name, model_id, settings FROM ai_model' +
        ' ORDER BY connection_id, ord'
    )
    .all<EntryRow>()

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    enabled: row.enabled !== 0,
    authKind: row.auth_kind === 'oauth' ? 'oauth' : 'api_key',
    oauthProvider:
      row.oauth_provider === 'codex' || row.oauth_provider === 'copilot'
        ? row.oauth_provider
        : null,
    apiMode: toApiMode(row.api_mode),
    account:
      row.auth_kind === 'oauth'
        ? {
            label: row.account_label,
            state: row.token_state === 'relogin' ? 'relogin' : 'ok',
            expiresAt: row.token_expires
          }
        : null,
    providerId: row.provider_id,
    defaultEntryId: row.default_model,
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
    models: models.filter((model) => model.connection_id === row.id).map(toEntry)
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
      ' checked_at, ord, created_at, updated_at, auth_kind, oauth_provider, api_mode)' +
      ' VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    name,
    baseUrl,
    input.enabled === false ? 0 : 1,
    input.providerId ?? null,
    ord,
    now,
    now,
    input.authKind ?? 'api_key',
    input.oauthProvider ?? null,
    input.apiMode ?? 'auto'
  )
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

  const defaultEntryId =
    patch.defaultEntryId === undefined ? current.defaultEntryId : patch.defaultEntryId
  // Một mục của kết nối khác, hay một id không còn, làm "mặc định" trỏ vào khoảng không. Chỉ kiểm khi lần
  // này có đặt nó: sửa tên một kết nối không được vướng vì một mặc định cũ hỏng.
  if (
    patch.defaultEntryId !== undefined &&
    patch.defaultEntryId !== null &&
    !current.models.some((entry) => entry.id === patch.defaultEntryId)
  ) {
    throw new StorageError('not_found', 'Mục model này không thuộc kết nối.')
  }

  db.prepare(
    'UPDATE ai_connection SET name = ?, base_url = ?, enabled = ?, provider_id = ?,' +
      ' default_model = ?, checked_at = ?, api_mode = ?, updated_at = ? WHERE id = ?'
  ).run(
    name,
    baseUrl,
    (patch.enabled ?? current.enabled) ? 1 : 0,
    patch.providerId === undefined ? current.providerId : patch.providerId,
    defaultEntryId,
    patch.checkedAt === undefined ? current.checkedAt : patch.checkedAt,
    patch.apiMode ?? current.apiMode,
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

export interface ModelEntryInput {
  /** Tên model thật gửi cho nhà cung cấp. Gõ tay được, kể cả khi endpoint không liệt kê nó. */
  model: string
  /** Tên hiển thị; thiếu thì bằng tên model. */
  name?: string
  settings?: ModelSettings
}

export interface ModelEntryPatch {
  name?: string
  model?: string
  /** Thay **cả bộ** cài đặt; nơi gọi ghép phần của từng hộp thoại lên bộ hiện có. */
  settings?: ModelSettings
}

function cleanModel(value: string): string {
  const model = value.trim()
  if (model === '') throw new StorageError('validation', 'Tên model không được để trống.')
  if (model.length > ENTRY_MODEL_MAX) throw new StorageError('validation', 'Tên model quá dài.')
  return model
}

function cleanName(value: string): string {
  const name = value.trim()
  if (name === '') throw new StorageError('validation', 'Tên mục không được để trống.')
  if (name.length > ENTRY_NAME_MAX) throw new StorageError('validation', 'Tên mục quá dài.')
  return name
}

function entryRow(db: Db, entryId: string): EntryRow {
  const row = db
    .prepare('SELECT id, connection_id, name, model_id, settings FROM ai_model WHERE id = ?')
    .get<EntryRow>(entryId)
  if (!row) throw new StorageError('not_found', 'Không có mục model này.')
  return row
}

/**
 * Một mục của một kết nối. Mục của kết nối khác cũng là `not_found`: dịch và chat nhận id mục từ giao
 * diện, và id đó không được dẫn tới model của một kết nối mà người dùng không chọn.
 */
export function getModelEntry(db: Db, connectionId: string, entryId: string): ModelEntry {
  const row = entryRow(db, entryId)
  if (row.connection_id !== connectionId) {
    throw new StorageError('not_found', 'Mục model này không thuộc kết nối.')
  }
  return toEntry(row)
}

/**
 * Một mục và kết nối của nó, khi chỉ biết id mục. Giao diện sửa, nhân bản, xóa và kiểm tra một mục chỉ gửi
 * id của nó; kết nối là thứ phải tra ra.
 */
export function findModelEntry(
  db: Db,
  entryId: string
): { connectionId: string; entry: ModelEntry } {
  const row = entryRow(db, entryId)
  return { connectionId: row.connection_id, entry: toEntry(row) }
}

/** Thêm một mục vào cuối danh sách. Hai mục cùng tên model thật là hợp lệ. */
export function addModelEntry(
  db: Db,
  connectionId: string,
  entryId: string,
  input: ModelEntryInput
): ConnectionView {
  getConnection(db, connectionId)
  const model = cleanModel(input.model)
  const name = cleanName(input.name ?? model)
  const ord = nextOrd(
    db,
    'SELECT MAX(ord) + 1 AS next FROM ai_model WHERE connection_id = ?',
    connectionId
  )
  db.prepare(
    'INSERT INTO ai_model (id, connection_id, name, model_id, ord, settings)' +
      ' VALUES (?, ?, ?, ?, ?, ?)'
  ).run(entryId, connectionId, name, model, ord, JSON.stringify(input.settings ?? {}))
  return getConnection(db, connectionId)
}

/** Sửa tên, tên model thật hoặc cài đặt của một mục; trường không nêu thì giữ nguyên. Chỉ đụng mục này. */
export function updateModelEntry(db: Db, entryId: string, patch: ModelEntryPatch): ConnectionView {
  const row = entryRow(db, entryId)
  const name = patch.name === undefined ? row.name : cleanName(patch.name)
  const model = patch.model === undefined ? row.model_id : cleanModel(patch.model)
  const settings = patch.settings === undefined ? row.settings : JSON.stringify(patch.settings)
  db.prepare('UPDATE ai_model SET name = ?, model_id = ?, settings = ? WHERE id = ?').run(
    name,
    model,
    settings,
    entryId
  )
  return getConnection(db, row.connection_id)
}

/**
 * Nhân bản một mục: cùng tên model thật và cùng cài đặt, id mới, đặt ngay sau bản gốc. Tên thêm "(bản sao)"
 * để hai mục không giống hệt nhau trong menu chọn.
 */
export function duplicateModelEntry(db: Db, entryId: string, newId: string): ConnectionView {
  const row = entryRow(db, entryId)
  const suffix = ' (bản sao)'
  const name = row.name.slice(0, ENTRY_NAME_MAX - suffix.length) + suffix
  const ord = (
    db.prepare('SELECT ord FROM ai_model WHERE id = ?').get<{ ord: number }>(entryId) as {
      ord: number
    }
  ).ord
  db.transaction(() => {
    // Chừa chỗ ngay sau bản gốc; thứ tự của các mục sau đó giữ nguyên tương đối.
    db.prepare('UPDATE ai_model SET ord = ord + 1 WHERE connection_id = ? AND ord > ?').run(
      row.connection_id,
      ord
    )
    db.prepare(
      'INSERT INTO ai_model (id, connection_id, name, model_id, ord, settings)' +
        ' VALUES (?, ?, ?, ?, ?, ?)'
    ).run(newId, row.connection_id, name, row.model_id, ord + 1, row.settings)
  })
  return getConnection(db, row.connection_id)
}

/** Xóa một mục. Nếu nó là mục mặc định thì kết nối về không có mặc định, thay vì trỏ vào chỗ trống. */
export function deleteModelEntry(db: Db, entryId: string): ConnectionView {
  const row = entryRow(db, entryId)
  db.transaction(() => {
    db.prepare(
      'UPDATE ai_connection SET default_model = NULL WHERE id = ? AND default_model = ?'
    ).run(row.connection_id, entryId)
    db.prepare('DELETE FROM ai_model WHERE id = ?').run(entryId)
  })
  return getConnection(db, row.connection_id)
}

/**
 * Xếp lại thứ tự các mục của một kết nối. `orderedIds` phải đúng là các mục đang có, mỗi mục một lần: thiếu
 * hay thừa một id nghĩa là giao diện đang xếp một danh sách đã cũ, và đoán thứ tự cho phần còn lại sẽ làm
 * mục nào đó nhảy chỗ mà người dùng không hay.
 */
export function reorderModelEntries(
  db: Db,
  connectionId: string,
  orderedIds: string[]
): ConnectionView {
  const current = getConnection(db, connectionId).models.map((entry) => entry.id)
  const same =
    orderedIds.length === current.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => current.includes(id))
  if (!same) {
    throw new StorageError(
      'validation',
      'Danh sách mục không khớp với những gì đang có. Hãy mở lại.'
    )
  }
  db.transaction(() => {
    const update = db.prepare('UPDATE ai_model SET ord = ? WHERE id = ?')
    orderedIds.forEach((id, index) => update.run(index, id))
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
