import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  BUILTIN_SOURCE_LANGUAGES,
  builtinLanguageProfile,
  createWorkSchema,
  sourceLanguageSchema
} from './library'

describe('source language contract', () => {
  it('accepts built-in Korean and valid BCP-47 tags without a built-in profile', () => {
    expect(v.parse(sourceLanguageSchema, 'ko')).toBe('ko')
    expect(v.parse(sourceLanguageSchema, 'fr-CA')).toBe('fr-CA')
    expect(v.parse(createWorkSchema, { title: '작품', sourceLang: 'ko' }).sourceLang).toBe('ko')
    expect(v.parse(createWorkSchema, { title: 'Roman', sourceLang: 'fr-CA' }).sourceLang).toBe(
      'fr-CA'
    )
  })

  it.each(['', 'not_a_tag', 'en--US', '-ko', 'x', 'en US'])(
    'rejects invalid BCP-47 tag %j',
    (tag) => {
      expect(v.is(sourceLanguageSchema, tag)).toBe(false)
    }
  )

  it('keeps persistence tags separate from closed built-in profiles', () => {
    expect(BUILTIN_SOURCE_LANGUAGES).toContain('ko')
    expect(builtinLanguageProfile('ko')).toEqual({ id: 'ko', locale: 'ko' })
    expect(builtinLanguageProfile('fr-CA')).toBeNull()
  })
})
