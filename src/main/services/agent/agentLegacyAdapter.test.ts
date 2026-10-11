import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import {
  acceptLegacyProposalParts,
  denyLegacyProposalPart,
  getLegacyProposalsForTurn,
  getLegacyRefForTurn,
  importLegacySession,
  listLegacySessions
} from './agentLegacyAdapter'
import { createAiSession, startAiTurn } from '../../infra/storage/aiSessions'
import { createProposal } from '../../infra/storage/aiProposals'
import { insertWork, readWork } from '../../infra/storage/workFile'
import { WorkFiles } from '../../infra/storage/workFiles'
import { saveText } from '../../infra/storage/textFile'
import { textHash } from '../proposals/proposalService'

const tempDir = createTempDirs()
const workFilesList: WorkFiles[] = []

afterEach(() => {
  for (const wf of workFilesList.splice(0)) {
    try {
      wf.index.close()
    } catch {
      // ignore
    }
  }
})

function setupTwoWorksFixture(dir: string): {
  workFiles: WorkFiles
  workId1: string
  workId2: string
  chapterId1: string
  chapterId2: string
  session1Id: string
  session2Id: string
  turn1Id: string
  turn2Id: string
  proposal1Id: string
} {
  const workFiles = WorkFiles.open({ dataDir: dir, now: () => 1000 })
  workFilesList.push(workFiles)

  const workId1 = '00000000-0000-0000-0000-000000000001'
  const workId2 = '00000000-0000-0000-0000-000000000002'
  const chapterId1 = 'chapter-1'
  const chapterId2 = 'chapter-2'
  const session1Id = 'legacy-s1'
  const session2Id = 'legacy-s2'
  const turn1Id = 'legacy-t1'
  const turn2Id = 'legacy-t2'
  const proposal1Id = 'proposal-1'
  const proposal2Id = 'proposal-2'

  // Create Work 1
  const summary1 = workFiles.createWorkFile(workId1, (db) => {
    insertWork(db, workId1, { title: 'Tác phẩm 1', sourceLang: 'ja' }, 1000)
    db.prepare(
      'INSERT INTO chapter (id, position, title, created_at, updated_at) VALUES (?, 1, ?, 1000, 1000)'
    ).run(chapterId1, 'Chương 1')
    saveText(
      db,
      {
        chapterId: chapterId1,
        side: 'source',
        content: 'source content 1',
        expectedRev: 0,
        segments: []
      },
      1000,
      () => 'seg-s1'
    )
    saveText(
      db,
      {
        chapterId: chapterId1,
        side: 'target',
        content: 'Nội dung chương 1',
        expectedRev: 0,
        segments: []
      },
      1000,
      () => 'seg-1'
    )

    createAiSession(db, session1Id, 'Phiên dịch tác phẩm 1', 1000)
    startAiTurn(db, {
      id: turn1Id,
      sessionId: session1Id,
      chapterId: chapterId1,
      action: 'chat',
      question: 'Dịch câu này giúp tôi',
      context: [],
      droppedTurns: 0,
      provider: null,
      model: null,
      now: 1010
    })
    db.prepare("UPDATE ai_turn SET answer = 'Bản dịch 1', status = 'done' WHERE id = ?").run(
      turn1Id
    )

    createProposal(db, {
      id: proposal1Id,
      chapterId: chapterId1,
      sessionId: session1Id,
      turnId: turn1Id,
      origin: 'chat',
      policy: 'review',
      sourceRev: 1,
      sourceHash: textHash('source content 1'),
      targetBaseRev: 1,
      targetBaseContent: 'Nội dung chương 1',
      context: [],
      now: 1020,
      parts: [
        {
          id: 'part-1',
          baseFrom: 0,
          baseTo: 8,
          beforeText: 'Nội dung',
          afterText: 'Bản dịch',
          sourceOrder: null,
          sourceText: null,
          status: 'pending',
          batchKey: null
        }
      ]
    })
    return readWork(db)
  })
  workFiles.syncIndex(summary1)

  // Create Work 2
  const summary2 = workFiles.createWorkFile(workId2, (db) => {
    insertWork(db, workId2, { title: 'Tác phẩm 2', sourceLang: 'en' }, 1000)
    db.prepare(
      'INSERT INTO chapter (id, position, title, created_at, updated_at) VALUES (?, 1, ?, 1000, 1000)'
    ).run(chapterId2, 'Chương 2')
    saveText(
      db,
      {
        chapterId: chapterId2,
        side: 'source',
        content: 'source content 2',
        expectedRev: 0,
        segments: []
      },
      1000,
      () => 'seg-s2'
    )
    saveText(
      db,
      {
        chapterId: chapterId2,
        side: 'target',
        content: 'Chapter 2 content',
        expectedRev: 0,
        segments: []
      },
      1000,
      () => 'seg-2'
    )

    createAiSession(db, session2Id, 'Phiên dịch tác phẩm 2', 1000)
    startAiTurn(db, {
      id: turn2Id,
      sessionId: session2Id,
      chapterId: chapterId2,
      action: 'chat',
      question: 'Translate this',
      context: [],
      droppedTurns: 0,
      provider: null,
      model: null,
      now: 1010
    })
    db.prepare("UPDATE ai_turn SET answer = 'Translation 2', status = 'done' WHERE id = ?").run(
      turn2Id
    )

    createProposal(db, {
      id: proposal2Id,
      chapterId: chapterId2,
      sessionId: session2Id,
      turnId: turn2Id,
      origin: 'chat',
      policy: 'review',
      sourceRev: 1,
      sourceHash: textHash('source content 2'),
      targetBaseRev: 1,
      targetBaseContent: 'Chapter 2 content',
      context: [],
      now: 1020,
      parts: [
        {
          id: 'part-2',
          baseFrom: 0,
          baseTo: 7,
          beforeText: 'Chapter',
          afterText: 'Chương',
          sourceOrder: null,
          sourceText: null,
          status: 'pending',
          batchKey: null
        }
      ]
    })
    return readWork(db)
  })
  workFiles.syncIndex(summary2)

  return {
    workFiles,
    workId1,
    workId2,
    chapterId1,
    chapterId2,
    session1Id,
    session2Id,
    turn1Id,
    turn2Id,
    proposal1Id
  }
}

describe('agentLegacyAdapter', () => {
  it('lists unimported legacy sessions across multiple works', () => {
    const dir = tempDir()
    const { workFiles, workId1, workId2, session1Id, session2Id } = setupTwoWorksFixture(dir)

    const list = listLegacySessions(workFiles, workFiles.index)
    expect(list).toHaveLength(2)

    const s1 = list.find((s) => s.legacySessionId === session1Id)
    const s2 = list.find((s) => s.legacySessionId === session2Id)
    expect(s1?.workId).toBe(workId1)
    expect(s1?.title).toBe('Phiên dịch tác phẩm 1')
    expect(s1?.agentSessionId).toBeUndefined()

    expect(s2?.workId).toBe(workId2)
    expect(s2?.title).toBe('Phiên dịch tác phẩm 2')
    expect(s2?.agentSessionId).toBeUndefined()
  })

  it('imports legacy session lazily and is idempotent on duplicate imports', () => {
    const dir = tempDir()
    const { workFiles, workId1, session1Id, turn1Id } = setupTwoWorksFixture(dir)

    // First import
    const res1 = importLegacySession(
      workFiles.index,
      workFiles,
      { workId: workId1, legacySessionId: session1Id },
      1100
    )
    expect(res1.alreadyImported).toBe(false)
    expect(res1.turnCount).toBe(1)
    expect(res1.agentSessionId).toBeDefined()

    // Verify session and turn in library.db
    const session = workFiles.index
      .prepare('SELECT id, title FROM agent_session WHERE id = ?')
      .get<{ id: string; title: string }>(res1.agentSessionId)
    expect(session?.title).toBe('Phiên dịch tác phẩm 1')

    const turns = workFiles.index
      .prepare(
        'SELECT id, instruction, answer, status, legacy_ref_json FROM agent_turn WHERE session_id = ?'
      )
      .all<{
        id: string
        instruction: string
        answer: string
        status: string
        legacy_ref_json: string
      }>(res1.agentSessionId)
    expect(turns).toHaveLength(1)
    expect(turns[0].instruction).toBe('Dịch câu này giúp tôi')
    expect(turns[0].answer).toBe('Bản dịch 1')
    expect(turns[0].status).toBe('completed')
    expect(JSON.parse(turns[0].legacy_ref_json)).toEqual({
      workId: workId1,
      sessionId: session1Id,
      turnId: turn1Id
    })

    // Second import (idempotent duplicate call)
    const res2 = importLegacySession(
      workFiles.index,
      workFiles,
      { workId: workId1, legacySessionId: session1Id },
      1200
    )
    expect(res2.alreadyImported).toBe(true)
    expect(res2.agentSessionId).toBe(res1.agentSessionId)

    // Total counts in library.db must NOT increase
    const sessionCount = workFiles.index
      .prepare('SELECT count(*) as count FROM agent_session')
      .get<{ count: number }>()?.count
    const turnCount = workFiles.index
      .prepare('SELECT count(*) as count FROM agent_turn')
      .get<{ count: number }>()?.count
    const mapCount = workFiles.index
      .prepare('SELECT count(*) as count FROM agent_legacy_import')
      .get<{ count: number }>()?.count

    expect(sessionCount).toBe(1)
    expect(turnCount).toBe(1)
    expect(mapCount).toBe(1)

    // listLegacySessions now marks it as imported
    const listAfter = listLegacySessions(workFiles, workFiles.index)
    const item = listAfter.find((s) => s.legacySessionId === session1Id)
    expect(item?.agentSessionId).toBe(res1.agentSessionId)
  })

  it('routes reading, accepting, and denying proposals back to original work DB without altering other works or library.db', () => {
    const dir = tempDir()
    const {
      workFiles,
      workId1,
      workId2,
      chapterId1,
      chapterId2,
      session1Id,
      session2Id,
      turn1Id,
      turn2Id,
      proposal1Id
    } = setupTwoWorksFixture(dir)

    // Import both sessions
    const imp1 = importLegacySession(
      workFiles.index,
      workFiles,
      { workId: workId1, legacySessionId: session1Id },
      1100
    )
    const imp2 = importLegacySession(
      workFiles.index,
      workFiles,
      { workId: workId2, legacySessionId: session2Id },
      1100
    )

    // Verify turns and legacyRefs
    const turn1Row = workFiles.index
      .prepare('SELECT id FROM agent_turn WHERE session_id = ?')
      .get<{ id: string }>(imp1.agentSessionId)
    const turn2Row = workFiles.index
      .prepare('SELECT id FROM agent_turn WHERE session_id = ?')
      .get<{ id: string }>(imp2.agentSessionId)

    const ref1 = getLegacyRefForTurn(workFiles.index, turn1Row!.id)
    const ref2 = getLegacyRefForTurn(workFiles.index, turn2Row!.id)
    expect(ref1).toEqual({ workId: workId1, sessionId: session1Id, turnId: turn1Id })
    expect(ref2).toEqual({ workId: workId2, sessionId: session2Id, turnId: turn2Id })

    // Read proposals for turn 1
    const p1List = getLegacyProposalsForTurn(workFiles, ref1!)
    expect(p1List).toHaveLength(1)
    expect(p1List[0].id).toBe(proposal1Id)
    expect(p1List[0].parts[0].id).toBe('part-1')
    expect(p1List[0].parts[0].status).toBe('pending')

    // Deny part 1 on Work 1
    denyLegacyProposalPart(workFiles, ref1!, chapterId1, 'part-1', 1200)

    // Verify part 1 is rejected in Work 1
    const p1AfterDeny = getLegacyProposalsForTurn(workFiles, ref1!)
    expect(p1AfterDeny[0].parts[0].status).toBe('rejected')

    // Verify part 2 in Work 2 is STILL pending
    const p2List = getLegacyProposalsForTurn(workFiles, ref2!)
    expect(p2List[0].parts[0].status).toBe('pending')

    // Accept part 2 on Work 2
    const acceptResult = acceptLegacyProposalParts(workFiles, ref2!, {
      chapterId: chapterId2,
      partIds: ['part-2'],
      actor: 'user',
      commandId: 'cmd-accept-2',
      now: 1300
    })
    expect(acceptResult.accepted).toEqual(['part-2'])

    // Verify part 2 is applied in Work 2
    const p2AfterAccept = getLegacyProposalsForTurn(workFiles, ref2!)
    expect(p2AfterAccept[0].parts[0].status).toBe('applied')

    // Verify part 1 in Work 1 is STILL rejected
    const p1Final = getLegacyProposalsForTurn(workFiles, ref1!)
    expect(p1Final[0].parts[0].status).toBe('rejected')

    // Verify library.db contains NO proposal records or duplicated turns
    const totalTurns = workFiles.index
      .prepare('SELECT count(*) as count FROM agent_turn')
      .get<{ count: number }>()?.count
    expect(totalTurns).toBe(2)
  })
})
