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
    }
  ]
}
