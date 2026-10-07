import { describe, expect, it } from 'vitest'
import { TRANSLATE_RESPONSE_SCHEMA, chooseOutputMode } from './outputMode'

describe('chooseOutputMode', () => {
  const yes = { structuredOutput: true }

  it('stays on the array contract when nobody asked', () => {
    expect(chooseOutputMode({ requested: false, capability: yes })).toEqual({ mode: 'array' })
  })

  it('does not send a schema to a model that does not take one', () => {
    expect(chooseOutputMode({ requested: true, capability: { structuredOutput: false } })).toEqual({
      mode: 'array',
      reason: 'unsupported'
    })
  })

  it('leaves a response_format the person set in extra_body alone', () => {
    expect(
      chooseOutputMode({
        requested: true,
        capability: yes,
        extraBody: { response_format: { type: 'json_object' } }
      })
    ).toEqual({ mode: 'array', reason: 'user_response_format' })
  })

  it('turns the schema on when asked and supported', () => {
    expect(chooseOutputMode({ requested: true, capability: yes, extraBody: {} })).toEqual({
      mode: 'object'
    })
  })
})

/** A tiny validator for the subset the schema uses: type, properties, items, required. */
function valid(schema: Record<string, unknown>, value: unknown): boolean {
  const type = schema.type
  if (type === 'string') return typeof value === 'string'
  if (type === 'array') {
    return (
      Array.isArray(value) &&
      value.every((item) => valid(schema.items as Record<string, unknown>, item))
    )
  }
  if (type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    const record = value as Record<string, unknown>
    const required = (schema.required as string[] | undefined) ?? []
    if (!required.every((key) => key in record)) return false
    const properties = (schema.properties as Record<string, Record<string, unknown>>) ?? {}
    return Object.entries(record).every(
      ([key, item]) => properties[key] === undefined || valid(properties[key], item)
    )
  }
  return false
}

/** Every keyword the schema uses, at any depth. */
function keywords(schema: unknown, out = new Set<string>()): Set<string> {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return out
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'properties') {
      out.add(key)

      for (const property of Object.values(value as object)) keywords(property, out)
      continue
    }
    out.add(key)
    keywords(value, out)
  }
  return out
}

describe('TRANSLATE_RESPONSE_SCHEMA', () => {
  it('uses only keywords and types in Google’s supported subset', () => {
    expect([...keywords(TRANSLATE_RESPONSE_SCHEMA)].sort()).toEqual([
      'items',
      'properties',
      'required',
      'type'
    ])
    const types = JSON.stringify(TRANSLATE_RESPONSE_SCHEMA).match(/"type":"(\w+)"/g)
    for (const type of types ?? [])
      expect(['"type":"object"', '"type":"array"', '"type":"string"']).toContain(type)
  })

  it('accepts a well-shaped answer and rejects an array root or an item without dst', () => {
    const schema = TRANSLATE_RESPONSE_SCHEMA as unknown as Record<string, unknown>
    expect(
      valid(schema, {
        items: [
          { id: '[1]', speaker_to_listener: 'A→B', self_ref: 'tôi', addr_ref: 'cậu', dst: 'Chào.' },
          { id: '[2]', dst: 'Trời mưa.' }
        ]
      })
    ).toBe(true)
    expect(valid(schema, [{ id: '[1]', dst: 'x' }])).toBe(false)
    expect(valid(schema, { items: [{ id: '[1]' }] })).toBe(false)
  })
})
