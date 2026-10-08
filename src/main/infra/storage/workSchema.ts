import type { SchemaSpec } from './migrate'
import type { Db } from './sqlite'

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

/**
 * Images pasted or dropped into a chapter's translation. There is no attachments folder like
 * Obsidian's vault: each image is a blob in this same file, named by a generated ID that the
 * Markdown embed syntax (`![[id]]`) refers to.
 */
const version5 = `
CREATE TABLE image (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp')),
  data BLOB NOT NULL CHECK (length(data) > 0),
  created_at INTEGER NOT NULL
);
`

/**
 * Story context entries (glossary terms, characters, dyads, world-building, styles, summaries)
 * and their aliases. For Module 3 (glossary), `kind = 'term'` is utilized.
 */
const version6 = `
CREATE TABLE context_entry (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('term', 'character', 'dyad', 'world', 'style', 'summary')),
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  origin TEXT NOT NULL DEFAULT 'user' CHECK (origin IN ('user', 'ai', 'import')),
  forbidden INTEGER NOT NULL DEFAULT 0 CHECK (forbidden IN (0, 1)),
  from_chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  to_chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX context_entry_kind ON context_entry (kind);
CREATE INDEX context_entry_source ON context_entry (source);

CREATE TABLE context_alias (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES context_entry (id) ON DELETE CASCADE,
  form TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (form)
);
CREATE INDEX context_alias_entry ON context_alias (entry_id);
`

/** Persistent AI sessions, proposals and pre-accept checkpoints. Existing text tables are untouched. */
const version7 = `
CREATE TABLE ai_session (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  last_chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX ai_session_updated ON ai_session (updated_at DESC, id);

CREATE TABLE ai_turn (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_session (id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('hoi', 'sua', 'ap_dung')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('sending', 'running', 'done', 'cancelled', 'error', 'interrupted')),
  context_json TEXT NOT NULL DEFAULT '[]',
  target_range_json TEXT,
  tools_json TEXT NOT NULL DEFAULT '[]',
  dropped_turns INTEGER NOT NULL DEFAULT 0 CHECK (dropped_turns >= 0),
  provider TEXT,
  model TEXT,
  usage_json TEXT,
  cost_usd REAL,
  finish_reason TEXT CHECK (finish_reason IN ('stop', 'length', 'tool_calls', 'filter')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX ai_turn_session_order ON ai_turn (session_id, created_at, id);
CREATE INDEX ai_turn_chapter ON ai_turn (chapter_id, created_at);

CREATE TABLE proposal (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  session_id TEXT REFERENCES ai_session (id) ON DELETE SET NULL,
  turn_id TEXT REFERENCES ai_turn (id) ON DELETE SET NULL,
  origin TEXT NOT NULL CHECK (origin IN ('chat', 'translate')),
  policy TEXT NOT NULL CHECK (policy IN ('review', 'auto')),
  source_rev INTEGER NOT NULL CHECK (source_rev >= 0),
  source_hash TEXT NOT NULL,
  target_base_rev INTEGER NOT NULL CHECK (target_base_rev >= 0),
  target_base_content TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '[]',
  context_hash TEXT,
  provider TEXT,
  model TEXT,
  usage_json TEXT,
  run_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (run_key)
);
CREATE INDEX proposal_chapter_order ON proposal (chapter_id, created_at, id);
CREATE INDEX proposal_session_order ON proposal (session_id, created_at, id);

CREATE TABLE proposal_part (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposal (id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  base_from INTEGER CHECK (base_from >= 0),
  base_to INTEGER CHECK (base_to >= base_from),
  before_text TEXT NOT NULL DEFAULT '',
  after_text TEXT NOT NULL,
  source_order INTEGER CHECK (source_order >= 0),
  source_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'rejected', 'conflict', 'stale', 'needs-placement')),
  decision_actor TEXT CHECK (decision_actor IN ('user', 'auto')),
  decision_at INTEGER,
  reason TEXT,
  batch_key TEXT,
  UNIQUE (proposal_id, ordinal),
  UNIQUE (batch_key)
);
CREATE INDEX proposal_part_status ON proposal_part (status, proposal_id, ordinal);

CREATE TABLE text_snapshot (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL UNIQUE,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  before_rev INTEGER NOT NULL CHECK (before_rev >= 0),
  after_rev INTEGER NOT NULL CHECK (after_rev > before_rev),
  before_content TEXT NOT NULL,
  decisions_json TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('user', 'auto')),
  created_at INTEGER NOT NULL,
  undone_at INTEGER
);
CREATE INDEX text_snapshot_chapter_order ON text_snapshot (chapter_id, created_at DESC, id);

CREATE TABLE proposal_accept_command (
  command_id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('parts', 'all')),
  part_ids_json TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('user', 'auto')),
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`

/**
 * Chat actions were stored as Vietnamese codes (`hoi`, `sua`, `ap_dung`); they are now `ask`, `edit`,
 * `apply`. SQLite cannot change a CHECK constraint in place, so `ai_turn` is rebuilt.
 *
 * Dropping the old table fires `proposal.turn_id ON DELETE SET NULL`, which would silently unlink every
 * proposal from its turn. The links are stashed in a temp table first and written back afterwards.
 */
function migrateChatActions(db: Db): void {
  db.exec(`
CREATE TEMP TABLE proposal_turn_link AS SELECT id, turn_id FROM proposal WHERE turn_id IS NOT NULL;

CREATE TABLE ai_turn_next (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_session (id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('ask', 'edit', 'apply')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('sending', 'running', 'done', 'cancelled', 'error', 'interrupted')),
  context_json TEXT NOT NULL DEFAULT '[]',
  target_range_json TEXT,
  tools_json TEXT NOT NULL DEFAULT '[]',
  dropped_turns INTEGER NOT NULL DEFAULT 0 CHECK (dropped_turns >= 0),
  provider TEXT,
  model TEXT,
  usage_json TEXT,
  cost_usd REAL,
  finish_reason TEXT CHECK (finish_reason IN ('stop', 'length', 'tool_calls', 'filter')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO ai_turn_next (
  id, session_id, chapter_id, action, question, answer, status, context_json, target_range_json,
  tools_json, dropped_turns, provider, model, usage_json, cost_usd, finish_reason, created_at, updated_at
)
SELECT
  id, session_id, chapter_id,
  CASE action WHEN 'hoi' THEN 'ask' WHEN 'sua' THEN 'edit' WHEN 'ap_dung' THEN 'apply' ELSE action END,
  question, answer, status, context_json, target_range_json,
  tools_json, dropped_turns, provider, model, usage_json, cost_usd, finish_reason, created_at, updated_at
FROM ai_turn;

DROP TABLE ai_turn;
ALTER TABLE ai_turn_next RENAME TO ai_turn;
CREATE INDEX ai_turn_session_order ON ai_turn (session_id, created_at, id);
CREATE INDEX ai_turn_chapter ON ai_turn (chapter_id, created_at);

UPDATE proposal
SET turn_id = (SELECT link.turn_id FROM proposal_turn_link link WHERE link.id = proposal.id)
WHERE id IN (SELECT id FROM proposal_turn_link);
DROP TABLE proposal_turn_link;
`)
}

/**
 * The approved work context a chapter translation run was planned with, frozen once per run
 * (change `translation-context-snapshot`). Keyed like `proposal.run_key`, but a table of its own: the
 * proposal only appears after the first batch succeeds, and the snapshot must exist before that.
 */
const version9 = `
CREATE TABLE translate_run_context (
  run_key TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX translate_run_context_chapter ON translate_run_context (chapter_id, created_at);
`

/**
 * Chat turns without a mode (change `agentic-chat`): `action` gains `chat`, and a turn records where the
 * user was (`location_json`) instead of a range. SQLite cannot change a CHECK constraint in place, so
 * `ai_turn` is rebuilt the same way `migrateChatActions` did, stashing `proposal.turn_id` first because
 * dropping the old table fires its `ON DELETE SET NULL`.
 */
function migrateAgenticChat(db: Db): void {
  db.exec(`
CREATE TEMP TABLE proposal_turn_link AS SELECT id, turn_id FROM proposal WHERE turn_id IS NOT NULL;

CREATE TABLE ai_turn_next (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_session (id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('ask', 'edit', 'apply', 'chat')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('sending', 'running', 'done', 'cancelled', 'error', 'interrupted')),
  context_json TEXT NOT NULL DEFAULT '[]',
  target_range_json TEXT,
  location_json TEXT,
  tools_json TEXT NOT NULL DEFAULT '[]',
  dropped_turns INTEGER NOT NULL DEFAULT 0 CHECK (dropped_turns >= 0),
  provider TEXT,
  model TEXT,
  usage_json TEXT,
  cost_usd REAL,
  finish_reason TEXT CHECK (finish_reason IN ('stop', 'length', 'tool_calls', 'filter')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO ai_turn_next (
  id, session_id, chapter_id, action, question, answer, status, context_json, target_range_json,
  tools_json, dropped_turns, provider, model, usage_json, cost_usd, finish_reason, created_at, updated_at
)
SELECT
  id, session_id, chapter_id, action, question, answer, status, context_json, target_range_json,
  tools_json, dropped_turns, provider, model, usage_json, cost_usd, finish_reason, created_at, updated_at
FROM ai_turn;

DROP TABLE ai_turn;
ALTER TABLE ai_turn_next RENAME TO ai_turn;
CREATE INDEX ai_turn_session_order ON ai_turn (session_id, created_at, id);
CREATE INDEX ai_turn_chapter ON ai_turn (chapter_id, created_at);

UPDATE proposal
SET turn_id = (SELECT link.turn_id FROM proposal_turn_link link WHERE link.id = proposal.id)
WHERE id IN (SELECT id FROM proposal_turn_link);
DROP TABLE proposal_turn_link;
`)
}

/** What the model thought before answering, shown as "Thought" like Hermes (empty for older turns). */
const version11 = `
ALTER TABLE ai_turn ADD COLUMN reasoning TEXT NOT NULL DEFAULT '';
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
    },
    {
      version: 5,
      up(db) {
        db.exec(version5)
      }
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
    },
    {
      version: 8,
      up(db) {
        migrateChatActions(db)
      }
    },
    {
      version: 9,
      up(db) {
        db.exec(version9)
      }
    },
    {
      version: 10,
      up(db) {
        migrateAgenticChat(db)
      }
    },
    {
      version: 11,
      up(db) {
        db.exec(version11)
      }
    }
  ]
}
