import { describe, it, expect } from 'vitest'
import {
  extractParagraphs,
  findUnmatchedGlossaryEntries,
  checkWorkFixture,
  type LoadedWorkFixture
} from './fixtureCheck'

describe('fixtureCheck', () => {
  describe('extractParagraphs', () => {
    it('produces identical paragraphs for CRLF vs LF', () => {
      const textLF = 'Đoạn 1\nĐoạn 2\n\nĐoạn 3'
      const textCRLF = 'Đoạn 1\r\nĐoạn 2\r\n\r\nĐoạn 3'
      expect(extractParagraphs(textLF)).toEqual(extractParagraphs(textCRLF))
      expect(extractParagraphs(textLF)).toHaveLength(3)
    })

    it('ignores lines containing only whitespace or U+3000', () => {
      const text = 'Đoạn 1\n   \n\u3000\u3000\nĐoạn 2\n\u3000'
      const paras = extractParagraphs(text)
      expect(paras).toEqual(['Đoạn 1', 'Đoạn 2'])
    })
  })

  describe('findUnmatchedGlossaryEntries', () => {
    it('flags shorter term if it only appears inside a longer term (シュテルンハイム in イレーヌ・フォン・シュテルンハイム)', () => {
      const entries = [
        { src: 'イレーヌ・フォン・シュテルンハイム', tgt: 'Irene von Sternheim' },
        { src: 'シュテルンハイム', tgt: 'Sternheim' }
      ]
      // Văn bản gốc chỉ chứa tên đầy đủ
      const source = ['イレーヌ・フォン・シュテルンハイムは微笑んだ。']
      const unmatched = findUnmatchedGlossaryEntries(entries, source, 'ja')
      expect(unmatched).toContain('シュテルンハイム')
      expect(unmatched).not.toContain('イレーヌ・フォン・シュテルンハイム')
    })

    it('matches case-insensitively for English source (YISINI vs Yisini)', () => {
      const entries = [
        { src: 'Yisini', tgt: 'Yisini' },
        { src: 'Thassalin', tgt: 'Thassalin' }
      ]
      const source = ['AS YISINI DEMANDS. THASSALIN ROARED.']
      const unmatched = findUnmatchedGlossaryEntries(entries, source, 'en')
      expect(unmatched).toHaveLength(0)
    })
  })

  describe('checkWorkFixture', () => {
    const validFixture: LoadedWorkFixture = {
      work: {
        slug: 'test-work',
        lang: 'zh-Hans',
        title: 'Thử nghiệm',
        rights: 'Phạm vi công cộng',
        chapters: ['01']
      },
      isPublic: true,
      glossary: {
        status: 'approved',
        entries: [{ src: '孔乙己', tgt: 'Khổng Ất Kỷ' }]
      },
      pronouns: {
        pairs: [
          {
            speaker: 'tiểu nhị',
            listener: 'Khổng Ất Kỷ',
            self: 'tôi',
            address: 'hắn'
          }
        ]
      },
      chapters: [
        {
          id: '01',
          sourceText: '孔乙己是站着喝酒的人。\n掌柜正在结帐。',
          meta: {
            id: '01',
            paragraphs: 2
          },
          assertions: {
            status: 'approved',
            rules: [
              {
                where: '站着喝酒',
                kind: 'name',
                pair: ['tiểu nhị', 'Khổng Ất Kỷ'],
                mustContain: ['Khổng Ất Kỷ']
              }
            ]
          }
        }
      ]
    }

    it('passes for a valid fixture', () => {
      const issues = checkWorkFixture(validFixture)
      expect(issues).toEqual([])
    })

    it('reports missing rights for public fixture', () => {
      const fixture: LoadedWorkFixture = {
        ...validFixture,
        isPublic: true,
        work: {
          ...validFixture.work,
          rights: undefined,
          license: undefined
        }
      }
      const issues = checkWorkFixture(fixture)
      expect(issues.some((i) => i.code === 'MISSING_RIGHTS')).toBe(true)
    })

    it('reports paragraph count mismatch with meta.json', () => {
      const fixture: LoadedWorkFixture = {
        ...validFixture,
        chapters: [
          {
            ...validFixture.chapters[0],
            meta: {
              ...validFixture.chapters[0].meta,
              paragraphs: 5 // Dự kiến là 2
            }
          }
        ]
      }
      const issues = checkWorkFixture(fixture)
      expect(issues.some((i) => i.code === 'PARAGRAPH_COUNT_MISMATCH')).toBe(true)
    })

    it('reports invalid where anchor matching multiple paragraphs or none', () => {
      const fixture: LoadedWorkFixture = {
        ...validFixture,
        chapters: [
          {
            ...validFixture.chapters[0],
            assertions: {
              rules: [{ where: 'không tồn tại' }]
            }
          }
        ]
      }
      const issues = checkWorkFixture(fixture)
      expect(issues.some((i) => i.code === 'INVALID_WHERE_ANCHOR')).toBe(true)
    })

    it('reports unknown pronoun pair not defined in pronouns.json', () => {
      const fixture: LoadedWorkFixture = {
        ...validFixture,
        chapters: [
          {
            ...validFixture.chapters[0],
            assertions: {
              rules: [
                {
                  where: '站着喝酒',
                  pair: ['Người lạ', 'Khổng Ất Kỷ']
                }
              ]
            }
          }
        ]
      }
      const issues = checkWorkFixture(fixture)
      expect(issues.some((i) => i.code === 'UNKNOWN_PRONOUN_PAIR')).toBe(true)
    })

    it('reports reference translation paragraph count mismatch', () => {
      const fixture: LoadedWorkFixture = {
        ...validFixture,
        chapters: [
          {
            ...validFixture.chapters[0],
            referenceViText: 'Chỉ có 1 dòng duy nhất.'
          }
        ]
      }
      const issues = checkWorkFixture(fixture)
      expect(issues.some((i) => i.code === 'REFERENCE_PARAGRAPH_MISMATCH')).toBe(true)
    })
  })
})
