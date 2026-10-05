import type { StoredProposal, StoredProposalPart } from '../../infra/storage/aiProposals'
import type { Edit } from '../../../shared/algorithms/segmentMap'

export interface Candidate {
  proposal: StoredProposal
  part: StoredProposalPart
}

export interface PlannedPart {
  partId: string
  reason: 'source-changed' | 'target-changed' | 'ambiguous' | 'overlap' | 'needs-placement' | 'invalid-base'
}

export interface ProposalPlan {
  content: string
  edits: Edit[]
  accepted: string[]
  skipped: PlannedPart[]
}

function allOccurrences(haystack: string, needle: string): number[] {
  const places: number[] = []
  let at = haystack.indexOf(needle)
  while (at >= 0 && places.length < 2) {
    places.push(at)
    at = haystack.indexOf(needle, at + 1)
  }
  return places
}

function paragraphBoundaryPreserved(base: string, from: number, to: number,
  current: string, at: number, length: number): boolean {
  const leftWasBreak = from > 0 && base[from - 1] === '\n'
  const rightWasBreak = to < base.length && base[to] === '\n'
  const leftStillBreak = at === 0 || current[at - 1] === '\n'
  const rightStillBreak = at + length === current.length || current[at + length] === '\n'
  return (!leftWasBreak || leftStillBreak) && (!rightWasBreak || rightStillBreak)
}

interface Span {
  candidate: Candidate
  from: number
  to: number
}

/**
 * Plans every part against the same current revision, before any mutation. A changed base may be
 * rebased only when its original text occurs exactly once. Empty inserts are grouped per proposal;
 * an empty base from another run must not silently append to an accepted translation.
 */
export function planProposalParts(
  current: { content: string; rev: number; sourceHash: string },
  candidates: Candidate[],
  strictBase = false
): ProposalPlan {
  const accepted: string[] = []
  const skipped: PlannedPart[] = []
  const spans: Span[] = []
  const blankGroups = new Map<string, Candidate[]>()

  for (const candidate of candidates) {
    const { proposal, part } = candidate
    if (part.status !== 'pending' && part.status !== 'conflict' &&
      part.status !== 'stale' && part.status !== 'needs-placement') continue
    if (proposal.sourceHash !== current.sourceHash) {
      skipped.push({ partId: part.id, reason: 'source-changed' })
      continue
    }
    if (part.baseFrom === null || part.baseTo === null) {
      skipped.push({ partId: part.id, reason: 'needs-placement' })
      continue
    }
    if (
      part.baseTo > proposal.targetBaseContent.length ||
      proposal.targetBaseContent.slice(part.baseFrom, part.baseTo) !== part.beforeText
    ) {
      skipped.push({ partId: part.id, reason: 'invalid-base' })
      continue
    }

    if (part.beforeText === '') {
      const applied = (proposal.parts ?? []).filter((item) => item.status === 'applied').sort((a, b) =>
        (a.sourceOrder ?? a.ordinal) - (b.sourceOrder ?? b.ordinal)
      )
      const expectedCurrent = applied.map((item) => item.afterText).join('\n\n')
      if (proposal.targetBaseContent !== '' || current.content !== expectedCurrent ||
        (strictBase && (applied.length > 0 || current.rev !== proposal.targetBaseRev))) {
        skipped.push({ partId: part.id, reason: 'target-changed' })
        continue
      }
      const group = blankGroups.get(proposal.id) ?? []
      group.push(candidate)
      blankGroups.set(proposal.id, group)
      continue
    }

    if (strictBase && (current.rev !== proposal.targetBaseRev || current.content !== proposal.targetBaseContent)) {
      skipped.push({ partId: part.id, reason: 'target-changed' })
      continue
    }
    if (current.rev === proposal.targetBaseRev && current.content === proposal.targetBaseContent) {
      spans.push({ candidate, from: part.baseFrom, to: part.baseTo })
      continue
    }
    const occurrences = allOccurrences(current.content, part.beforeText)
    if (occurrences.length !== 1) {
      skipped.push({ partId: part.id, reason: occurrences.length === 0 ? 'target-changed' : 'ambiguous' })
      continue
    }
    if (!paragraphBoundaryPreserved(proposal.targetBaseContent, part.baseFrom, part.baseTo,
      current.content, occurrences[0], part.beforeText.length)) {
      skipped.push({ partId: part.id, reason: 'target-changed' })
      continue
    }
    spans.push({ candidate, from: occurrences[0], to: occurrences[0] + part.beforeText.length })
  }

  if (blankGroups.size > 0) {
    const groups = [...blankGroups.values()].sort((a, b) =>
      a[0].proposal.createdAt - b[0].proposal.createdAt ||
      a[0].proposal.id.localeCompare(b[0].proposal.id)
    )
    const chosen = groups[0].sort((a, b) =>
      (a.part.sourceOrder ?? a.part.ordinal) - (b.part.sourceOrder ?? b.part.ordinal)
    )
    spans.push({ candidate: chosen[0], from: 0, to: current.content.length })
    for (const other of groups.slice(1).flat()) {
      skipped.push({ partId: other.part.id, reason: 'overlap' })
    }
    const applied = (chosen[0].proposal.parts ?? []).filter((item) => item.status === 'applied')
    const joined = [...applied, ...chosen.map((item) => item.part)]
      .sort((a, b) => (a.sourceOrder ?? a.ordinal) - (b.sourceOrder ?? b.ordinal))
      .map((item) => item.afterText).join('\n\n')
    const synthetic = spans[spans.length - 1]
    synthetic.candidate = {
      ...synthetic.candidate,
      part: { ...synthetic.candidate.part, afterText: joined }
    }
    for (const item of chosen) accepted.push(item.part.id)
  }

  // One contiguous replacement can be accepted; overlapping candidates cannot silently win by order.
  spans.sort((a, b) => a.from - b.from || a.to - b.to)
  const conflicted = new Set<string>()
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (spans[j].from >= spans[i].to && spans[j].from !== spans[i].from) break
      conflicted.add(spans[i].candidate.part.id)
      conflicted.add(spans[j].candidate.part.id)
    }
  }
  let content = current.content
  const edits: Edit[] = []
  for (const span of spans.reverse()) {
    const id = span.candidate.part.id
    if (conflicted.has(id)) {
      skipped.push({ partId: id, reason: 'overlap' })
      continue
    }
    content = content.slice(0, span.from) + span.candidate.part.afterText + content.slice(span.to)
    edits.push({ from: span.from, to: span.to, insert: span.candidate.part.afterText })
    if (!accepted.includes(id)) accepted.push(id)
  }
  return {
    content,
    edits: edits.reverse(),
    accepted: accepted.filter((id) => !conflicted.has(id)),
    skipped
  }
}
