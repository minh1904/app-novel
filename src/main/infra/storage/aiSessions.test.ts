import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { migrate } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { workSchema } from './workSchema'
import {
  createAiSession,
  getAiTurn,
  interruptAiTurns,
  listAiSessions,
  listAiTurns,
  startAiTurn,
  updateAiTurn
} from './aiSessions'

const tempDir = createTempDirs()

function fresh(): Db {
  const db = openDatabase(join(tempDir(), 'ai-sessions.mira'))
  migrate(db, workSchema)
  db.exec(`
    INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w', 'Tác phẩm', 'ja', 1, 1);
    INSERT INTO chapter (id, position, created_at, updated_at) VALUES ('c', 0, 1, 1);
  `)
  return db
}

describe('AI sessions in a work file', () => {
  it('stores the actual context, answer, model and usage across reopening', () => {
    const db = fresh()
    createAiSession(db, 's1', 'Dịch chương', 10)
    const context = [
      { kind: 'chapter-source' as const, label: 'Bản gốc', detail: 'Chương 1', text: '原文' }
    ]
    startAiTurn(db, {
      id: 't1',
      sessionId: 's1',
      chapterId: 'c',
      action: 'apply',
      question: 'Dịch',
      context,
      droppedTurns: 2,
      provider: 'openai',
      model: 'gpt-test',
      now: 11
    })
    updateAiTurn(
      db,
      't1',
      {
        answer: 'Bản dịch',
        status: 'done',
        tools: [{ name: 'read', detail: 'Chương 1' }],
        usage: { inputTokens: 12, outputTokens: 8 },
        costUsd: 0.002,
        finishReason: 'stop'
      },
      12
    )
    expect(listAiSessions(db, 10).map((session) => session.id)).toEqual(['s1'])
    db.close()

    const reopened = openDatabase(db.path)
    migrate(reopened, workSchema)
    expect(getAiTurn(reopened, 't1')).toMatchObject({
      action: 'apply',
      context,
      answer: 'Bản dịch',
      status: 'done',
      droppedTurns: 2,
      provider: 'openai',
      model: 'gpt-test',
      usage: { inputTokens: 12, outputTokens: 8 }
    })
    expect(listAiTurns(reopened, 's1', 10).map((turn) => turn.id)).toEqual(['t1'])
    reopened.close()
  })

  it('keeps an old mode turn and a new chat turn readable in one session', () => {
    const db = fresh()
    createAiSession(db, 's', 'Sửa rồi hỏi', 1)
    const range = { from: 0, to: 3, text: 'abc', targetIds: [] }
    startAiTurn(db, {
      id: 'old',
      sessionId: 's',
      chapterId: 'c',
      action: 'edit',
      question: 'Sửa',
      context: [],
      range,
      droppedTurns: 0,
      provider: null,
      model: null,
      now: 2
    })
    const location = {
      caret: { source: 2, target: 5 },
      selection: { side: 'target' as const, from: 5, to: 6 }
    }
    startAiTurn(db, {
      id: 'new',
      sessionId: 's',
      chapterId: 'c',
      action: 'chat',
      question: 'Đoạn này đúng chưa',
      location,
      droppedTurns: 0,
      provider: null,
      model: null,
      now: 3
    })
    const step = {
      name: 'propose_edit',
      detail: 'Sửa đoạn 5–6 bản dịch',
      status: 'ok' as const,
      proposal: {
        type: 'edit' as const,
        proposalId: 'p',
        partIds: ['part'],
        chapterId: 'c',
        label: 'Sửa đoạn 5–6 bản dịch'
      }
    }
    updateAiTurn(db, 'new', { status: 'done', answer: 'Đã đề xuất.', tools: [step] }, 4)

    const [newer, older] = listAiTurns(db, 's', 10)
    expect(older).toMatchObject({ action: 'edit', range, location: null, context: [] })
    expect(newer).toMatchObject({
      action: 'chat',
      range: null,
      location,
      context: [],
      tools: [step]
    })
    db.close()
  })

  it('paginates sessions and turns with stable timestamp tie breaks', () => {
    const db = fresh()
    for (const id of ['a', 'b', 'c']) createAiSession(db, id, id, 10)
    expect(listAiSessions(db, 2).map((item) => item.id)).toEqual(['c', 'b'])
    expect(listAiSessions(db, 2, { updatedAt: 10, id: 'b' }).map((item) => item.id)).toEqual(['a'])
    for (const id of ['a', 'b', 'c']) {
      startAiTurn(db, {
        id,
        sessionId: 'c',
        chapterId: 'c',
        action: 'ask',
        question: id,
        context: [],
        droppedTurns: 0,
        provider: null,
        model: null,
        now: 11
      })
    }
    expect(listAiTurns(db, 'c', 2).map((item) => item.id)).toEqual(['c', 'b'])
    expect(listAiTurns(db, 'c', 2, { createdAt: 11, id: 'b' }).map((item) => item.id)).toEqual([
      'a'
    ])
    db.close()
  })

  it('marks unfinished turns interrupted after restart without inventing a complete answer', () => {
    const db = fresh()
    createAiSession(db, 's', '', 1)
    startAiTurn(db, {
      id: 't',
      sessionId: 's',
      chapterId: 'c',
      action: 'edit',
      question: 'Viết lại',
      context: [],
      droppedTurns: 0,
      provider: null,
      model: null,
      now: 2
    })
    updateAiTurn(db, 't', { status: 'running', answer: 'Một nửa' }, 3)
    expect(interruptAiTurns(db, 4)).toBe(1)
    expect(getAiTurn(db, 't')).toMatchObject({ status: 'interrupted', answer: 'Một nửa' })
    db.close()
  })

  it('cannot pretend an unsaved turn exists when insertion fails', () => {
    const db = fresh()
    createAiSession(db, 's', '', 1)
    expect(() =>
      startAiTurn(db, {
        id: 't',
        sessionId: 's',
        chapterId: 'missing',
        action: 'ask',
        question: 'Hỏi',
        context: [],
        droppedTurns: 0,
        provider: null,
        model: null,
        now: 2
      })
    ).toThrow()
    expect(listAiTurns(db, 's', 10)).toEqual([])
    db.close()
  })
})
