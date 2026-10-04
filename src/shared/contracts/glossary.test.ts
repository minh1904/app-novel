import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createGlossaryEntrySchema,
  updateGlossaryEntrySchema,
  listGlossarySchema
} from './glossary'

const WORK = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'
const ENTRY = '5d6e7f80-9a1b-4c2d-8e3f-405162738495'

describe('glossary contracts', () => {
  it('validates a valid create entry payload with defaults', () => {
    const res = v.safeParse(createGlossaryEntrySchema, {
      workId: WORK,
      source: '筑基',
      target: 'Trúc Cơ'
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.output.kind).toBe('term')
      expect(res.output.status).toBe('approved')
      expect(res.output.origin).toBe('user')
      expect(res.output.forbidden).toBe(false)
      expect(res.output.aliases).toEqual([])
    }
  })

  it('rejects empty source or target', () => {
    expect(
      v.safeParse(createGlossaryEntrySchema, {
        workId: WORK,
        source: '   ',
        target: 'Target'
      }).success
    ).toBe(false)
    expect(
      v.safeParse(createGlossaryEntrySchema, {
        workId: WORK,
        source: 'Source',
        target: ''
      }).success
    ).toBe(false)
  })

  it('validates update payload', () => {
    const res = v.safeParse(updateGlossaryEntrySchema, {
      workId: WORK,
      entryId: ENTRY,
      status: 'rejected',
      aliases: ['Alias 1', 'Alias 2']
    })
    expect(res.success).toBe(true)
  })

  it('validates list options', () => {
    expect(
      v.safeParse(listGlossarySchema, {
        workId: WORK,
        status: 'approved',
        query: '筑'
      }).success
    ).toBe(true)
  })
})
