import type { SchemaSpec } from './migrate'

/** "MIRA" in ASCII. A constant of the file format: never change it once users have data. */
export const WORK_APPLICATION_ID = 0x4d495241

/**
 * Schema of one work file (`works/<id>.mira`). Column and table names avoid SQL keywords
 * (`end`, `text`) so no query needs quoting.
 */
const version1 = `
CREATE TABLE work (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  original_title TEXT,
  description TEXT,
  cover_path TEXT,
  source_lang TEXT NOT NULL CHECK (source_lang IN ('en', 'zh-Hans', 'zh-Hant', 'ja')),
  target_lang TEXT NOT NULL DEFAULT 'vi' CHECK (target_lang = 'vi'),
  status TEXT NOT NULL DEFAULT 'not-started'
    CHECK (status IN ('not-started', 'in-progress', 'paused')),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  last_chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- A work file describes exactly one work.
CREATE UNIQUE INDEX work_singleton ON work ((1));

CREATE TABLE chapter (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX chapter_position ON chapter (position);

CREATE TABLE chapter_text (
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('source', 'target')),
  content TEXT NOT NULL DEFAULT '',
  rev INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (chapter_id, side)
);

CREATE TABLE segment (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('source', 'target')),
  position INTEGER NOT NULL,
  start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
  end_offset INTEGER NOT NULL CHECK (end_offset >= start_offset),
  text_rev INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'dirty', 'orphaned')),
  anchor_text TEXT
);
CREATE INDEX segment_order ON segment (chapter_id, side, position);

CREATE TABLE link (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('ai', 'user')),
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'needs_review', 'broken')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX link_chapter ON link (chapter_id);

CREATE TABLE link_member (
  link_id TEXT NOT NULL REFERENCES link (id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES segment (id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (link_id, segment_id)
);
CREATE INDEX link_member_segment ON link_member (segment_id);

CREATE TABLE provenance (
  segment_id TEXT PRIMARY KEY REFERENCES segment (id) ON DELETE CASCADE,
  origin TEXT NOT NULL CHECK (origin IN ('human', 'ai', 'mock', 'import')),
  provider TEXT,
  model TEXT,
  at INTEGER NOT NULL
);

-- Deleting a segment must not silently drop the alignment it took part in.
CREATE TRIGGER segment_delete_flags_links BEFORE DELETE ON segment
BEGIN
  UPDATE link SET status = 'needs_review'
  WHERE status = 'ok'
    AND id IN (SELECT link_id FROM link_member WHERE segment_id = OLD.id);
END;
`

/** Author and genre give the translator model context about the work. Both are optional. */
const version2 = `
ALTER TABLE work ADD COLUMN author TEXT;
ALTER TABLE work ADD COLUMN genre TEXT;
`

/**
 * The cover lives inside the work file so backing up one file backs up everything. The older
 * `work.cover_path` column from version 1 is unused and kept only because SQLite cannot drop it
 * without rebuilding the table.
 */
const version3 = `
CREATE TABLE cover (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mime TEXT NOT NULL CHECK (mime = 'image/jpeg'),
  data BLOB NOT NULL CHECK (length(data) > 0),
  updated_at INTEGER NOT NULL
);
`

/**
 * Whether a side of a chapter has text is needed for every row of the chapter list. In a row the
 * text comes before any later column, so reading even `rev` means walking the overflow pages of a
 * long chapter (measured: about 400 ms for 5,000 chapters). `size` is a small copy of the text
 * length, and the index below holds it next to the key, so the list is answered from the index
 * alone. The application keeps `size` equal to the text length in the same transaction.
 */
const version4 = `
ALTER TABLE chapter_text ADD COLUMN size INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0);
UPDATE chapter_text SET size = length(content);
CREATE INDEX chapter_text_presence ON chapter_text (chapter_id, side, size);
`

export const workSchema: SchemaSpec = {
  applicationId: WORK_APPLICATION_ID,
  migrations: [
    {
      version: 1,
      up(db) {
        db.exec(version1)
        db.exec('PRAGMA application_id = ' + WORK_APPLICATION_ID)
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
