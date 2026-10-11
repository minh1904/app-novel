import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  agentContextSchema,
  agentStreamEventSchema,
  canTransitionActivity,
  canTransitionOperation,
  canTransitionTurn,
  resolvedTargetSchema,
  validateAgentEventSequence
} from './agent'

const id = (n: number): string => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`

describe('agent contracts', () => {
  it('accepts empty app context and a complete workspace snapshot', () => {
    expect(v.parse(agentContextSchema, {})).toEqual({})
    expect(
      v.parse(agentContextSchema, {
        workId: id(1),
        chapterId: id(2),
        caret: { source: 2, target: null },
        selection: { side: 'target', from: 3, to: 5 }
      })
    ).toMatchObject({ workId: id(1), chapterId: id(2) })
  })

  it('rejects a chapter without a work and reversed selections', () => {
    expect(() => v.parse(agentContextSchema, { chapterId: id(2) })).toThrow()
    expect(() =>
      v.parse(agentContextSchema, {
        workId: id(1),
        selection: { side: 'source', from: 5, to: 3 }
      })
    ).toThrow()
  })

  it('accepts only resolved targets with the identifiers their kind requires', () => {
    expect(
      v.parse(resolvedTargetSchema, {
        kind: 'chapter',
        workId: id(1),
        workLabel: 'A',
        chapterId: id(2),
        chapterLabel: 'Chương 2'
      })
    ).toMatchObject({ kind: 'chapter', chapterId: id(2) })
    expect(() =>
      v.parse(resolvedTargetSchema, {
        kind: 'chapter',
        workId: id(1),
        workLabel: 'A'
      })
    ).toThrow()
    expect(() => v.parse(resolvedTargetSchema, { kind: 'ambiguous', candidates: [] })).toThrow()
  })

  it('enforces independent turn, operation and activity state machines', () => {
    expect(canTransitionTurn('queued', 'running')).toBe(true)
    expect(canTransitionTurn('running', 'waiting_user')).toBe(true)
    expect(canTransitionTurn('waiting_user', 'running')).toBe(true)
    expect(canTransitionTurn('completed', 'running')).toBe(false)

    expect(canTransitionOperation('queued', 'running')).toBe(true)
    expect(canTransitionOperation('running', 'partially_completed')).toBe(true)
    expect(canTransitionOperation('completed', 'undone', true)).toBe(true)
    expect(canTransitionOperation('cancelled', 'undone', false)).toBe(false)
    expect(canTransitionOperation('conflict', 'running')).toBe(false)

    expect(canTransitionActivity('pending', 'running')).toBe(true)
    expect(canTransitionActivity('running', 'completed')).toBe(true)
    expect(canTransitionActivity('completed', 'running')).toBe(false)
  })

  it('validates positive immutable sequence numbers and one terminal event', () => {
    const events = [
      { requestId: id(1), turnId: id(2), eventSeq: 1, kind: 'answer-delta', text: 'a' },
      {
        requestId: id(1),
        turnId: id(2),
        eventSeq: 2,
        kind: 'done',
        turnState: 'completed',
        usage: null
      }
    ] as const
    for (const event of events) expect(() => v.parse(agentStreamEventSchema, event)).not.toThrow()
    expect(validateAgentEventSequence(events)).toEqual({ ok: true })
    expect(validateAgentEventSequence([events[1], events[0]])).toMatchObject({ ok: false })
    expect(validateAgentEventSequence([...events, { ...events[1], eventSeq: 3 }])).toMatchObject({
      ok: false
    })
    expect(() => v.parse(agentStreamEventSchema, { ...events[0], eventSeq: 0 })).toThrow()
  })
})
