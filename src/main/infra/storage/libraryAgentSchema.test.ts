import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { librarySchema } from './librarySchema'
import { migrate, readPragmas } from './migrate'
import { openDatabase } from './sqlite'

const tempDir = createTempDirs()
const upTo8 = {
  ...librarySchema,
  migrations: librarySchema.migrations.filter((m) => m.version <= 8)
}

function throws(fn: () => unknown): boolean {
  try {
    fn()
    return false
  } catch {
    return true
  }
}

describe('library agent schema', () => {
  it('migrates v8 data and creates constrained app-agent tables', () => {
    const db = openDatabase(join(tempDir(), 'library.db'))
    migrate(db, upTo8)
    db.exec(`
      INSERT INTO work_index
        (id, file_name, title, source_lang, status, archived, chapter_count, created_at, updated_at)
      VALUES ('work', 'work.mira', 'A', 'ja', 'not-started', 0, 0, 1, 2);
      INSERT INTO ai_connection
        (id, name, base_url, enabled, ord, created_at, updated_at)
      VALUES ('connection', 'AI', 'https://example.test/v1', 1, 0, 1, 2);
    `)

    migrate(db, librarySchema)

    expect(readPragmas(db).userVersion).toBe(10)
    expect(db.prepare("SELECT title FROM work_index WHERE id = 'work'").get()).toEqual({
      title: 'A'
    })
    expect(db.prepare("SELECT name FROM ai_connection WHERE id = 'connection'").get()).toEqual({
      name: 'AI'
    })
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'agent_%' ORDER BY name"
      )
      .all<{ name: string }>()
      .map((row) => row.name)
    expect(tables).toEqual([
      'agent_activity',
      'agent_legacy_import',
      'agent_legacy_turn_import',
      'agent_operation',
      'agent_session',
      'agent_turn'
    ])
    db.close()
  })

  it('enforces command, activity sequence, mapping and one-active-turn uniqueness', () => {
    const db = openDatabase(join(tempDir(), 'constraints.db'))
    migrate(db, librarySchema)
    db.exec(`
      INSERT INTO agent_session (id, title, created_at, updated_at) VALUES ('s', '', 1, 1);
      INSERT INTO agent_turn
        (id, session_id, instruction, context_json, status, created_at, updated_at)
      VALUES ('t1', 's', 'one', '{}', 'running', 1, 1);
    `)
    expect(
      throws(() =>
        db.exec(`INSERT INTO agent_turn
          (id, session_id, instruction, context_json, status, created_at, updated_at)
          VALUES ('t2', 's', 'two', '{}', 'queued', 2, 2)`)
      )
    ).toBe(true)
    db.exec("UPDATE agent_turn SET status = 'completed' WHERE id = 't1'")
    db.exec(`INSERT INTO agent_turn
      (id, session_id, instruction, context_json, status, created_at, updated_at)
      VALUES ('t2', 's', 'two', '{}', 'queued', 2, 2)`)
    db.exec(`INSERT INTO agent_operation
      (id, turn_id, command_id, capability, target_json, state, created_at, updated_at)
      VALUES ('o1', 't2', 'command', 'read_chapter', '{}', 'queued', 2, 2)`)
    expect(
      throws(() =>
        db.exec(`INSERT INTO agent_operation
          (id, turn_id, command_id, capability, target_json, state, created_at, updated_at)
          VALUES ('o2', 't2', 'command', 'read_chapter', '{}', 'queued', 2, 2)`)
      )
    ).toBe(true)
    db.exec(`INSERT INTO agent_activity
      (id, turn_id, operation_id, step_seq, kind, state, label, created_at, updated_at)
      VALUES ('a1', 't2', 'o1', 1, 'read', 'running', 'Read', 2, 2)`)
    expect(
      throws(() =>
        db.exec(`INSERT INTO agent_activity
          (id, turn_id, step_seq, kind, state, label, created_at, updated_at)
          VALUES ('a2', 't2', 1, 'read', 'running', 'Again', 2, 2)`)
      )
    ).toBe(true)
    db.close()
  })
})
