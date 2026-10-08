import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { createProposal, getProposal, latestTextSnapshot } from '../../infra/storage/aiProposals'
import { migrate } from '../../infra/storage/migrate'
import { openDatabase, type Db } from '../../infra/storage/sqlite'
import { readText } from '../../infra/storage/textFile'
import { workSchema } from '../../infra/storage/workSchema'
import {
  acceptAllChapterParts,
  acceptProposalParts,
  denyProposalPart,
  textHash,
  undoLatestAccept,
  type AcceptInput
} from './proposalService'

const tempDir = createTempDirs()
let counter = 0
const newId = (): string => 'generated-' + ++counter

function fresh(): Db {
  const db = openDatabase(join(tempDir(), 'service.mira'))
  migrate(db, workSchema)
  db.exec(`
    INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w', 'T', 'ja', 1, 1);
    INSERT INTO chapter (id, position, created_at, updated_at) VALUES ('c1', 0, 1, 1), ('c2', 1, 1, 1);
    INSERT INTO chapter_text (chapter_id, side, content, rev, updated_at, size)
      VALUES ('c1', 'source', '原文', 1, 1, 2), ('c1', 'target', 'Một\nHai', 1, 1, 7),
             ('c2', 'source', '別文', 1, 1, 2), ('c2', 'target', 'Khác', 1, 1, 4);
  `)
  return db
}

function add(
  db: Db,
  id = 'p',
  chapterId = 'c1',
  base = 'Một\nHai',
  before = 'Hai',
  after = 'Mới'
): void {
  const from = base.indexOf(before)
  createProposal(db, {
    id,
    chapterId,
    origin: 'chat',
    policy: 'review',
    sourceRev: 1,
    sourceHash: textHash(chapterId === 'c1' ? '原文' : '別文'),
    targetBaseRev: 1,
    targetBaseContent: base,
    now: 2,
    parts: [
      {
        id: id + '-part',
        baseFrom: from,
        baseTo: from + before.length,
        beforeText: before,
        afterText: after
      }
    ]
  })
}

const command = (partIds: string[], actor: 'user' | 'auto' = 'user'): AcceptInput => ({
  chapterId: 'c1',
  partIds,
  commandId: 'command',
  actor,
  now: 3,
  newId
})

describe('proposal acceptance', () => {
  it('accepts through one transaction, records a checkpoint and returns the same result on retry', () => {
    const db = fresh()
    add(db)
    const first = acceptProposalParts(db, command(['p-part']))
    expect(first).toMatchObject({ accepted: ['p-part'], content: 'Một\nMới', rev: 2 })
    expect(getProposal(db, 'p').parts[0].status).toBe('applied')
    expect(latestTextSnapshot(db, 'c1')?.beforeContent).toBe('Một\nHai')
    expect(acceptProposalParts(db, command(['p-part']))).toEqual(first)
    expect(readText(db, 'c1', 'target').rev).toBe(2)
    db.close()
  })

  it('direct apply leaves a changed target and source for review', () => {
    const db = fresh()
    add(db)
    db.exec(
      "UPDATE chapter_text SET content = 'Đã sửa', rev = 2, size = 6 WHERE chapter_id = 'c1' AND side = 'target'"
    )
    const targetChanged = acceptProposalParts(db, command(['p-part'], 'auto'))
    expect(targetChanged.accepted).toEqual([])
    expect(targetChanged.skipped[0].reason).toBe('target-changed')
    expect(readText(db, 'c1', 'target').content).toBe('Đã sửa')

    add(db, 'p2')
    db.exec(
      "UPDATE chapter_text SET content = '源文', rev = 2, size = 2 WHERE chapter_id = 'c1' AND side = 'source'"
    )
    const sourceChanged = acceptProposalParts(db, {
      ...command(['p2-part'], 'auto'),
      commandId: 'source-command'
    })
    expect(sourceChanged.accepted).toEqual([])
    expect(sourceChanged.skipped[0].reason).toBe('source-changed')
    db.close()
  })

  it('remembers a skipped command even if the document changes before IPC retry', () => {
    const db = fresh()
    add(db)
    db.exec(
      "UPDATE chapter_text SET content = 'Đã sửa', rev = 2, size = 6 WHERE chapter_id = 'c1' AND side = 'target'"
    )
    const first = acceptProposalParts(db, { ...command(['p-part'], 'auto'), commandId: 'skipped' })
    expect(first).toMatchObject({ accepted: [], rev: 2, content: 'Đã sửa' })
    expect(first.skipped[0].reason).toBe('target-changed')
    db.exec(
      "UPDATE chapter_text SET content = 'Một\nHai', rev = 3, size = 7 WHERE chapter_id = 'c1' AND side = 'target'"
    )
    expect(
      acceptProposalParts(db, { ...command(['p-part'], 'auto'), commandId: 'skipped' })
    ).toEqual(first)
    expect(readText(db, 'c1', 'target').rev).toBe(3)
    expect(latestTextSnapshot(db, 'c1')).toBeNull()
    expect(() => acceptProposalParts(db, { ...command([]), commandId: 'skipped' })).toThrow()
    db.close()
  })

  it('accept all touches only the requested chapter and skips conflicts', () => {
    const db = fresh()
    add(db)
    add(db, 'other', 'c2', 'Khác', 'Khác', 'Mới')
    createProposal(db, {
      id: 'conflict',
      chapterId: 'c1',
      origin: 'chat',
      policy: 'review',
      sourceRev: 1,
      sourceHash: textHash('原文'),
      targetBaseRev: 1,
      targetBaseContent: 'Một\nHai',
      now: 2,
      parts: [
        { id: 'conflict-part', baseFrom: 4, baseTo: 7, beforeText: 'Hai', afterText: 'Xung đột' }
      ]
    })
    const result = acceptAllChapterParts(db, {
      chapterId: 'c1',
      commandId: 'all',
      actor: 'user',
      now: 3,
      newId
    })
    expect(result.accepted).toEqual([])
    expect(result.skipped).toHaveLength(2)
    expect(readText(db, 'c2', 'target').content).toBe('Khác')
    expect(getProposal(db, 'other').parts[0].status).toBe('pending')
    expect(
      acceptAllChapterParts(db, { chapterId: 'c1', commandId: 'all', actor: 'user', now: 4, newId })
    ).toEqual(result)
    db.close()
  })

  it('accept all writes a valid part while leaving a changed part and another chapter alone', () => {
    const db = fresh()
    add(db, 'valid', 'c1', 'Một\nHai', 'Một', 'Mới')
    add(db, 'changed', 'c1', 'Cũ\nHai', 'Cũ', 'Sai')
    add(db, 'other', 'c2', 'Khác', 'Khác', 'Đổi')
    const result = acceptAllChapterParts(db, {
      chapterId: 'c1',
      commandId: 'mixed-all',
      actor: 'user',
      now: 3,
      newId
    })
    expect(result.accepted).toEqual(['valid-part'])
    expect(result.skipped).toEqual([{ partId: 'changed-part', reason: 'target-changed' }])
    expect(readText(db, 'c1', 'target').content).toBe('Mới\nHai')
    expect(readText(db, 'c2', 'target').content).toBe('Khác')
    expect(getProposal(db, 'other').parts[0].status).toBe('pending')
    db.close()
  })

  it('deny changes only the decision, and undo restores content and decision', () => {
    const db = fresh()
    add(db)
    denyProposalPart(db, 'c1', 'p-part', 3)
    expect(readText(db, 'c1', 'target').content).toBe('Một\nHai')
    expect(getProposal(db, 'p').parts[0].status).toBe('rejected')
    // A fresh pending proposal is accepted and then undone.
    add(db, 'p2')
    acceptProposalParts(db, { ...command(['p2-part']), commandId: 'accept-p2' })
    const undone = undoLatestAccept(db, 'c1', 4, newId)
    expect(undone).toMatchObject({ content: 'Một\nHai', rev: 3 })
    expect(getProposal(db, 'p2').parts[0].status).toBe('pending')
    db.close()
  })

  it('refuses undo after a later edit and rolls back if checkpoint creation fails', () => {
    const db = fresh()
    add(db)
    acceptProposalParts(db, command(['p-part']))
    db.exec(
      "UPDATE chapter_text SET content = 'Tay sửa', rev = 3, size = 7 WHERE chapter_id = 'c1' AND side = 'target'"
    )
    expect(() => undoLatestAccept(db, 'c1', 5, newId)).toThrow()
    expect(readText(db, 'c1', 'target').content).toBe('Tay sửa')
    db.close()

    const rollback = fresh()
    add(rollback)
    expect(() =>
      acceptProposalParts(rollback, {
        ...command(['p-part']),
        commandId: 'fail',
        newId: () => {
          throw new Error('simulated crash before commit')
        }
      })
    ).toThrow()
    expect(readText(rollback, 'c1', 'target')).toMatchObject({ content: 'Một\nHai', rev: 1 })
    expect(getProposal(rollback, 'p').parts[0].status).toBe('pending')
    rollback.close()

    const receiptFailure = fresh()
    add(receiptFailure)
    receiptFailure.exec(`CREATE TRIGGER reject_receipt BEFORE INSERT ON proposal_accept_command
      BEGIN SELECT RAISE(ABORT, 'simulated crash before commit'); END`)
    expect(() =>
      acceptProposalParts(receiptFailure, { ...command(['p-part']), commandId: 'receipt-fail' })
    ).toThrow()
    expect(readText(receiptFailure, 'c1', 'target')).toMatchObject({ content: 'Một\nHai', rev: 1 })
    expect(getProposal(receiptFailure, 'p').parts[0].status).toBe('pending')
    expect(latestTextSnapshot(receiptFailure, 'c1')).toBeNull()
    receiptFailure.close()
  })
})
