-- index ai_connection_ord
CREATE INDEX ai_connection_ord ON ai_connection (ord);

-- index ai_key_connection
CREATE INDEX ai_key_connection ON ai_key (connection_id, ord);

-- index work_index_updated
CREATE INDEX work_index_updated ON work_index (updated_at DESC);

-- table ai_connection
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

-- table ai_key
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

-- table ai_model
CREATE TABLE ai_model (
  connection_id TEXT NOT NULL REFERENCES ai_connection (id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  PRIMARY KEY (connection_id, model_id)
);

-- table meta
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- table work_index
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
, author TEXT, genre TEXT, cover_version INTEGER);
