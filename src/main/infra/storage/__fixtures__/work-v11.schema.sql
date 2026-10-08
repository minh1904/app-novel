-- index ai_session_updated
CREATE INDEX ai_session_updated ON ai_session (updated_at DESC, id);

-- index ai_turn_chapter
CREATE INDEX ai_turn_chapter ON ai_turn (chapter_id, created_at);

-- index ai_turn_session_order
CREATE INDEX ai_turn_session_order ON ai_turn (session_id, created_at, id);

-- index chapter_position
CREATE INDEX chapter_position ON chapter (position);

-- index chapter_text_presence
CREATE INDEX chapter_text_presence ON chapter_text (chapter_id, side, size);

-- index context_alias_entry
CREATE INDEX context_alias_entry ON context_alias (entry_id);

-- index context_entry_kind
CREATE INDEX context_entry_kind ON context_entry (kind);

-- index context_entry_source
CREATE INDEX context_entry_source ON context_entry (source);

-- index link_chapter
CREATE INDEX link_chapter ON link (chapter_id);

-- index link_member_segment
CREATE INDEX link_member_segment ON link_member (segment_id);

-- index proposal_chapter_order
CREATE INDEX proposal_chapter_order ON proposal (chapter_id, created_at, id);

-- index proposal_part_status
CREATE INDEX proposal_part_status ON proposal_part (status, proposal_id, ordinal);

-- index proposal_session_order
CREATE INDEX proposal_session_order ON proposal (session_id, created_at, id);

-- index segment_order
CREATE INDEX segment_order ON segment (chapter_id, side, position);

-- index text_snapshot_chapter_order
CREATE INDEX text_snapshot_chapter_order ON text_snapshot (chapter_id, created_at DESC, id);

-- index translate_run_context_chapter
CREATE INDEX translate_run_context_chapter ON translate_run_context (chapter_id, created_at);

-- index work_singleton
CREATE UNIQUE INDEX work_singleton ON work ((1));

-- table ai_session
CREATE TABLE ai_session (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  last_chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- table ai_turn
CREATE TABLE "ai_turn" (
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
, reasoning TEXT NOT NULL DEFAULT '');

-- table chapter
CREATE TABLE chapter (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- table chapter_text
CREATE TABLE chapter_text (
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('source', 'target')),
  content TEXT NOT NULL DEFAULT '',
  rev INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL, size INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0),
  PRIMARY KEY (chapter_id, side)
);

-- table context_alias
CREATE TABLE context_alias (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES context_entry (id) ON DELETE CASCADE,
  form TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (form)
);

-- table context_entry
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

-- table cover
CREATE TABLE cover (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mime TEXT NOT NULL CHECK (mime = 'image/jpeg'),
  data BLOB NOT NULL CHECK (length(data) > 0),
  updated_at INTEGER NOT NULL
);

-- table image
CREATE TABLE image (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp')),
  data BLOB NOT NULL CHECK (length(data) > 0),
  created_at INTEGER NOT NULL
);

-- table link
CREATE TABLE link (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('ai', 'user')),
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'needs_review', 'broken')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);

-- table link_member
CREATE TABLE link_member (
  link_id TEXT NOT NULL REFERENCES link (id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES segment (id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (link_id, segment_id)
);

-- table proposal
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

-- table proposal_accept_command
CREATE TABLE proposal_accept_command (
  command_id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('parts', 'all')),
  part_ids_json TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('user', 'auto')),
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- table proposal_part
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

-- table provenance
CREATE TABLE provenance (
  segment_id TEXT PRIMARY KEY REFERENCES segment (id) ON DELETE CASCADE,
  origin TEXT NOT NULL CHECK (origin IN ('human', 'ai', 'mock', 'import')),
  provider TEXT,
  model TEXT,
  at INTEGER NOT NULL
);

-- table segment
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

-- table text_snapshot
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

-- table translate_run_context
CREATE TABLE translate_run_context (
  run_key TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- table work
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
, author TEXT, genre TEXT);

-- trigger segment_delete_flags_links
CREATE TRIGGER segment_delete_flags_links BEFORE DELETE ON segment
BEGIN
  UPDATE link SET status = 'needs_review'
  WHERE status = 'ok'
    AND id IN (SELECT link_id FROM link_member WHERE segment_id = OLD.id);
END;
