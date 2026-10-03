import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { translateBatchSchema, translatePlanSchema } from './aiTranslate'

const WORK = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'
const CHAPTER = '2b3c4d5e-6f70-4812-9a3b-4c5d6e7f8091'
const CONNECTION = '0b1c2d3e-4f50-4162-8374-95a6b7c8d9e0'
const ENTRY = '5d6e7f80-9a1b-4c2d-8e3f-405162738495'
const SEGMENT = '6e7f8091-a2b3-4c4d-9e5f-60718293a4b5'
const KEY = 'a'.repeat(64)

describe('translatePlanSchema', () => {
  const plan = { workId: WORK, chapterId: CHAPTER, connectionId: CONNECTION, entryId: ENTRY }

  it('picks the model by the id of an entry', () => {
    expect(v.safeParse(translatePlanSchema, plan).success).toBe(true)
  })

  it('refuses a model name in place of an entry id, and the old field', () => {
    expect(
      v.safeParse(translatePlanSchema, { ...plan, entryId: 'gemini-flash-latest' }).success
    ).toBe(false)
    expect(
      v.safeParse(translatePlanSchema, {
        ...plan,
        entryId: undefined,
        model: 'gemini-flash-latest'
      }).success
    ).toBe(false)
  })
})

describe('translateBatchSchema', () => {
  const batch = {
    workId: WORK,
    chapterId: CHAPTER,
    connectionId: CONNECTION,
    entryId: ENTRY,
    settingsKey: KEY,
    sourceIds: [SEGMENT],
    expectedRev: 0
  }

  it('carries the entry and the settings key the plan was made with', () => {
    expect(v.safeParse(translateBatchSchema, batch).success).toBe(true)
  })

  it('refuses a batch without a settings key, so the check against edits cannot be skipped', () => {
    expect(v.safeParse(translateBatchSchema, { ...batch, settingsKey: undefined }).success).toBe(
      false
    )
  })

  it('refuses a settings key that is not a SHA-256 digest', () => {
    for (const settingsKey of ['', 'abc', 'A'.repeat(64), 'g'.repeat(64), KEY + 'a']) {
      expect(
        v.safeParse(translateBatchSchema, { ...batch, settingsKey }).success,
        settingsKey
      ).toBe(false)
    }
  })
})
