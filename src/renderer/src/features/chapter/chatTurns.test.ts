import { describe, expect, it } from 'vitest'
import type { ChatChunk, ChatError, ChatToolProposal } from '../../../../shared/contracts/aiChat'
import type { AiTurnView } from '../../../../shared/contracts/aiHistory'
import {
  applyChunk,
  attachRequestId,
  beginTurn,
  emptySession,
  failTurn,
  historyFor,
  openRequestIds,
  restoredSession,
  type Session
} from './chatTurns'

/**
 * Conversation state in the panel.
 *
 * Two groups carry the weight: two turns in flight must not mix text, and a closed turn must not gain
 * more. A proposal now arrives as its own chunk from a writing tool; the answer's text never becomes one.
 */

const delta = (requestId: string, text: string): ChatChunk => ({ requestId, kind: 'delta', text })
const done = (requestId: string): Extract<ChatChunk, { kind: 'done' }> => ({
  requestId,
  kind: 'done',
  usage: { inputTokens: 10, outputTokens: 5 },
  usd: 0.001,
  keyTail: '9f3a',
  finishReason: 'stop'
})
const failure = (requestId: string, kind: ChatError['kind'], partial = true): ChatChunk => ({
  requestId,
  kind: 'error',
  error: { kind, message: 'lỗi', retryable: kind !== 'auth', recoverAt: null },
  partial
})

/** A session with one started turn already matched to `requestId`. */
function started(
  requestId = 'r1',
  options: { question?: string; localId?: string } = {},
  from: Session = emptySession
): Session {
  const localId = options.localId ?? 'L-' + requestId
  const begun = beginTurn(from, {
    localId,
    question: options.question ?? 'Dịch tự nhiên hơn',
    location: { caret: { source: null, target: 3 }, selection: null }
  })
  return attachRequestId(begun, localId, requestId)
}

const turnOf = (session: Session, requestId: string): Session['turns'][number] => {
  const found = session.turns.find((turn) => turn.requestId === requestId)
  if (!found) throw new Error('no turn for ' + requestId)
  return found
}

describe('a turn from start to finish', () => {
  it('starts as sending, with no answer and nothing to apply', () => {
    const session = beginTurn(emptySession, { localId: 'L1', question: 'Hỏi gì đó' })
    expect(session.turns[0]).toMatchObject({
      status: 'sending',
      answer: '',
      requestId: null,
      mode: 'chat',
      proposals: [],
      tools: []
    })
  })

  it('a chunk is ignored until the request id is attached', () => {
    const begun = beginTurn(emptySession, { localId: 'L1', question: 'Hỏi' })
    const after = applyChunk(begun, delta('r1', 'không thuộc về đâu'))
    expect(after.turns[0].answer).toBe('')
  })

  it('deltas append and move it to running', () => {
    let session = started()
    session = applyChunk(session, delta('r1', 'Nhờ '))
    session = applyChunk(session, delta('r1', 'ngoại hình'))
    expect(turnOf(session, 'r1')).toMatchObject({ status: 'running', answer: 'Nhờ ngoại hình' })
  })

  it('done carries usage, money and the key tail', () => {
    let session = applyChunk(started(), delta('r1', 'a'))
    session = applyChunk(session, done('r1'))
    expect(turnOf(session, 'r1')).toMatchObject({
      status: 'done',
      usage: { inputTokens: 10, outputTokens: 5 },
      usd: 0.001,
      keyTail: '9f3a'
    })
  })

  it('keeps the text it already had when an error arrives', () => {
    let session = applyChunk(started(), delta('r1', 'một nửa'))
    session = applyChunk(session, failure('r1', 'rate_limited'))
    expect(turnOf(session, 'r1')).toMatchObject({ status: 'error', answer: 'một nửa' })
  })

  it('cancelling reads as cancelled, not as a failure', () => {
    let session = applyChunk(started(), delta('r1', 'một'))
    session = applyChunk(session, failure('r1', 'cancelled'))
    expect(turnOf(session, 'r1').status).toBe('cancelled')
  })

  it('a send that never started ends the turn too', () => {
    const session = failTurn(started(), 'L-r1', {
      kind: 'auth',
      message: 'khóa sai',
      retryable: false,
      recoverAt: null
    })
    expect(turnOf(session, 'r1')).toMatchObject({ status: 'error', answer: '' })
  })
})

describe('a closed turn gains nothing more', () => {
  it('ignores a delta after done', () => {
    let session = applyChunk(started(), done('r1'))
    session = applyChunk(session, delta('r1', 'muộn'))
    expect(turnOf(session, 'r1').answer).toBe('')
  })

  it('ignores a second ending', () => {
    let session = applyChunk(started(), done('r1'))
    session = applyChunk(session, failure('r1', 'network'))
    expect(turnOf(session, 'r1')).toMatchObject({ status: 'done', error: null })
  })

  it('ignores a delta after cancelling', () => {
    let session = applyChunk(started(), failure('r1', 'cancelled'))
    session = applyChunk(session, delta('r1', 'muộn'))
    expect(turnOf(session, 'r1').answer).toBe('')
  })
})

// The case position-based matching gets wrong half the time.
describe('two turns in flight', () => {
  it('keeps their text apart', () => {
    let session = started('r1', { question: 'Câu một' })
    session = started('r2', { question: 'Câu hai' }, session)

    session = applyChunk(session, delta('r2', 'HAI-a'))
    session = applyChunk(session, delta('r1', 'MỘT-a'))
    session = applyChunk(session, delta('r2', 'HAI-b'))
    session = applyChunk(session, delta('r1', 'MỘT-b'))

    expect(turnOf(session, 'r1').answer).toBe('MỘT-aMỘT-b')
    expect(turnOf(session, 'r2').answer).toBe('HAI-aHAI-b')
  })

  it('ending one leaves the other running', () => {
    let session = started('r1')
    session = started('r2', {}, session)
    session = applyChunk(session, delta('r1', 'a'))
    session = applyChunk(session, delta('r2', 'b'))
    session = applyChunk(session, failure('r1', 'cancelled'))

    expect(turnOf(session, 'r1').status).toBe('cancelled')
    expect(turnOf(session, 'r2').status).toBe('running')
    expect(openRequestIds(session)).toEqual(['r2'])
  })

  it('lists every open turn so closing the panel can cancel them', () => {
    let session = started('r1')
    session = started('r2', {}, session)
    expect(openRequestIds(session)).toEqual(['r1', 'r2'])
    session = applyChunk(session, done('r1'))
    expect(openRequestIds(session)).toEqual(['r2'])
  })
})

describe('tool calls and proposals', () => {
  const proposal: ChatToolProposal = {
    type: 'edit',
    proposalId: 'p1',
    partIds: ['part1'],
    chapterId: 'c',
    label: 'Sửa đoạn 3 bản dịch'
  }

  it('appends tool steps with their status and keeps the turn running', () => {
    let session = applyChunk(started(), {
      requestId: 'r1',
      kind: 'tool',
      name: 'read_segments',
      detail: 'Chương 2 · bản dịch — đoạn 3 kèm đoạn tương ứng',
      status: 'ok'
    })
    session = applyChunk(session, {
      requestId: 'r1',
      kind: 'tool',
      name: 'read_chapter',
      detail: 'Không có chương số 9.',
      status: 'error'
    })
    expect(turnOf(session, 'r1')).toMatchObject({
      status: 'running',
      tools: [
        { name: 'read_segments', status: 'ok' },
        { name: 'read_chapter', status: 'error' }
      ]
    })
  })

  it('adds a proposal as soon as its chunk arrives, before the turn ends', () => {
    let session = applyChunk(started(), { requestId: 'r1', kind: 'proposal', proposal })
    expect(turnOf(session, 'r1')).toMatchObject({ status: 'running', proposals: [proposal] })
    session = applyChunk(session, done('r1'))
    expect(turnOf(session, 'r1').proposals).toEqual([proposal])
  })

  it('makes no proposal out of a fenced answer', () => {
    let session = applyChunk(started(), delta('r1', 'Bản sửa:\n```\nCâu mới.\n```'))
    session = applyChunk(session, done('r1'))
    expect(turnOf(session, 'r1').proposals).toEqual([])
  })

  it('ignores a proposal for a turn that already ended', () => {
    let session = applyChunk(started(), done('r1'))
    session = applyChunk(session, { requestId: 'r1', kind: 'proposal', proposal })
    expect(turnOf(session, 'r1').proposals).toEqual([])
  })
})

describe('what the model thought, and when', () => {
  it('appends reasoning apart from the answer and keeps the turn running', () => {
    let session = applyChunk(started(), { requestId: 'r1', kind: 'reasoning', text: 'Người dùng ' })
    session = applyChunk(session, { requestId: 'r1', kind: 'reasoning', text: 'chào.' })
    session = applyChunk(session, delta('r1', 'Chào bạn!'))
    expect(turnOf(session, 'r1')).toMatchObject({
      status: 'running',
      reasoning: 'Người dùng chào.',
      answer: 'Chào bạn!'
    })
  })

  it('records when the turn started and when it ended', () => {
    const begun = beginTurn(emptySession, { localId: 'L', question: 'Hỏi' }, 1000)
    let session = attachRequestId(begun, 'L', 'r')
    expect(session.turns[0]).toMatchObject({ createdAt: 1000, finishedAt: null })
    session = applyChunk(session, done('r'), 5000)
    expect(session.turns[0].finishedAt).toBe(5000)
  })
})

describe('a restored session', () => {
  const view = (patch: Partial<AiTurnView>): AiTurnView => ({
    id: 't',
    sessionId: 's',
    chapterId: 'c',
    action: 'chat',
    question: 'Hỏi',
    answer: 'Đáp',
    reasoning: '',
    status: 'done',
    context: [],
    range: null,
    location: null,
    tools: [],
    droppedTurns: 0,
    provider: null,
    model: null,
    usage: null,
    costUsd: null,
    finishReason: 'stop',
    createdAt: 1,
    updatedAt: 1,
    proposals: [],
    ...patch
  })

  it('keeps an old Sửa turn with its mode, range and proposal, oldest first', () => {
    const range = { from: 0, to: 3, text: 'abc', targetIds: [] }
    const old: ChatToolProposal = {
      type: 'edit',
      proposalId: 'p0',
      partIds: ['x'],
      chapterId: 'c',
      label: 'Đề xuất sửa (lượt cũ)'
    }
    const session = restoredSession([
      view({ id: 'new', createdAt: 2 }),
      view({ id: 'old', action: 'edit', range, proposals: [old] })
    ])
    expect(session.turns.map((turn) => [turn.localId, turn.mode])).toEqual([
      ['old', 'edit'],
      ['new', 'chat']
    ])
    expect(session.turns[0]).toMatchObject({ range, proposals: [old] })
  })
})

describe('history sent with the next question', () => {
  function finished(requestId: string, question: string, answer: string, from: Session): Session {
    let session = started(requestId, { question, localId: 'L-' + requestId }, from)
    session = applyChunk(session, delta(requestId, answer))
    return applyChunk(session, done(requestId))
  }

  it('sends completed turns oldest first, as user/assistant pairs', () => {
    let session = finished('r1', 'Câu một', 'Đáp một', emptySession)
    session = finished('r2', 'Câu hai', 'Đáp hai', session)

    expect(historyFor(session).history).toEqual([
      { role: 'user', text: 'Câu một' },
      { role: 'assistant', text: 'Đáp một' },
      { role: 'user', text: 'Câu hai' },
      { role: 'assistant', text: 'Đáp hai' }
    ])
  })

  it('leaves out turns that never finished', () => {
    let session = finished('r1', 'Xong', 'Đáp', emptySession)
    session = started('r2', { question: 'Đang chạy', localId: 'L-r2' }, session)
    session = applyChunk(session, delta('r2', 'dở dang'))

    expect(historyFor(session).history.map((turn) => turn.text)).toEqual(['Xong', 'Đáp'])
  })

  it('leaves out a cancelled turn even though it has text', () => {
    let session = started('r1', { question: 'Bị hủy' })
    session = applyChunk(session, delta('r1', 'một nửa'))
    session = applyChunk(session, failure('r1', 'cancelled'))

    expect(historyFor(session).history).toEqual([])
  })

  it('drops the oldest turns over budget and says how many', () => {
    let session = emptySession
    for (let i = 1; i <= 4; i++) {
      session = finished('r' + i, 'Câu ' + i, 'x'.repeat(100), session)
    }
    const result = historyFor(session, 250)

    expect(result.dropped).toBe(2)
    // The two kept are the newest, and the question text proves which.
    expect(
      result.history.map((turn) => turn.text).filter((text) => text.startsWith('Câu'))
    ).toEqual(['Câu 3', 'Câu 4'])
  })

  it('keeps the newest turn even when it alone exceeds the budget', () => {
    const session = finished('r1', 'Câu dài', 'x'.repeat(1000), emptySession)
    const result = historyFor(session, 10)
    expect(result.history).toHaveLength(2)
    expect(result.dropped).toBe(0)
  })

  it('reports nothing dropped when everything fits', () => {
    const session = finished('r1', 'Câu', 'Đáp', emptySession)
    expect(historyFor(session).dropped).toBe(0)
  })
})
