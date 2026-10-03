import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  addModelEntriesSchema,
  createConnectionSchema,
  modelEntryRefSchema,
  reorderModelEntriesSchema,
  updateConnectionSchema,
  updateModelEntrySchema
} from './aiConnections'

describe('connection address', () => {
  it('is saved as the base, however the user pasted it', () => {
    const created = v.parse(createConnectionSchema, {
      name: 'Gemini',
      baseUrl: ' https://generativelanguage.googleapis.com/v1beta/openai/chat/completions '
    })
    expect(created.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai')
  })

  it('is normalized on update too', () => {
    const updated = v.parse(updateConnectionSchema, {
      id: crypto.randomUUID(),
      patch: { baseUrl: 'http://127.0.0.1:11434/v1/' }
    })
    expect(updated.patch.baseUrl).toBe('http://127.0.0.1:11434/v1')
  })

  it('sets the default by the id of an entry, or clears it', () => {
    const id = crypto.randomUUID()
    const entry = crypto.randomUUID()
    expect(v.parse(updateConnectionSchema, { id, patch: { defaultEntryId: entry } })).toMatchObject(
      {
        patch: { defaultEntryId: entry }
      }
    )
    expect(v.parse(updateConnectionSchema, { id, patch: { defaultEntryId: null } })).toMatchObject({
      patch: { defaultEntryId: null }
    })
    // The old way, by model name, is gone: a name no longer says which entry.
    expect(() =>
      v.parse(updateConnectionSchema, { id, patch: { defaultModel: 'gemini' } })
    ).toThrow()
    expect(() =>
      v.parse(updateConnectionSchema, { id, patch: { defaultEntryId: 'gemini' } })
    ).toThrow()
  })

  it('still refuses something that is not an http address', () => {
    expect(() => v.parse(createConnectionSchema, { name: 'x', baseUrl: 'ftp://nope' })).toThrow()
    expect(() => v.parse(createConnectionSchema, { name: 'x', baseUrl: '' })).toThrow()
  })
})

describe('model entry schemas', () => {
  const ID = '5d6e7f80-9a1b-4c2d-8e3f-405162738495'
  const CONNECTION = '0b1c2d3e-4f50-4162-8374-95a6b7c8d9e0'
  const ok = (schema: v.GenericSchema, input: unknown): boolean =>
    v.safeParse(schema, input).success

  it('adds entries by model name, with an optional display name, and trims both', () => {
    const parsed = v.parse(addModelEntriesSchema, {
      connectionId: CONNECTION,
      items: [{ model: ' gemini-2.5-flash ', name: ' Flash ' }, { model: 'm' }]
    })
    expect(parsed.items).toEqual([{ model: 'gemini-2.5-flash', name: 'Flash' }, { model: 'm' }])
  })

  it('refuses an empty list, a blank model, and too many at once', () => {
    expect(ok(addModelEntriesSchema, { connectionId: CONNECTION, items: [] })).toBe(false)
    expect(ok(addModelEntriesSchema, { connectionId: CONNECTION, items: [{ model: '  ' }] })).toBe(
      false
    )
    const many = Array.from({ length: 101 }, (_, i) => ({ model: 'm' + i }))
    expect(ok(addModelEntriesSchema, { connectionId: CONNECTION, items: many })).toBe(false)
  })

  it('updates a name, a model and a settings patch together or apart', () => {
    expect(ok(updateModelEntrySchema, { entryId: ID, patch: { name: 'Mới' } })).toBe(true)
    expect(ok(updateModelEntrySchema, { entryId: ID, patch: { model: 'm2' } })).toBe(true)
    expect(
      ok(updateModelEntrySchema, { entryId: ID, patch: { settings: { thinking: 'off' } } })
    ).toBe(true)
    expect(ok(updateModelEntrySchema, { entryId: ID, patch: {} })).toBe(true)
  })

  it('rejects a settings patch that breaks a limit, naming the field in the reason', () => {
    const result = v.safeParse(updateModelEntrySchema, {
      entryId: ID,
      patch: { settings: { temperature: { enabled: true, value: 5 } } }
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.issues[0]!.message).toMatch(/Nhiệt độ/)
  })

  it('wants the id of an entry, never a model name', () => {
    expect(ok(updateModelEntrySchema, { entryId: 'gemini', patch: {} })).toBe(false)
    expect(ok(modelEntryRefSchema, { entryId: 'gemini' })).toBe(false)
    expect(ok(modelEntryRefSchema, { entryId: ID })).toBe(true)
  })

  it('reorders by the ids of entries', () => {
    expect(ok(reorderModelEntriesSchema, { connectionId: CONNECTION, ids: [ID, CONNECTION] })).toBe(
      true
    )
    expect(ok(reorderModelEntriesSchema, { connectionId: CONNECTION, ids: ['a'] })).toBe(false)
  })
})
