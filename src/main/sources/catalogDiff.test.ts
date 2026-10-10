import { describe, expect, it } from 'vitest'
import type { CatalogItem } from './domain'
import { diffCatalog, validateCatalogSnapshot } from './catalogDiff'

const identity = { sourceId: 'mira.test', remoteWorkId: 'work-1' }
const one: CatalogItem = {
  remoteChapterId: '1',
  title: 'Chapter One',
  order: 1,
  access: 'public',
  identityConfidence: 'stable'
}

function snapshot(items: CatalogItem[], complete = true) {
  return { ...identity, items, complete, exhausted: complete }
}

describe('catalog snapshot validation', () => {
  it('rejects duplicate IDs, wrong work identity, incomplete pagination and suspicious count drops', () => {
    expect(
      validateCatalogSnapshot(snapshot([one, one]), { ...identity, previousCount: 1 }).valid
    ).toBe(false)
    expect(
      validateCatalogSnapshot({ ...snapshot([one]), remoteWorkId: 'other' }, identity).valid
    ).toBe(false)
    expect(validateCatalogSnapshot(snapshot([one], false), identity).valid).toBe(false)
    expect(
      validateCatalogSnapshot(snapshot([one]), {
        ...identity,
        previousCount: 10,
        maxDropRatio: 0.5
      }).valid
    ).toBe(false)
  })
})

describe('catalog diff', () => {
  it('detects add, rename, move and access changes with stable idempotent dedupe keys', () => {
    const added = diffCatalog([], snapshot([one]), '2026-01-01T00:00:00.000Z')
    const changedItem = {
      ...added.items[0],
      title: 'Renamed',
      order: 2,
      access: 'login_required' as const
    }
    const changed = diffCatalog(added.items, snapshot([changedItem]), '2026-01-02T00:00:00.000Z')
    const repeated = diffCatalog(added.items, snapshot([changedItem]), '2026-01-03T00:00:00.000Z')

    expect(added.events.map((event) => event.kind)).toEqual(['added'])
    expect(changed.events.map((event) => event.kind)).toEqual([
      'renamed',
      'moved',
      'access_changed'
    ])
    expect(changed.events.map((event) => event.dedupeKey)).toEqual(
      repeated.events.map((event) => event.dedupeKey)
    )
  })

  it('does not mutate catalog state or advance missing streak for an invalid snapshot', () => {
    const present = diffCatalog([], snapshot([one]), '2026-01-01T00:00:00.000Z').items
    const result = diffCatalog(
      present,
      { ...snapshot([]), complete: false, exhausted: false },
      '2026-01-02T00:00:00.000Z'
    )

    expect(result.valid).toBe(false)
    expect(result.items).toEqual(present)
    expect(result.events).toEqual([])
  })

  it('confirms removal only after three valid missing snapshots without deleting the item', () => {
    const present = diffCatalog([], snapshot([one]), '2026-01-01T00:00:00.000Z')
    const missing1 = diffCatalog(present.items, snapshot([]), '2026-01-02T00:00:00.000Z')
    const missing2 = diffCatalog(missing1.items, snapshot([]), '2026-01-03T00:00:00.000Z')
    const missing3 = diffCatalog(missing2.items, snapshot([]), '2026-01-04T00:00:00.000Z')

    expect(missing1.items[0].missingStreak).toBe(1)
    expect(missing2.items[0].missingStreak).toBe(2)
    expect(missing1.events).toEqual([])
    expect(missing2.events).toEqual([])
    expect(missing3.items).toHaveLength(1)
    expect(missing3.items[0]).toMatchObject({
      missingStreak: 3,
      removedAt: '2026-01-04T00:00:00.000Z'
    })
    expect(missing3.events.map((event) => event.kind)).toEqual(['missing_remote'])
  })

  it('preserves first-seen identity and emits reappeared after suspected or confirmed removal', () => {
    const present = diffCatalog([], snapshot([one]), '2026-01-01T00:00:00.000Z')
    const missing1 = diffCatalog(present.items, snapshot([]), '2026-01-02T00:00:00.000Z')
    const missing2 = diffCatalog(missing1.items, snapshot([]), '2026-01-03T00:00:00.000Z')
    const returns = diffCatalog(missing2.items, snapshot([one]), '2026-01-04T00:00:00.000Z')
    const absentAgain = diffCatalog(returns.items, snapshot([]), '2026-01-05T00:00:00.000Z')
    const absentTwice = diffCatalog(absentAgain.items, snapshot([]), '2026-01-06T00:00:00.000Z')
    const removed = diffCatalog(absentTwice.items, snapshot([]), '2026-01-07T00:00:00.000Z')
    const returnsAfterRemoval = diffCatalog(
      removed.items,
      snapshot([one]),
      '2026-01-08T00:00:00.000Z'
    )

    expect(returns.items[0]).toMatchObject({
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      missingStreak: 0,
      removedAt: undefined
    })
    expect(returns.events.map((event) => event.kind)).toEqual(['reappeared'])
    expect(returnsAfterRemoval.items[0]).toMatchObject({ missingStreak: 0, removedAt: undefined })
    expect(returnsAfterRemoval.events.map((event) => event.kind)).toEqual(['reappeared'])
  })
})
