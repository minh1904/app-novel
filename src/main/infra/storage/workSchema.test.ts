import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrate, readPragmas } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { createTempDirs } from '../../testing/testing'
import { WORK_APPLICATION_ID, workSchema } from './workSchema'

const tempDir = createTempDirs()

function fresh(): Db {
  const db = openDatabase(join(tempDir(), 'work.mira'))
  migrate(db, workSchema)
  db.exec(
    `INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w', 'T', 'en', 1, 1);
     INSERT INTO chapter (id, position, created_at, updated_at) VALUES ('c', 0, 1, 1)`
  )
  return db
}

const thrown = (fn: () => unknown): boolean => {
  try {
    fn()
  } catch {
    return true
  }
  return false
}

describe('work schema', () => {
  it('stamps the Mira application id and the latest schema version', () => {
    const db = openDatabase(join(tempDir(), 'work.mira'))
    migrate(db, workSchema)
    expect(readPragmas(db)).toEqual({ userVersion: 6, applicationId: WORK_APPLICATION_ID })
    db.close()
  })

  it('allows exactly one work per file', () => {
    const db = fresh()
    expect(
      thrown(() =>
        db.exec(
          "INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('x', 'U', 'en', 1, 1)"
        )
      )
    ).toBe(true)
    db.close()
  })

  it('enforces languages, statuses and a non-blank title', () => {
    const db = fresh()
    expect(thrown(() => db.exec("UPDATE work SET source_lang = 'fr'"))).toBe(true)
    expect(thrown(() => db.exec("UPDATE work SET status = 'done'"))).toBe(true)
    expect(thrown(() => db.exec("UPDATE work SET title = '   '"))).toBe(true)
    expect(thrown(() => db.exec("UPDATE work SET target_lang = 'en'"))).toBe(true)
    db.close()
  })

  it('cascades a chapter delete to its texts, segments and links', () => {
    const db = fresh()
    db.exec(
      `INSERT INTO chapter_text (chapter_id, side, updated_at) VALUES ('c', 'source', 1);
       INSERT INTO segment (id, chapter_id, side, position, start_offset, end_offset, text_rev)
         VALUES ('s1', 'c', 'source', 0, 0, 5, 0);
       INSERT INTO link (id, chapter_id, kind, created_at) VALUES ('l1', 'c', 'ai', 1);
       INSERT INTO link_member (link_id, segment_id) VALUES ('l1', 's1')`
    )
    db.exec("DELETE FROM chapter WHERE id = 'c'")
    for (const table of ['chapter_text', 'segment', 'link', 'link_member']) {
      expect(db.prepare('SELECT count(*) AS n FROM ' + table).get<{ n: number }>()!.n).toBe(0)
    }
    db.close()
  })

  it('flags a link as needs_review instead of dropping it when a member segment is deleted', () => {
    const db = fresh()
    db.exec(
      `INSERT INTO segment (id, chapter_id, side, position, start_offset, end_offset, text_rev)
         VALUES ('s1', 'c', 'source', 0, 0, 5, 0), ('t1', 'c', 'target', 0, 0, 4, 0);
       INSERT INTO link (id, chapter_id, kind, created_at) VALUES ('l1', 'c', 'ai', 1);
       INSERT INTO link_member (link_id, segment_id) VALUES ('l1', 's1'), ('l1', 't1');
       DELETE FROM segment WHERE id = 's1'`
    )
    const link = db.prepare("SELECT status FROM link WHERE id = 'l1'").get<{ status: string }>()
    expect(link?.status).toBe('needs_review')
    const members = db.prepare('SELECT segment_id FROM link_member').all<{ segment_id: string }>()
    expect(members.map((m) => m.segment_id)).toEqual(['t1'])
    db.close()
  })

  it('rejects an inverted segment range and a link to a missing segment', () => {
    const db = fresh()
    expect(
      thrown(() =>
        db.exec(
          `INSERT INTO segment (id, chapter_id, side, position, start_offset, end_offset, text_rev)
           VALUES ('bad', 'c', 'source', 0, 5, 2, 0)`
        )
      )
    ).toBe(true)
    db.exec("INSERT INTO link (id, chapter_id, kind, created_at) VALUES ('l1', 'c', 'ai', 1)")
    expect(
      thrown(() => db.exec("INSERT INTO link_member (link_id, segment_id) VALUES ('l1', 'nope')"))
    ).toBe(true)
    db.close()
  })

  it('rejects an image with an unaccepted mime or empty bytes', () => {
    const db = fresh()
    expect(
      thrown(() =>
        db.exec(
          "INSERT INTO image (id, mime, data, created_at) VALUES ('i1', 'image/svg+xml', x'00', 1)"
        )
      )
    ).toBe(true)
    expect(
      thrown(() =>
        db.exec("INSERT INTO image (id, mime, data, created_at) VALUES ('i1', 'image/png', x'', 1)")
      )
    ).toBe(true)
    db.exec(
      "INSERT INTO image (id, mime, data, created_at) VALUES ('i1', 'image/png', x'89504e47', 1)"
    )
    expect(db.prepare('SELECT count(*) AS n FROM image').get<{ n: number }>()!.n).toBe(1)
    db.close()
  })

  it('keeps the work when its last chapter pointer is cleared by deleting that chapter', () => {
    const db = fresh()
    db.exec("UPDATE work SET last_chapter_id = 'c'")
    db.exec("DELETE FROM chapter WHERE id = 'c'")
    expect(
      db.prepare('SELECT last_chapter_id AS id FROM work').get<{ id: string | null }>()!.id
    ).toBeNull()
    db.close()
  })

  it('migrates an existing v5 database to v6 preserving data and creating context tables', () => {
    const path = join(tempDir(), 'v5_to_v6.mira')
    const db = openDatabase(path)
    // Run up to version 5
    migrate(db, {
      applicationId: WORK_APPLICATION_ID,
      migrations: workSchema.migrations.slice(0, 5)
    })
    expect(readPragmas(db).userVersion).toBe(5)
    db.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w1', 'Tiêu đề', 'zh-Hans', 1, 1);
      INSERT INTO chapter (id, position, title, created_at, updated_at) VALUES ('c1', 0, 'Chương 1', 1, 1);
    `)

    // Upgrade to full schema (version 6)
    migrate(db, workSchema)
    expect(readPragmas(db).userVersion).toBe(6)

    // Data preserved
    const row = db.prepare('SELECT title FROM work WHERE id = ?').get<{ title: string }>('w1')
    expect(row?.title).toBe('Tiêu đề')

    // Context tables functional
    db.exec(`
      INSERT INTO context_entry (id, kind, source, target, status, origin, forbidden, from_chapter_id, to_chapter_id, notes, created_at, updated_at)
      VALUES ('e1', 'term', '筑基', 'Trúc Cơ', 'approved', 'user', 0, 'c1', 'c1', 'Cảnh giới', 1, 1);
      INSERT INTO context_alias (id, entry_id, form, created_at)
      VALUES ('a1', 'e1', 'Trúc Cơ Kỳ', 1);
    `)
    const entry = db.prepare('SELECT * FROM context_entry WHERE id = ?').get<{ source: string }>('e1')
    expect(entry?.source).toBe('筑基')

    const alias = db.prepare('SELECT * FROM context_alias WHERE id = ?').get<{ form: string }>('a1')
    expect(alias?.form).toBe('Trúc Cơ Kỳ')
    db.close()
  })

  it('cascades context_entry deletion to aliases and sets chapter references to null', () => {
    const db = fresh()
    db.exec(`
      INSERT INTO context_entry (id, kind, source, target, status, origin, forbidden, from_chapter_id, to_chapter_id, created_at, updated_at)
      VALUES ('e1', 'term', '韩立', 'Hàn Lập', 'approved', 'user', 0, 'c', 'c', 1, 1);
      INSERT INTO context_alias (id, entry_id, form, created_at)
      VALUES ('a1', 'e1', 'Lập Ca', 1);
    `)

    // Deleting chapter nullifies from_chapter_id and to_chapter_id
    db.exec("DELETE FROM chapter WHERE id = 'c'")
    const entryAfterChapDel = db.prepare('SELECT from_chapter_id, to_chapter_id FROM context_entry WHERE id = ?').get<{
      from_chapter_id: string | null
      to_chapter_id: string | null
    }>('e1')
    expect(entryAfterChapDel?.from_chapter_id).toBeNull()
    expect(entryAfterChapDel?.to_chapter_id).toBeNull()

    // Deleting context_entry cascades to context_alias
    db.exec("DELETE FROM context_entry WHERE id = 'e1'")
    const countAlias = db.prepare('SELECT count(*) as count FROM context_alias WHERE entry_id = ?').get<{ count: number }>('e1')
    expect(countAlias?.count).toBe(0)

    db.close()
  })

  it('enforces context_alias unique form constraint', () => {
    const db = fresh()
    db.exec(`
      INSERT INTO context_entry (id, kind, source, target, created_at, updated_at)
      VALUES ('e1', 'term', 's1', 't1', 1, 1), ('e2', 'term', 's2', 't2', 1, 1);
      INSERT INTO context_alias (id, entry_id, form, created_at)
      VALUES ('a1', 'e1', 'alias1', 1);
    `)
    expect(
      thrown(() =>
        db.exec("INSERT INTO context_alias (id, entry_id, form, created_at) VALUES ('a2', 'e2', 'alias1', 1)")
      )
    ).toBe(true)
    db.close()
  })
})
