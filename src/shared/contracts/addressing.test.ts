import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createCharacterSchema,
  updateCharacterSchema,
  setDyadSchema,
  listCharactersSchema,
  listDyadsSchema
} from './addressing'

const WORK = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'
const CHAR_A = '5d6e7f80-9a1b-4c2d-8e3f-405162738491'
const CHAR_B = '5d6e7f80-9a1b-4c2d-8e3f-405162738492'

describe('addressing contracts', () => {
  it('validates a valid create character payload with defaults', () => {
    const res = v.safeParse(createCharacterSchema, {
      workId: WORK,
      source: '韩立',
      target: 'Hàn Lập'
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.output.gender).toBe('unknown')
      expect(res.output.status).toBe('approved')
      expect(res.output.aliases).toEqual([])
    }
  })

  it('rejects empty name or invalid gender', () => {
    expect(
      v.safeParse(createCharacterSchema, {
        workId: WORK,
        source: '  ',
        target: 'Hàn Lập'
      }).success
    ).toBe(false)

    expect(
      v.safeParse(createCharacterSchema, {
        workId: WORK,
        source: '韩立',
        target: 'Hàn Lập',
        gender: 'alien' as unknown
      }).success
    ).toBe(false)
  })

  it('validates update character payload', () => {
    const res = v.safeParse(updateCharacterSchema, {
      workId: WORK,
      characterId: CHAR_A,
      gender: 'male',
      role: 'Nhân vật chính',
      aliases: ['Lập Ca', 'Hàn Trưởng Lão']
    })
    expect(res.success).toBe(true)
  })

  it('validates set dyad payload', () => {
    const res = v.safeParse(setDyadSchema, {
      workId: WORK,
      sourceCharacterId: CHAR_A,
      targetCharacterId: CHAR_B,
      speakerPronoun: 'huynh',
      recipientPronoun: 'muội',
      formality: 'thân mật'
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.output.status).toBe('approved')
      expect(res.output.speakerPronoun).toBe('huynh')
    }
  })

  it('validates list options for characters and dyads', () => {
    expect(
      v.safeParse(listCharactersSchema, {
        workId: WORK,
        query: 'Hàn'
      }).success
    ).toBe(true)

    expect(
      v.safeParse(listDyadsSchema, {
        workId: WORK
      }).success
    ).toBe(true)
  })
})
