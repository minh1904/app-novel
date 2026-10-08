import { describe, it, expect } from 'vitest'
import {
  checkStructure,
  checkResidualSourceChars,
  checkUnbalancedQuotes,
  classifyDialogueStyle,
  checkLengthOutliers,
  checkRepetitions,
  checkGlossaryCompliance,
  evaluateAssertions,
  containsWord
} from './translationChecks'
import type { Bead } from './paragraphAlign'
import type { GlossaryEntry, AssertionRule } from '../contracts/fixture'

describe('translationChecks', () => {
  describe('checkStructure', () => {
    it('reports match when all beads are 1-1', () => {
      const beads: Bead[] = [
        { type: '1-1', srcIdx: [0], tgtIdx: [0] },
        { type: '1-1', srcIdx: [1], tgtIdx: [1] }
      ]
      const score = checkStructure(2, 2, beads)
      expect(score.isPerfectMatch).toBe(true)
      expect(score.structureMismatch).toBe(false)
      expect(score.bead11Ratio).toBe(1.0)
    })

    it('reports structure mismatch when 1-1 ratio is below 0.85', () => {
      const beads: Bead[] = [
        { type: '1-1', srcIdx: [0], tgtIdx: [0] },
        { type: '1-0', srcIdx: [1], tgtIdx: [] },
        { type: '0-1', srcIdx: [], tgtIdx: [1] }
      ]
      const score = checkStructure(2, 2, beads)
      expect(score.structureMismatch).toBe(true)
      expect(score.isPerfectMatch).toBe(false)
      expect(score.beadCounts['1-0']).toBe(1)
      expect(score.beadCounts['0-1']).toBe(1)
    })
  })

  describe('checkResidualSourceChars', () => {
    it('detects CJK characters, brackets, and fullwidth punctuation in translation', () => {
      const src = ['おはようございます']
      const tgt = ['「Chào buổi sáng。」']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const issues = checkResidualSourceChars(src, tgt, beads)
      expect(issues).toHaveLength(1)
      expect(issues[0].chars).toContain('「')
      expect(issues[0].chars).toContain('」')
      expect(issues[0].chars).toContain('。')
    })

    it('exempts scene breaks (＊, ◇, ―)', () => {
      const src = ['＊＊＊']
      const tgt = ['＊ ◇ ―']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const issues = checkResidualSourceChars(src, tgt, beads)
      expect(issues).toHaveLength(0)
    })

    it('exempts paragraphs matching exemptWhere', () => {
      const src = ['茴香豆的茴字，怎样写的']
      const tgt = ['Chữ Hồi trong đậu hồi hương viết thế nào: 回']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const issues = checkResidualSourceChars(src, tgt, beads, {
        exemptWhere: ['茴香豆的茴字']
      })
      expect(issues).toHaveLength(0)
    })
  })

  describe('checkUnbalancedQuotes', () => {
    it('detects odd count of ASCII double quotes', () => {
      const tgt = ['"Đây là lời thoại nhưng thiếu ngoặc đóng']
      const issues = checkUnbalancedQuotes(tgt)
      expect(issues).toHaveLength(1)
      expect(issues[0].reason).toContain('ASCII')
    })

    it('detects mismatched curly, corner, and guillemet quotes', () => {
      const tgt = [
        '“Ngoặc cong mở không đóng',
        '「Ngoặc vuông mở',
        '«Ngoặc Pháp mở'
      ]
      const issues = checkUnbalancedQuotes(tgt)
      expect(issues).toHaveLength(3)
    })

    it('passes for balanced quotes', () => {
      const tgt = ['“Đúng rồi,” hắn nói. “Hoàn toàn cân.”', '«Oui!»']
      const issues = checkUnbalancedQuotes(tgt)
      expect(issues).toHaveLength(0)
    })
  })

  describe('classifyDialogueStyle', () => {
    it('classifies vi, cjk, other, mixed, none correctly', () => {
      expect(classifyDialogueStyle(['“Chào bạn”', '“Khỏe không?”']).style).toBe('vi')
      expect(classifyDialogueStyle(['「Konnichiwa」', '『Hai』']).style).toBe('cjk')
      expect(classifyDialogueStyle(['«Bonjour»']).style).toBe('other')
      expect(classifyDialogueStyle(['“Chào”', '「Ngoặc Nhật」']).style).toBe('mixed')
      expect(classifyDialogueStyle(['Không có thoại nào ở đây']).style).toBe('none')
    })
  })

  describe('checkLengthOutliers', () => {
    it('flags outlier length ratios outside the language band', () => {
      const src = ['一段很长很长的日文小说原文描述内容，超过二十个字。'] // 24 chars
      const tgt = ['Ngắn.'] // 5 chars -> ratio ~0.2 (below ja band [0.96, 2.71])
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const issues = checkLengthOutliers(src, tgt, beads, { sourceLang: 'ja' })
      expect(issues).toHaveLength(1)
      expect(issues[0].ratio).toBeLessThan(0.96)
    })

    it('ignores source paragraphs shorter than 20 visible characters', () => {
      const src = ['短句'] // 2 chars
      const tgt = ['Dòng ngắn dịch ra cũng ngắn']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const issues = checkLengthOutliers(src, tgt, beads, { sourceLang: 'ja' })
      expect(issues).toHaveLength(0)
    })
  })

  describe('checkRepetitions', () => {
    it('detects consecutive identical paragraphs', () => {
      const tgt = [
        'Đoạn văn này được lặp lại hai lần liên tiếp.',
        'Đoạn văn này được lặp lại hai lần liên tiếp.'
      ]
      const issues = checkRepetitions(tgt)
      expect(issues).toHaveLength(1)
      expect(issues[0].reason).toContain('ngay trước')
    })

    it('detects 4-word grams repeated 4+ times in a paragraph', () => {
      const text =
        'chạy đi chạy lại chạy đi chạy lại chạy đi chạy lại chạy đi chạy lại không ngừng nghỉ'
      const issues = checkRepetitions([text])
      expect(issues).toHaveLength(1)
      expect(issues[0].reason).toContain('Lặp vòng')
    })
  })

  describe('checkGlossaryCompliance', () => {
    it('handles hoà/hòa tone mark equivalence (both count as strict hit)', () => {
      const src = ['咸亨酒店']
      const tgt = ['quán rượu Hàm Hoà'] // alternative tone mark for Hòa
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]
      const glossary: GlossaryEntry[] = [{ src: '咸亨酒店', tgt: 'quán rượu Hàm Hòa' }]

      const res = checkGlossaryCompliance(src, tgt, beads, glossary)
      expect(res.strictHits).toBe(1)
      expect(res.lenientHits).toBe(1)
    })

    it('handles whole-word boundary for forbidden term (dì vs dìu)', () => {
      expect(containsWord('cô bé dìu bà cụ qua đường', 'dì')).toBe(false)
      expect(containsWord('chào dì Irene nhé', 'dì')).toBe(true)

      const src = ['わたくしをおば様と呼ぶ']
      const tgt = ['cô bé dìu tôi đi'] // contains "dìu", not "dì"
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]
      const glossary: GlossaryEntry[] = [
        { src: 'おば様', tgt: 'mợ', forbidden: ['dì'] }
      ]

      const res = checkGlossaryCompliance(src, tgt, beads, glossary)
      expect(res.forbiddenHits).toBe(0)

      // When "dì" is used directly as word:
      const tgtWithForbidden = ['chào dì nhé']
      const res2 = checkGlossaryCompliance(src, tgtWithForbidden, beads, glossary)
      expect(res2.forbiddenHits).toBe(1)
    })

    it('handles lenient hits for alternatives (núi Hoa Quả vs Hoa Quả Sơn)', () => {
      const src = ['花果山水簾洞']
      const tgt = ['ở Hoa Quả Sơn có động Thủy Liêm']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]
      const glossary: GlossaryEntry[] = [
        {
          src: '花果山',
          tgt: 'núi Hoa Quả',
          alternatives: ['Hoa Quả Sơn']
        }
      ]

      const res = checkGlossaryCompliance(src, tgt, beads, glossary)
      expect(res.strictHits).toBe(0) // not "núi Hoa Quả"
      expect(res.lenientHits).toBe(1) // accepted via alternatives
    })

    it('counts occurrences in omitted source paragraphs (1-0) as missed', () => {
      const src = ['花果山']
      const tgt: string[] = []
      const beads: Bead[] = [{ type: '1-0', srcIdx: [0], tgtIdx: [] }]
      const glossary: GlossaryEntry[] = [{ src: '花果山', tgt: 'núi Hoa Quả' }]

      const res = checkGlossaryCompliance(src, tgt, beads, glossary)
      expect(res.totalChecks).toBe(1)
      expect(res.strictHits).toBe(0)
      expect(res.lenientHits).toBe(0)
      expect(res.missedTerms[0].term).toBe('花果山')
    })
  })

  describe('evaluateAssertions', () => {
    it('evaluates rule with mustContain and mustNotContainWord (mợ/dì)', () => {
      const src = ['わたくしをおば様と呼ぶ娘']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const rules: AssertionRule[] = [
        {
          where: 'おば様',
          mustContain: ['mợ'],
          mustNotContainWord: ['dì']
        }
      ]

      // Pass case
      const tgtPass = ['cô bé gọi tôi là mợ']
      const resPass = evaluateAssertions(src, tgtPass, beads, rules)
      expect(resPass[0].result).toBe('pass')

      // Fail case (uses "dì")
      const tgtFail = ['cô bé gọi tôi là dì Irene']
      const resFail = evaluateAssertions(src, tgtFail, beads, rules)
      expect(resFail[0].result).toBe('fail')
      expect(resFail[0].reason).toContain('dì')
    })

    it('returns manual for rules that only have note/pair', () => {
      const src = ['窃书不能算偷']
      const tgt = ['Trộm sách không thể coi là ăn cắp']
      const beads: Bead[] = [{ type: '1-1', srcIdx: [0], tgtIdx: [0] }]

      const rules: AssertionRule[] = [
        {
          where: '窃书不能算偷',
          pair: ['Khổng Ất Kỷ', 'khách'],
          note: 'Cần người chấm kiểm tra giọng điệu'
        }
      ]

      const res = evaluateAssertions(src, tgt, beads, rules)
      expect(res[0].result).toBe('manual')
    })

    it('fails rule with "đoạn bị sót" if anchor paragraph was omitted', () => {
      const src = ['消失的段落']
      const tgt: string[] = []
      const beads: Bead[] = [{ type: '1-0', srcIdx: [0], tgtIdx: [] }]

      const rules: AssertionRule[] = [
        {
          where: '消失',
          mustContain: ['biến mất']
        }
      ]

      const res = evaluateAssertions(src, tgt, beads, rules)
      expect(res[0].result).toBe('fail')
      expect(res[0].reason).toBe('đoạn bị sót')
    })
  })
})
