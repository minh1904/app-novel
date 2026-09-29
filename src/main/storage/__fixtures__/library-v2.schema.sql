-- index work_index_updated
CREATE INDEX work_index_updated ON work_index (updated_at DESC);

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
, author TEXT, genre TEXT);
