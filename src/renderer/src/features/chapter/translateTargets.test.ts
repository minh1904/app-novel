import { describe, expect, it } from 'vitest'
import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import type { ModelEntryView } from '../../../../shared/contracts/modelSettings'
import { targetKey, targetsOf } from './translateTargets'

const entry = (id: string, name = id): ModelEntryView => ({
  id,
  name,
  model: 'm',
  settings: {},
  capability: { thinkingLevels: [], temperature: true, structuredOutput: false }
})

const connection = (
  id: string,
  models: ModelEntryView[],
  over: Partial<ConnectionView> = {}
): ConnectionView => ({
  id,
  name: 'Kết nối ' + id,
  baseUrl: 'http://x/v1',
  enabled: true,
  providerId: null,
  defaultEntryId: null,
  checkedAt: null,
  keys: [],
  models,
  ...over
})

describe('targetsOf', () => {
  it('offers every entry of every enabled connection', () => {
    const targets = targetsOf([
      connection('a', [entry('a1'), entry('a2')]),
      connection('b', [entry('b1')])
    ])
    expect(targets.map((target) => target.entryId)).toEqual(['a1', 'a2', 'b1'])
  })

  it('puts the default entry of a connection first, and keeps the arranged order for the rest', () => {
    const targets = targetsOf([
      connection('a', [entry('a1'), entry('a2'), entry('a3')], { defaultEntryId: 'a3' })
    ])
    expect(targets.map((target) => target.entryId)).toEqual(['a3', 'a1', 'a2'])
  })

  it('does not reorder the connections themselves', () => {
    const targets = targetsOf([
      connection('a', [entry('a1')]),
      connection('b', [entry('b1'), entry('b2')], { defaultEntryId: 'b2' })
    ])
    expect(targets.map((target) => target.entryId)).toEqual(['a1', 'b2', 'b1'])
  })

  it('skips a connection that is switched off', () => {
    const targets = targetsOf([
      connection('a', [entry('a1')], { enabled: false }),
      connection('b', [entry('b1')])
    ])
    expect(targets.map((target) => target.entryId)).toEqual(['b1'])
  })

  it('skips a connection with no entries, because there is nothing to call', () => {
    expect(targetsOf([connection('a', [])])).toEqual([])
  })

  it('keeps two entries of one model apart, each under its own id and name', () => {
    const targets = targetsOf([
      connection('a', [entry('x', 'Flash nhanh'), entry('y', 'Flash kỹ')])
    ])
    expect(targets.map((target) => target.label)).toEqual([
      'Kết nối a · Flash nhanh',
      'Kết nối a · Flash kỹ'
    ])
    expect(
      new Set(targets.map((target) => targetKey(target.connectionId, target.entryId))).size
    ).toBe(2)
  })

  it('ignores a default that points at an entry that is no longer there', () => {
    const targets = targetsOf([
      connection('a', [entry('a1'), entry('a2')], { defaultEntryId: 'gone' })
    ])
    expect(targets.map((target) => target.entryId)).toEqual(['a1', 'a2'])
  })

  it('does not change the list it was given', () => {
    const list = [connection('a', [entry('a1'), entry('a2')], { defaultEntryId: 'a2' })]
    targetsOf(list)
    expect(list[0]!.models.map((item) => item.id)).toEqual(['a1', 'a2'])
  })
})

describe('targetKey', () => {
  it('joins the connection and the entry, so the same entry id under two connections never collides', () => {
    expect(targetKey('c1', 'e')).not.toBe(targetKey('c2', 'e'))
    expect(targetKey('c', 'e')).toBe('c|e')
  })
})
