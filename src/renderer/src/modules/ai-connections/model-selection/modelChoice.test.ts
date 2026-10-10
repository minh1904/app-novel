import { describe, expect, it } from 'vitest'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import { resolveModelChoice } from './modelChoice'

const entry = (id: string): ConnectionView['models'][number] =>
  ({ id, name: id, model: id, settings: {} }) as unknown as ConnectionView['models'][number]

const connection = (
  id: string,
  models: string[],
  options: { enabled?: boolean; defaultEntryId?: string } = {}
): ConnectionView =>
  ({
    id,
    name: id,
    baseUrl: 'http://x',
    enabled: options.enabled ?? true,
    authKind: 'api_key',
    oauthProvider: null,
    apiMode: 'auto',
    account: null,
    providerId: null,
    defaultEntryId: options.defaultEntryId ?? null,
    checkedAt: null,
    keys: [],
    models: models.map(entry)
  }) as ConnectionView

const none = { connectionId: null, entryId: null }

describe('model choice', () => {
  const connections = [
    connection('a', ['a1', 'a2'], { defaultEntryId: 'a2' }),
    connection('b', ['b1'])
  ]

  it('uses what was picked first', () => {
    expect(
      resolveModelChoice(
        connections,
        { connectionId: 'b', entryId: 'b1' },
        { connectionId: 'a', entryId: 'a1' }
      )
    ).toEqual({ connectionId: 'b', entryId: 'b1', source: 'picked' })
  })

  it('uses the main model when nothing was picked', () => {
    expect(resolveModelChoice(connections, none, { connectionId: 'b', entryId: 'b1' })).toEqual({
      connectionId: 'b',
      entryId: 'b1',
      source: 'main'
    })
  })

  it('falls back to the first connection default, as before there was a main model', () => {
    expect(resolveModelChoice(connections, none, null)).toEqual({
      connectionId: 'a',
      entryId: 'a2',
      source: 'default'
    })
  })

  it('passes over a main model on a disabled connection or a deleted entry', () => {
    const off = [connection('a', ['a1']), connection('b', ['b1'], { enabled: false })]
    expect(resolveModelChoice(off, none, { connectionId: 'b', entryId: 'b1' })?.source).toBe(
      'default'
    )
    expect(
      resolveModelChoice(connections, none, { connectionId: 'a', entryId: 'gone' })?.entryId
    ).toBe('a2')
  })

  it('has nothing to offer without a usable connection', () => {
    expect(resolveModelChoice([connection('a', [])], none, null)).toBeNull()
  })
})
