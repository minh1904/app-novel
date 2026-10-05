import { describe, expect, it } from 'vitest'
import type { StoredProposal, StoredProposalPart } from '../../infra/storage/aiProposals'
import { planProposalParts, type Candidate } from './proposalPlanner'

function candidate(
  id: string,
  base: string,
  from: number | null,
  to: number | null,
  after: string,
  options: { proposalId?: string; rev?: number; sourceHash?: string; sourceOrder?: number } = {}
): Candidate {
  const proposal = {
    id: options.proposalId ?? 'p', targetBaseContent: base, targetBaseRev: options.rev ?? 1,
    sourceHash: options.sourceHash ?? 'source', createdAt: 1
  } as StoredProposal
  const part = {
    id, proposalId: proposal.id, ordinal: options.sourceOrder ?? 0, sourceOrder: options.sourceOrder ?? null,
    baseFrom: from, baseTo: to, beforeText: from === null || to === null ? '' : base.slice(from, to),
    afterText: after, status: 'pending'
  } as StoredProposalPart
  return { proposal, part }
}

const current = (content: string, rev = 1, sourceHash = 'source'): { content: string; rev: number; sourceHash: string } => ({ content, rev, sourceHash })

describe('proposal planner', () => {
  it('accepts two non-overlapping parts from the same base in one plan', () => {
    const base = 'Một\nHai\nBa'
    const plan = planProposalParts(current(base), [
      candidate('a', base, 0, 3, 'Mới'), candidate('b', base, 4, 7, 'Khác')
    ])
    expect(plan).toEqual({
      content: 'Mới\nKhác\nBa',
      edits: [{ from: 0, to: 3, insert: 'Mới' }, { from: 4, to: 7, insert: 'Khác' }],
      accepted: ['b', 'a'], skipped: []
    })
  })

  it('rebases a uniquely moved anchor but refuses changed or deleted text', () => {
    const item = candidate('a', 'Một\nHai', 4, 7, 'Khác')
    expect(planProposalParts(current('Trước\nMột\nHai', 2), [item]).content).toBe('Trước\nMột\nKhác')
    expect(planProposalParts(current('Trước\nMột\nHỏng', 2), [item]).skipped[0].reason).toBe('target-changed')
    expect(planProposalParts(current('Một', 2), [item]).accepted).toEqual([])
    expect(planProposalParts(current('Một\nHa\ni', 2), [item]).accepted).toEqual([])
    expect(planProposalParts(current('Một Hai', 2), [item]).skipped[0].reason).toBe('target-changed')
  })

  it('refuses an ambiguous repeated anchor after the base changed', () => {
    const item = candidate('a', 'Một\nHai', 0, 3, 'Mới')
    expect(planProposalParts(current('Một\nMột\nHai', 2), [item]).skipped).toEqual([
      { partId: 'a', reason: 'ambiguous' }
    ])
  })

  it('rejects source changes and overlapping ranges without writing either span', () => {
    const base = 'Một Hai Ba'
    expect(planProposalParts(current(base, 1, 'changed'), [candidate('a', base, 0, 3, 'Mới')]).accepted).toEqual([])
    const plan = planProposalParts(current(base), [
      candidate('a', base, 0, 7, 'X'), candidate('b', base, 4, 10, 'Y')
    ])
    expect(plan.content).toBe(base)
    expect(plan.skipped.map((item) => item.reason)).toEqual(['overlap', 'overlap'])
  })

  it('joins blank-pane parts in source order and leaves another run waiting', () => {
    const plan = planProposalParts(current('', 0), [
      candidate('two', '', 0, 0, 'Hai', { proposalId: 'p1', rev: 0, sourceOrder: 1 }),
      candidate('one', '', 0, 0, 'Một', { proposalId: 'p1', rev: 0, sourceOrder: 0 }),
      candidate('other', '', 0, 0, 'Khác', { proposalId: 'p2', rev: 0 })
    ])
    expect(plan.content).toBe('Một\n\nHai')
    expect(plan.accepted).toEqual(['one', 'two'])
    expect(plan.skipped).toEqual([{ partId: 'other', reason: 'overlap' }])
    expect(planProposalParts(current('Đã có chữ', 1), [candidate('one', '', 0, 0, 'Một', { rev: 0 })]).accepted).toEqual([])
  })

  it('direct apply requires the exact base revision and content', () => {
    const item = candidate('a', 'Một\nHai', 4, 7, 'Khác')
    expect(planProposalParts(current('Trước\nMột\nHai', 2), [item], true).skipped[0].reason).toBe('target-changed')
  })

  it('leaves an unplaced part out of the write plan', () => {
    const plan = planProposalParts(current('Một'), [candidate('a', 'Một', null, null, 'Mới')])
    expect(plan).toEqual({
      content: 'Một', edits: [], accepted: [], skipped: [{ partId: 'a', reason: 'needs-placement' }]
    })
  })
})
