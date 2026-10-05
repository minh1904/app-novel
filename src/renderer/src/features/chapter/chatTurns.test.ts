import { describe, expect, it } from 'vitest'
import type { ChatChunk, ChatError, ChatMode } from '../../../../shared/contracts/aiChat'
import type { TargetRange } from '../editor/chatRange'
import {
  applyChunk,
  attachRequestId,
  beginTurn,
  emptySession,
  failTurn,
  historyFor,
  markAutoApply,
  openRequestIds,
  proposalOf,
  revealStep,
  restoredSession,
  type Session
} from './chatTurns'

/**
 * Conversation state in the panel.
 *
 * Three groups carry the weight: two turns in flight must not mix text, a closed turn must not gain
 * more, and only a finished Sửa turn may offer a replacement. Each is a way this feature could write
 * the wrong thing into a translation, so each is proved rather than assumed.
 */

const RANGE: TargetRange = { from: 0, to: 9, text: 'Đoạn một.', targetIds: ['s0'] }

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
  options: { mode?: ChatMode; question?: string; localId?: string } = {},
  from: Session = emptySession
): Session {
  const localId = options.localId ?? 'L-' + requestId
  const begun = beginTurn(from, {
    localId,
    question: options.question ?? 'Dịch tự nhiên hơn',
    mode: options.mode ?? 'hoi',
    context: [],
    range: options.mode === 'sua' || options.mode === 'ap_dung' ? RANGE : null
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
    const session = beginTurn(emptySession, {
      localId: 'L1',
      question: 'Hỏi gì đó',
      mode: 'hoi',
      context: [],
      range: null
    })
    expect(session.turns[0]).toMatchObject({ status: 'sending', answer: '', requestId: null })
  })

  it('a chunk is ignored until the request id is attached', () => {
    const begun = beginTurn(emptySession, {
      localId: 'L1',
      question: 'Hỏi',
      mode: 'hoi',
      context: [],
      range: null
    })
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

describe('what a turn offers to apply', () => {
  const answer = 'Chỗ cứng là "được hưởng".\n\n```\nNhờ ngoại hình, cô được nhiều người để ý.\n```'

  it('a finished Sửa turn offers the fenced block', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(session, delta('r1', answer))
    session = applyChunk(session, done('r1'))
    expect(proposalOf(turnOf(session, 'r1'))).toBe('Nhờ ngoại hình, cô được nhiều người để ý.')
  })

  it('a finished direct-apply turn offers the same anchored replacement', () => {
    let session = started('r1', { mode: 'ap_dung' })
    session = applyChunk(session, delta('r1', answer))
    session = applyChunk(session, done('r1'))
    expect(proposalOf(turnOf(session, 'r1'))).toBe('Nhờ ngoại hình, cô được nhiều người để ý.')
    session = markAutoApply(session, 'L-r1', 'applied')
    expect(turnOf(session, 'r1').autoApply).toBe('applied')
  })

  it('does not offer a replacement when provider cut off the answer', () => {
    let session = started('r1', { mode: 'ap_dung' })
    session = applyChunk(session, delta('r1', answer))
    session = applyChunk(session, { ...done('r1'), finishReason: 'length' })
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  it('does not offer a replacement when completion is unconfirmed', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(session, delta('r1', answer))
    const unknown = done('r1')
    delete unknown.finishReason
    session = applyChunk(session, unknown)
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  it('a Hỏi turn never offers anything, fence or not', () => {
    let session = started('r1', { mode: 'hoi' })
    session = applyChunk(session, delta('r1', answer))
    session = applyChunk(session, done('r1'))
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  // A truncated rewrite would silently shorten the paragraph it replaces.
  it('a cancelled Sửa turn offers nothing even with a complete fence', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(session, delta('r1', answer))
    session = applyChunk(session, failure('r1', 'cancelled'))
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  it('a failed Sửa turn offers nothing', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(session, delta('r1', answer))
    session = applyChunk(session, failure('r1', 'rate_limited'))
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  it('offers nothing when the model ignored the fence', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(session, delta('r1', 'Tôi nghĩ nên viết lại nhẹ hơn một chút.'))
    session = applyChunk(session, done('r1'))
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  it('offers nothing when the fenced block is empty', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(session, delta('r1', 'Giải thích.\n\n```\n\n```'))
    session = applyChunk(session, done('r1'))
    expect(proposalOf(turnOf(session, 'r1'))).toBeNull()
  })

  it('takes the last fence, so a quoted example does not win', () => {
    let session = started('r1', { mode: 'sua' })
    session = applyChunk(
      session,
      delta('r1', 'Bản gốc:\n```\ncâu gốc\n```\nBản sửa:\n```\ncâu đã sửa\n```')
    )
    session = applyChunk(session, done('r1'))
    expect(proposalOf(turnOf(session, 'r1'))).toBe('câu đã sửa')
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

describe('revealStep', () => {
  const WRITING = { mode: 'sua' as const, chapterId: 'c1' }
  const proposalDone = (requestId: string, partId = 'p-' + requestId): ChatChunk => ({
    ...done(requestId),
    proposal: { proposalId: 'pr-' + requestId, partId, status: 'pending' }
  })
  const begun = (requestId: string, options: { mode?: ChatMode; chapterId?: string } = {}): Session => {
    const localId = 'L-' + requestId
    const mode = options.mode ?? WRITING.mode
    return attachRequestId(
      beginTurn(emptySession, {
        localId,
        question: 'Viết lại',
        mode,
        chapterId: options.chapterId ?? WRITING.chapterId,
        context: [],
        range: mode === 'hoi' ? null : RANGE
      }),
      localId,
      requestId
    )
  }
  const pending = (partId: string): 'pending' | undefined => (partId === 'p-r1' ? 'pending' : undefined)

  it('opens the proposal of a writing turn that was seen running, once it is in the queue', () => {
    const running = begun('r1')
    const watching = revealStep(running.turns, new Set(), 'c1', pending)
    expect(watching.reveal).toEqual([])
    expect(watching.watched.has('L-r1')).toBe(true)

    const finished = applyChunk(running, proposalDone('r1'))
    const queued = revealStep(finished.turns, watching.watched, 'c1', pending)
    expect(queued.reveal).toEqual(['p-r1'])
    // Shown once: the same turn must not reopen on the next render.
    expect(queued.watched.size).toBe(0)
    expect(revealStep(finished.turns, queued.watched, 'c1', pending).reveal).toEqual([])
  })

  it('waits while the proposal has not reached the queue yet', () => {
    const finished = applyChunk(begun('r1'), proposalDone('r1'))
    const watching = revealStep(begun('r1').turns, new Set(), 'c1', () => undefined)
    const early = revealStep(finished.turns, watching.watched, 'c1', () => undefined)
    expect(early.reveal).toEqual([])
    expect(early.watched.has('L-r1')).toBe(true)
  })

  it('never opens a turn restored from history', () => {
    const restored = restoredSession([
      {
        id: 't1', question: 'Viết lại', answer: 'x', action: 'sua', status: 'done', chapterId: 'c1',
        usage: null, costUsd: null, finishReason: 'stop', droppedTurns: 0, context: [], tools: [],
        range: RANGE, proposalId: 'pr-t1', partId: 'p-r1', proposalStatus: 'pending'
      }
    ] as unknown as Parameters<typeof restoredSession>[0])
    expect(revealStep(restored.turns, new Set(), 'c1', pending)).toEqual({
      watched: new Set(),
      reveal: []
    })
  })

  it('leaves chat-only and direct-apply turns alone', () => {
    for (const mode of ['hoi', 'ap_dung'] as const) {
      const finished = applyChunk(begun('r1', { mode }), proposalDone('r1'))
      const step = revealStep(finished.turns, new Set(['L-r1']), 'c1', pending)
      expect(step.reveal).toEqual([])
    }
  })

  it('drops a turn that failed, made no proposal, or belongs to another chapter', () => {
    const failed = applyChunk(begun('r1'), failure('r1', 'network'))
    expect(revealStep(failed.turns, new Set(['L-r1']), 'c1', pending).watched.size).toBe(0)

    const noProposal = applyChunk(begun('r1'), done('r1'))
    expect(revealStep(noProposal.turns, new Set(['L-r1']), 'c1', pending).watched.size).toBe(0)

    const elsewhere = applyChunk(begun('r1', { chapterId: 'c2' }), proposalDone('r1'))
    const step = revealStep(elsewhere.turns, new Set(['L-r1']), 'c1', pending)
    expect(step.reveal).toEqual([])
    expect(step.watched.size).toBe(0)
  })

  it('does not open a proposal that is no longer pending', () => {
    const finished = applyChunk(begun('r1'), proposalDone('r1'))
    const step = revealStep(finished.turns, new Set(['L-r1']), 'c1', () => 'applied')
    expect(step.reveal).toEqual([])
    expect(step.watched.size).toBe(0)
  })
})
