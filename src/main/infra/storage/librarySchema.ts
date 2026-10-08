import { randomUUID } from 'node:crypto'
import type { SchemaSpec } from './migrate'
import type { Db } from './sqlite'

/** "MIRL" in ASCII: the library index, distinct from work files. */
export const LIBRARY_APPLICATION_ID = 0x4d49524c

/**
 * The index is a cache of what work files say, so it can always be rebuilt from `works/*.mira`.
 * It exists only to list works without opening every file.
 */
const version1 = `
CREATE TABLE work_index (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  original_title TEXT,
  description TEXT,
  source_lang TEXT NOT NULL,
  status TEXT NOT NULL,
  archived INTEGER NOT NULL,
  chapter_count INTEGER NOT NULL,
  last_chapter_id TEXT,
  last_chapter_number INTEGER,
  last_chapter_title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX work_index_updated ON work_index (updated_at DESC);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

const version2 = `
ALTER TABLE work_index ADD COLUMN author TEXT;
ALTER TABLE work_index ADD COLUMN genre TEXT;
`

const version3 = `
ALTER TABLE work_index ADD COLUMN cover_version INTEGER;
`

/**
 * Kết nối AI thuộc cả ứng dụng, không thuộc một tác phẩm: khai lại cho mỗi truyện là vô lý, và một
 * tệp `.mira` mang khóa API đi theo lúc backup hay gửi cho người khác là rò rỉ (D3 của change
 * `ai-connection`). `secret` là bản mã của `safeStorage`; khóa dạng rõ không bao giờ nằm ở đây.
 */
const version4 = `
CREATE TABLE ai_connection (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  provider_id TEXT,
  default_model TEXT,
  checked_at INTEGER,
  ord INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX ai_connection_ord ON ai_connection (ord);

CREATE TABLE ai_key (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES ai_connection (id) ON DELETE CASCADE,
  secret BLOB NOT NULL,
  tail TEXT NOT NULL,
  ord INTEGER NOT NULL,
  state TEXT NOT NULL,
  frozen_until INTEGER,
  frozen_scope TEXT,
  freeze_strikes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX ai_key_connection ON ai_key (connection_id, ord);

CREATE TABLE ai_model (
  connection_id TEXT NOT NULL REFERENCES ai_connection (id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  PRIMARY KEY (connection_id, model_id)
);
`

const version5Table = `
CREATE TABLE ai_model (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES ai_connection (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX ai_model_connection ON ai_model (connection_id, ord);
`

/**
 * Model là một **mục** có id riêng, nhân bản được, thay cho cặp `(kết nối, tên model)` (design D1–D2 của
 * change `ai-model-settings`). Hai mục cùng `model_id` hợp lệ, nên khóa chính cũ phải bỏ; SQLite không đổi
 * khóa chính tại chỗ nên bảng được dựng lại. Viết bằng hàm chứ không phải một chuỗi SQL vì mỗi mục cần một
 * uuid, và vì `ai_connection.default_model` (trước là tên model) phải đổi thành id của mục tương ứng.
 *
 * Chạy trong transaction của `migrate`, cùng với việc nâng `user_version`: hỏng giữa chừng thì tệp ở nguyên
 * v4. Mọi mục sinh ra có `settings = '{}'`, tức không gửi gì thêm, nên hành vi không đổi cho tới khi người
 * dùng đặt một tham số.
 */
function version5(db: Db): void {
  const oldModels = db
    .prepare('SELECT connection_id, model_id, ord FROM ai_model ORDER BY connection_id, ord')
    .all<{ connection_id: string; model_id: string; ord: number }>()
  const connections = db
    .prepare('SELECT id, default_model FROM ai_connection')
    .all<{ id: string; default_model: string | null }>()

  db.exec('DROP TABLE ai_model')
  db.exec(version5Table)

  const insert = db.prepare(
    'INSERT INTO ai_model (id, connection_id, name, model_id, ord, settings) VALUES (?, ?, ?, ?, ?, ?)'
  )
  // Mục đầu tiên của mỗi (kết nối, tên model) cũ; dùng để tìm mục mà model mặc định cũ trỏ tới.
  const entryOf = new Map<string, string>()
  const nextOrd = new Map<string, number>()
  const key = (connectionId: string, modelId: string): string => connectionId + '\u0000' + modelId

  for (const row of oldModels) {
    const id = randomUUID()
    insert.run(id, row.connection_id, row.model_id, row.model_id, row.ord, '{}')
    entryOf.set(key(row.connection_id, row.model_id), id)
    nextOrd.set(row.connection_id, Math.max(nextOrd.get(row.connection_id) ?? 0, row.ord + 1))
  }

  const setDefault = db.prepare('UPDATE ai_connection SET default_model = ? WHERE id = ?')
  for (const connection of connections) {
    const modelId = connection.default_model
    if (modelId === null) continue
    if (modelId === '') {
      setDefault.run(null, connection.id)
      continue
    }
    let id = entryOf.get(key(connection.id, modelId))
    if (id === undefined) {
      // Model mặc định không nằm trong danh sách đã chọn (trước đây vẫn dùng được, `targetsOf` đưa nó vào
      // danh sách dịch). Giữ nó dùng được bằng cách tạo mục cho nó, thay vì âm thầm mất mặc định.
      id = randomUUID()
      const ord = nextOrd.get(connection.id) ?? 0
      insert.run(id, connection.id, modelId, modelId, ord, '{}')
      nextOrd.set(connection.id, ord + 1)
    }
    setDefault.run(id, connection.id)
  }
}

/**
 * Ollama gets its own provider id, so Settings › Kết nối AI can file it under "Trên máy" without sniffing
 * the address (change `hermes-settings-modal`, design D4). Only connections that are still on the preset's
 * own address are tagged: one the person pointed elsewhere is theirs to name.
 */
const version6 = `
UPDATE ai_connection SET provider_id = 'ollama'
WHERE provider_id IS NULL AND rtrim(base_url, '/') IN ('http://127.0.0.1:11434/v1', 'http://localhost:11434/v1');
`

/**
 * Account logins (change `subscription-providers`, design D7). A connection is reached with an API key or an
 * account; an account's tokens live in their own table, sealed by `safeStorage` like keys, and there is at
 * most one connection per account provider. `api_mode` says which wire protocol a connection speaks; the
 * default `auto` keeps every existing connection on Chat Completions.
 */
const version7 = `
ALTER TABLE ai_connection ADD COLUMN auth_kind TEXT NOT NULL DEFAULT 'api_key'
  CHECK (auth_kind IN ('api_key', 'oauth'));
ALTER TABLE ai_connection ADD COLUMN oauth_provider TEXT
  CHECK (oauth_provider IN ('codex', 'copilot'));
ALTER TABLE ai_connection ADD COLUMN api_mode TEXT NOT NULL DEFAULT 'auto'
  CHECK (api_mode IN ('auto', 'chat_completions', 'responses', 'anthropic_messages'));
CREATE UNIQUE INDEX ai_connection_oauth_provider ON ai_connection (oauth_provider)
  WHERE oauth_provider IS NOT NULL;

CREATE TABLE ai_oauth_token (
  connection_id TEXT PRIMARY KEY REFERENCES ai_connection (id) ON DELETE CASCADE,
  secret BLOB NOT NULL,
  expires_at INTEGER,
  account_label TEXT,
  state TEXT NOT NULL DEFAULT 'ok' CHECK (state IN ('ok', 'relogin')),
  updated_at INTEGER NOT NULL
);
`

export const librarySchema: SchemaSpec = {
  applicationId: LIBRARY_APPLICATION_ID,
  migrations: [
    {
      version: 1,
      up(db) {
        db.exec(version1)
        db.exec('PRAGMA application_id = ' + LIBRARY_APPLICATION_ID)
      }
    },
    {
      version: 2,
      up(db) {
        db.exec(version2)
      }
    },
    {
      version: 3,
      up(db) {
        db.exec(version3)
      }
    },
    {
      version: 4,
      up(db) {
        db.exec(version4)
      }
    },
    {
      version: 5,
      up: version5
    },
    {
      version: 6,
      up(db) {
        db.exec(version6)
      }
    },
    {
      version: 7,
      up(db) {
        db.exec(version7)
      }
    }
  ]
}
