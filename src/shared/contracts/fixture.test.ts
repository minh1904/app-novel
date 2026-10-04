import { describe, it, expect } from 'vitest'
import * as v from 'valibot'
import {
  WorkFixtureSchema,
  GlossaryFileSchema,
  PronounsFileSchema,
  ChapterMetaSchema,
  AssertionsFileSchema,
  normalizeGlossaryEntries,
  normalizeAssertionRules
} from './fixture'

describe('fixture contracts', () => {
  describe('WorkFixtureSchema', () => {
    it('accepts valid work schemas for each of the 4 fixture styles', () => {
      // 1. zh-kongyiji style
      const kongyiji = {
        slug: 'zh-kongyiji',
        lang: 'zh-Hans',
        title: '孔乙己',
        author: '鲁迅',
        rights: 'Phạm vi công cộng',
        chapters: ['01']
      }
      expect(v.is(WorkFixtureSchema, kongyiji)).toBe(true)

      // 2. zh-hant-xiyouji style
      const xiyouji = {
        slug: 'zh-hant-xiyouji',
        lang: 'zh-Hant',
        title: '西遊記',
        author: '吳承恩',
        rights: 'Phạm vi công cộng',
        chapters: ['02']
      }
      expect(v.is(WorkFixtureSchema, xiyouji)).toBe(true)

      // 3. en-fight-above-the-trees style
      const enWork = {
        slug: 'en-fight-above-the-trees',
        lang: 'en',
        title: 'fight above the trees',
        author: null,
        rights: 'Apache-2.0',
        chapters: ['01']
      }
      expect(v.is(WorkFixtureSchema, enWork)).toBe(true)

      // 4. ja-irene style
      const jaWork = {
        slug: 'ja-irene',
        lang: 'ja',
        title: null,
        author: null,
        rights: 'Có bản quyền',
        chapters: ['01', '02', '03', '04', '05']
      }
      expect(v.is(WorkFixtureSchema, jaWork)).toBe(true)
    })

    it('rejects unsupported language like ko', () => {
      const koWork = {
        slug: 'ko-test',
        lang: 'ko',
        title: 'Test',
        rights: 'Public',
        chapters: ['01']
      }
      expect(v.is(WorkFixtureSchema, koWork)).toBe(false)
    })

    it('rejects work missing both slug and id', () => {
      const invalidWork = {
        lang: 'ja',
        title: 'Test',
        chapters: ['01']
      }
      expect(v.is(WorkFixtureSchema, invalidWork)).toBe(false)
    })
  })

  describe('GlossaryFileSchema', () => {
    it('validates approved glossary object with entries and aliases', () => {
      const glossary = {
        status: 'approved',
        approved: '2026-10-04 by PO',
        entries: [
          {
            src: '孔乙己',
            tgt: 'Khổng Ất Kỷ',
            type: 'person',
            decision: true
          },
          {
            src: '孫悟空',
            tgt: 'Tôn Ngộ Không',
            type: 'person',
            aliases: [{ src: '悟空', tgt: 'Ngộ Không' }]
          },
          {
            src: 'ヴィルヘルム',
            tgt: 'Wilhelm',
            type: 'person',
            forbidden: ['Vilhelm']
          }
        ]
      }
      expect(v.is(GlossaryFileSchema, glossary)).toBe(true)
      const normalized = normalizeGlossaryEntries(v.parse(GlossaryFileSchema, glossary))
      expect(normalized.status).toBe('approved')
      expect(normalized.entries).toHaveLength(3)
    })

    it('rejects invalid decision type (string instead of boolean)', () => {
      const invalidGlossary = {
        status: 'approved',
        entries: [
          {
            src: 'test',
            tgt: 'test',
            decision: 'true' // invalid! must be boolean
          }
        ]
      }
      expect(v.is(GlossaryFileSchema, invalidGlossary)).toBe(false)
    })
  })

  describe('PronounsFileSchema', () => {
    it('validates pronouns file with pairs and narration', () => {
      const pronouns = {
        status: 'approved',
        narration: [
          { chapters: ['01'], pov: 'first', self: 'tôi' }
        ],
        pairs: [
          {
            speaker: 'Tổ sư',
            listener: 'Ngộ Không',
            self: 'ta',
            address: 'ngươi',
            fromChapter: '02'
          },
          {
            speaker: 'tiểu yêu',
            listener: 'Hỗn Thế Ma Vương',
            self: null,
            address: 'Đại vương'
          }
        ]
      }
      expect(v.is(PronounsFileSchema, pronouns)).toBe(true)
    })
  })

  describe('ChapterMetaSchema', () => {
    it('validates chapter meta', () => {
      const meta = {
        id: '01',
        paragraphs: 15,
        chars: 2614,
        tags: ['dialogue']
      }
      expect(v.is(ChapterMetaSchema, meta)).toBe(true)
    })
  })

  describe('AssertionsFileSchema', () => {
    it('validates assertions with where or line anchors', () => {
      const assertions = {
        status: 'draft',
        rules: [
          { where: '孔乙己', kind: 'name', mustContain: ['Khổng Ất Kỷ'] },
          { line: '＊＊＊', kind: 'structure', mustContainAny: ['***'] },
          { where: 'short dialogue', pair: ['A', 'B'] as [string, string], note: 'check tone' }
        ]
      }
      expect(v.is(AssertionsFileSchema, assertions)).toBe(true)
      const normalized = normalizeAssertionRules(v.parse(AssertionsFileSchema, assertions))
      expect(normalized.rules).toHaveLength(3)
    })

    it('rejects rule without where or line', () => {
      const invalid = {
        status: 'draft',
        rules: [
          { kind: 'meaning', mustContain: ['test'] } // missing both where and line!
        ]
      }
      expect(v.is(AssertionsFileSchema, invalid)).toBe(false)
    })
  })
})
