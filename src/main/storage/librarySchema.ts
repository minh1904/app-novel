import type { SchemaSpec } from './migrate'

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
    }
  ]
}
