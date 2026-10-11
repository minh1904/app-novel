import type { SourceLanguage } from '../contracts/library'
import type { GlossaryEntry, AssertionRule } from '../contracts/fixture'
import type { Bead } from './paragraphAlign'

export interface CheckOptions {
  sourceLang?: SourceLanguage
  exemptWhere?: string[]
  ratioBand?: [number, number]
}

export interface StructuralScore {
  sourceParagraphs: number
  targetParagraphs: number
  beadCounts: Record<string, number>
  bead11Ratio: number
  structureMismatch: boolean
  isPerfectMatch: boolean
}

export interface ResidualCharsIssue {
  beadIndex: number
  paragraphIndex: number
  chars: string[]
}

export interface UnbalancedQuoteIssue {
  paragraphIndex: number
  reason: string
}

export type DialogueStyle = 'vi' | 'cjk' | 'other' | 'mixed' | 'none'

export interface DialogueStyleResult {
  style: DialogueStyle
  counts: Record<string, number>
}

export interface OutlierLengthIssue {
  beadIndex: number
  srcLen: number
  tgtLen: number
  ratio: number
  band: [number, number]
}

export interface RepetitionIssue {
  paragraphIndex: number
  reason: string
  pattern?: string
}

export interface GlossaryComplianceResult {
  totalChecks: number
  strictHits: number
  lenientHits: number
  forbiddenHits: number
  missedTerms: Array<{ term: string; count: number }>
  forbiddenViolations: Array<{ term: string; paragraphIndex: number }>
}

export interface AssertionEvaluation {
  ruleIndex: number
  result: 'pass' | 'fail' | 'manual'
  reason?: string
}

// Dải tỷ lệ độ dài mặc định theo ngôn ngữ: [tối thiểu, tối đa]
const DEFAULT_BANDS: Record<string, [number, number]> = {
  'zh-Hans': [1.36, 3.76],
  'zh-Hant': [1.36, 3.76],
  ja: [0.96, 2.71],
  en: [0.6, 1.55]
}

/**
 * Chuẩn hóa văn bản tiếng Việt:
 * 1. Định dạng Unicode NFC
 * 2. Thống nhất hai kiểu đặt dấu thanh (hòa/hoà, thúy/thuý, v.v.)
 * 3. Chuyển sang chữ thường để so sánh
 */
export function normalizeVietnamese(text: string): string {
  let s = text.normalize('NFC').toLowerCase()

  // Quy đổi kiểu đặt dấu thanh cũ (oà, oá, oả, oã, oạ) về kiểu mới thống nhất (òa, óa, ỏa, õa, họa)
  s = s
    .replace(/oà/g, 'òa')
    .replace(/oá/g, 'óa')
    .replace(/oả/g, 'ỏa')
    .replace(/oã/g, 'õa')
    .replace(/oạ/g, 'ọa')
    .replace(/uỳ/g, 'ùy')
    .replace(/uý/g, 'úy')
    .replace(/uỷ/g, 'ủy')
    .replace(/uỹ/g, 'ũy')
    .replace(/uỵ/g, 'ụy')
    .replace(/oè/g, 'òe')
    .replace(/oé/g, 'óe')
    .replace(/oẻ/g, 'ỏe')
    .replace(/oẽ/g, 'õe')
    .replace(/oẹ/g, 'ọe')

  return s
}

/**
 * Kiểm tra sự xuất hiện của từ nguyên vẹn bằng ranh giới ký tự Unicode.
 * Tránh trường hợp "dì" bị khớp nhầm bên trong "dìu".
 */
export function containsWord(text: string, word: string): boolean {
  const normText = normalizeVietnamese(text)
  const normWord = normalizeVietnamese(word)
  // Thoát ký tự đặc biệt của biểu thức chính quy
  const escaped = normWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Ranh giới từ Unicode: không đứng trước hoặc sau bởi ký tự chữ hoặc dấu phụ
  const re = new RegExp(`(?<![\\p{L}\\p{M}])${escaped}(?![\\p{L}\\p{M}])`, 'gu')
  return re.test(normText)
}

/**
 * Thống kê cấu trúc đoạn từ các cặp gióng hàng (bead).
 */
export function checkStructure(srcCount: number, tgtCount: number, beads: Bead[]): StructuralScore {
  const beadCounts: Record<string, number> = {
    '1-1': 0,
    '1-0': 0,
    '0-1': 0,
    '2-1': 0,
    '1-2': 0
  }

  for (const b of beads) {
    beadCounts[b.type] = (beadCounts[b.type] || 0) + 1
  }

  const totalBeads = beads.length
  const bead11Ratio = totalBeads > 0 ? beadCounts['1-1'] / totalBeads : 0
  const isPerfectMatch = beadCounts['1-1'] === totalBeads && totalBeads > 0

  return {
    sourceParagraphs: srcCount,
    targetParagraphs: tgtCount,
    beadCounts,
    bead11Ratio,
    structureMismatch: bead11Ratio < 0.85,
    isPerfectMatch
  }
}

// Ký tự CJK: Chữ Hán, Hiragana, Katakana (không bao gồm gạch nối ー U+30FC)
const CJK_CHARS_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FB\u30FD-\u30FF]/g
// Dấu ngoặc CJK: 「」『』
const CJK_BRACKETS_RE = /[「」『』]/g
// Dấu câu toàn phần CJK: 、。！？：；，
const CJK_PUNCT_RE = /[、。！？：；，]/g

/**
 * Kiểm tra các ký tự và dấu câu ngôn ngữ nguồn còn sót lại trong bản dịch.
 */
export function checkResidualSourceChars(
  srcParas: string[],
  tgtParas: string[],
  beads: Bead[],
  options?: CheckOptions
): ResidualCharsIssue[] {
  const issues: ResidualCharsIssue[] = []
  const exempt = options?.exemptWhere ?? []

  for (let bIdx = 0; bIdx < beads.length; bIdx++) {
    const bead = beads[bIdx]
    if (bead.tgtIdx.length === 0) continue

    // Kiểm tra nếu đoạn nguồn thuộc danh sách miễn trừ
    const isExempt = bead.srcIdx.some((idx) => {
      const srcText = srcParas[idx] ?? ''
      return exempt.some((ex) => srcText.includes(ex))
    })
    if (isExempt) continue

    for (const tIdx of bead.tgtIdx) {
      const tgtText = tgtParas[tIdx] ?? ''
      const residual: string[] = []

      // Kiểm tra chữ Hán & Kana
      const cjkMatches = tgtText.match(CJK_CHARS_RE)
      if (cjkMatches) residual.push(...cjkMatches)

      // Kiểm tra dấu ngoặc
      const bracketMatches = tgtText.match(CJK_BRACKETS_RE)
      if (bracketMatches) residual.push(...bracketMatches)

      // Kiểm tra dấu câu
      const punctMatches = tgtText.match(CJK_PUNCT_RE)
      if (punctMatches) residual.push(...punctMatches)

      if (residual.length > 0) {
        issues.push({
          beadIndex: bIdx,
          paragraphIndex: tIdx,
          chars: Array.from(new Set(residual))
        })
      }
    }
  }

  return issues
}

/**
 * Kiểm tra dấu ngoặc thoại không cân xứng trong các đoạn dịch.
 */
export function checkUnbalancedQuotes(tgtParas: string[]): UnbalancedQuoteIssue[] {
  const issues: UnbalancedQuoteIssue[] = []

  for (let idx = 0; idx < tgtParas.length; idx++) {
    const text = tgtParas[idx]

    // 1. Số dấu ngoặc kép ASCII " là số lẻ
    const asciiQuotes = (text.match(/"/g) || []).length
    if (asciiQuotes % 2 !== 0) {
      issues.push({ paragraphIndex: idx, reason: 'Số dấu ngoặc kép ASCII " là số lẻ' })
      continue
    }

    // 2. Ngoặc kép cong “”
    const openCurly = (text.match(/“/g) || []).length
    const closeCurly = (text.match(/”/g) || []).length
    if (openCurly !== closeCurly) {
      issues.push({ paragraphIndex: idx, reason: 'Ngoặc cong “” không cân' })
      continue
    }

    // 3. Ngoặc vuông CJK 「」
    const openCorner = (text.match(/「/g) || []).length
    const closeCorner = (text.match(/」/g) || []).length
    if (openCorner !== closeCorner) {
      issues.push({ paragraphIndex: idx, reason: 'Ngoặc vuông 「」 không cân' })
      continue
    }

    // 4. Ngoặc vuông kép CJK 『』
    const openDCorner = (text.match(/『/g) || []).length
    const closeDCorner = (text.match(/』/g) || []).length
    if (openDCorner !== closeDCorner) {
      issues.push({ paragraphIndex: idx, reason: 'Ngoặc 『』 không cân' })
      continue
    }

    // 5. Ngoặc tam giác «»
    const openGuill = (text.match(/«/g) || []).length
    const closeGuill = (text.match(/»/g) || []).length
    if (openGuill !== closeGuill) {
      issues.push({ paragraphIndex: idx, reason: 'Ngoặc «» không cân' })
    }
  }

  return issues
}

/**
 * Phân loại phong cách dấu thoại cho toàn chương.
 */
export function classifyDialogueStyle(tgtParas: string[]): DialogueStyleResult {
  let viCount = 0
  let cjkCount = 0
  let otherCount = 0

  for (const text of tgtParas) {
    if (text.includes('“') || text.includes('”') || text.includes('"')) {
      viCount++
    }
    if (text.includes('「') || text.includes('」') || text.includes('『') || text.includes('』')) {
      cjkCount++
    }
    if (text.includes('«') || text.includes('»')) {
      otherCount++
    }
  }

  const counts = { vi: viCount, cjk: cjkCount, other: otherCount }
  const total = viCount + cjkCount + otherCount

  if (total === 0) {
    return { style: 'none', counts }
  }

  const present = [viCount > 0, cjkCount > 0, otherCount > 0].filter(Boolean).length
  if (present > 1) {
    return { style: 'mixed', counts }
  }

  if (viCount > 0) return { style: 'vi', counts }
  if (cjkCount > 0) return { style: 'cjk', counts }
  return { style: 'other', counts }
}

/**
 * Phát hiện bất thường về tỷ lệ độ dài trên các cặp 1-1 có độ dài nguồn >= 20 ký tự.
 */
export function checkLengthOutliers(
  srcParas: string[],
  tgtParas: string[],
  beads: Bead[],
  options?: CheckOptions
): OutlierLengthIssue[] {
  const issues: OutlierLengthIssue[] = []
  const lang = options?.sourceLang ?? 'zh-Hans'
  const band = options?.ratioBand ?? DEFAULT_BANDS[lang] ?? [1.0, 3.0]

  for (let bIdx = 0; bIdx < beads.length; bIdx++) {
    const bead = beads[bIdx]
    if (bead.type !== '1-1') continue

    const sIdx = bead.srcIdx[0]
    const tIdx = bead.tgtIdx[0]
    const srcText = srcParas[sIdx] ?? ''
    const tgtText = tgtParas[tIdx] ?? ''

    const srcLen = srcText.replace(/[\s\u3000]/g, '').length
    if (srcLen < 20) continue

    const tgtLen = tgtText.replace(/[\s\u3000]/g, '').length
    const ratio = tgtLen / srcLen

    if (ratio < band[0] || ratio > band[1]) {
      issues.push({
        beadIndex: bIdx,
        srcLen,
        tgtLen,
        ratio,
        band
      })
    }
  }

  return issues
}

/**
 * Phát hiện lặp từ hoặc lặp đoạn bất thường trong bản dịch.
 */
export function checkRepetitions(tgtParas: string[]): RepetitionIssue[] {
  const issues: RepetitionIssue[] = []

  for (let i = 0; i < tgtParas.length; i++) {
    const text = tgtParas[i].trim()

    // 1. Trùng lặp hoàn toàn với đoạn ngay trước
    if (i > 0 && text.length > 10 && text === tgtParas[i - 1].trim()) {
      issues.push({
        paragraphIndex: i,
        reason: 'Đoạn trùng lặp y hệt đoạn ngay trước',
        pattern: text
      })
      continue
    }

    // 2. Cụm 4 từ lặp lại từ 4 lần trở lên trong cùng một đoạn
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length >= 16) {
      const gramCounts = new Map<string, number>()
      for (let w = 0; w <= words.length - 4; w++) {
        const gram = words
          .slice(w, w + 4)
          .join(' ')
          .toLowerCase()
        const count = (gramCounts.get(gram) || 0) + 1
        gramCounts.set(gram, count)
        if (count >= 4) {
          issues.push({
            paragraphIndex: i,
            reason: 'Lặp vòng 4 từ liên tiếp từ 4 lần trở lên',
            pattern: gram
          })
          break
        }
      }
    }
  }

  return issues
}

/**
 * Kiểm tra mức độ tuân thủ bảng thuật ngữ trong bản dịch.
 */
export function checkGlossaryCompliance(
  srcParas: string[],
  tgtParas: string[],
  beads: Bead[],
  glossary: GlossaryEntry[],
  options?: CheckOptions
): GlossaryComplianceResult {
  const isEn = options?.sourceLang === 'en'
  let totalChecks = 0
  let strictHits = 0
  let lenientHits = 0
  let forbiddenHits = 0

  const missedMap = new Map<string, number>()
  const forbiddenViolations: Array<{ term: string; paragraphIndex: number }> = []

  // Kiểm tra các thuật ngữ bị cấm trên toàn bộ các đoạn đích
  for (let tIdx = 0; tIdx < tgtParas.length; tIdx++) {
    const tgtText = tgtParas[tIdx]
    for (const entry of glossary) {
      if (!entry.forbidden) continue
      for (const forb of entry.forbidden) {
        if (containsWord(tgtText, forb)) {
          forbiddenHits++
          forbiddenViolations.push({ term: forb, paragraphIndex: tIdx })
        }
      }
    }
  }

  // Kiểm tra xuất hiện thuật ngữ ở nguồn và tuân thủ ở đích
  for (const bead of beads) {
    if (bead.srcIdx.length === 0) continue

    const combinedSrc = bead.srcIdx.map((i) => srcParas[i] ?? '').join(' ')
    const combinedTgt = bead.tgtIdx.map((i) => tgtParas[i] ?? '').join(' ')
    const normTgt = normalizeVietnamese(combinedTgt)

    for (const entry of glossary) {
      // Kiểm tra mục thuật ngữ có xuất hiện trong nguồn không (không phân biệt hoa thường với tiếng Anh)
      const srcTerms = [entry.src]
      if (entry.aliases) {
        for (const a of entry.aliases) {
          srcTerms.push(typeof a === 'string' ? a : a.src)
        }
      }

      const appearedInSrc = srcTerms.some((st) => {
        if (isEn) {
          return combinedSrc.toLowerCase().includes(st.toLowerCase())
        }
        return combinedSrc.includes(st)
      })

      if (!appearedInSrc) continue

      totalChecks++

      // Nếu đoạn nguồn bị bỏ qua (1-0), tính là bị sót thuật ngữ
      if (bead.type === '1-0' || bead.tgtIdx.length === 0) {
        missedMap.set(entry.src, (missedMap.get(entry.src) || 0) + 1)
        continue
      }

      // Kiểm tra khớp chính xác
      const normTgtWord = normalizeVietnamese(entry.tgt)
      const isStrict = normTgt.includes(normTgtWord)

      // Kiểm tra khớp nới lỏng (chính xác hoặc dạng thay thế)
      let isLenient = isStrict
      if (!isLenient && entry.alternatives) {
        for (const alt of entry.alternatives) {
          if (normTgt.includes(normalizeVietnamese(alt))) {
            isLenient = true
            break
          }
        }
      }

      if (isStrict) {
        strictHits++
      }
      if (isLenient) {
        lenientHits++
      } else {
        missedMap.set(entry.src, (missedMap.get(entry.src) || 0) + 1)
      }
    }
  }

  const missedTerms: Array<{ term: string; count: number }> = []
  for (const [term, count] of missedMap.entries()) {
    missedTerms.push({ term, count })
  }
  missedTerms.sort((a, b) => b.count - a.count)

  return {
    totalChecks,
    strictHits,
    lenientHits,
    forbiddenHits,
    missedTerms,
    forbiddenViolations
  }
}

/**
 * Đánh giá các quy tắc khẳng định (assertion) được định nghĩa sẵn.
 */
export function evaluateAssertions(
  srcParas: string[],
  tgtParas: string[],
  beads: Bead[],
  rules: AssertionRule[]
): AssertionEvaluation[] {
  const evaluations: AssertionEvaluation[] = []

  for (let rIdx = 0; rIdx < rules.length; rIdx++) {
    const rule = rules[rIdx]

    // 1. Xác định vị trí chỉ số đoạn nguồn làm mỏ neo
    let anchorSrcIdx = -1
    if (rule.where !== undefined) {
      for (let s = 0; s < srcParas.length; s++) {
        if (srcParas[s].includes(rule.where)) {
          anchorSrcIdx = s
          break
        }
      }
    } else if (rule.line !== undefined) {
      if (typeof rule.line === 'number') {
        anchorSrcIdx = rule.line - 1
      } else {
        const expectedTrimmed = rule.line.trim()
        for (let s = 0; s < srcParas.length; s++) {
          if (srcParas[s].trim() === expectedTrimmed) {
            anchorSrcIdx = s
            break
          }
        }
      }
    }

    if (anchorSrcIdx === -1) {
      evaluations.push({
        ruleIndex: rIdx,
        result: 'fail',
        reason: 'Không tìm thấy đoạn neo trong văn bản nguồn'
      })
      continue
    }

    // 2. Tìm cặp bead tương ứng
    const matchedBead = beads.find((b) => b.srcIdx.includes(anchorSrcIdx))
    if (!matchedBead || matchedBead.type === '1-0' || matchedBead.tgtIdx.length === 0) {
      evaluations.push({
        ruleIndex: rIdx,
        result: 'fail',
        reason: 'đoạn bị sót'
      })
      continue
    }

    // Lấy nội dung đoạn đích kết hợp cho cặp bead này
    const tgtText = matchedBead.tgtIdx.map((t) => tgtParas[t] ?? '').join(' ')
    const normTgt = normalizeVietnamese(tgtText)

    // Kiểm tra nếu quy tắc chỉ có ghi chú hoặc cặp xưng hô (không có điều kiện chuỗi)
    const hasStringConditions =
      rule.expect !== undefined ||
      rule.reject !== undefined ||
      (rule.mustContain && rule.mustContain.length > 0) ||
      (rule.mustContainAny && rule.mustContainAny.length > 0) ||
      (rule.mustNotContain && rule.mustNotContain.length > 0) ||
      (rule.mustNotContainWord && rule.mustNotContainWord.length > 0)

    if (!hasStringConditions) {
      evaluations.push({
        ruleIndex: rIdx,
        result: 'manual',
        reason: rule.note ?? 'Cần chấm tay'
      })
      continue
    }

    // Đánh giá các điều kiện chuỗi
    let pass = true
    const failReasons: string[] = []

    if (rule.expect && !normTgt.includes(normalizeVietnamese(rule.expect))) {
      pass = false
      failReasons.push(`Thiếu chuỗi bắt buộc: "${rule.expect}"`)
    }

    if (rule.reject && normTgt.includes(normalizeVietnamese(rule.reject))) {
      pass = false
      failReasons.push(`Chứa chuỗi bị loại: "${rule.reject}"`)
    }

    if (rule.mustContain) {
      for (const item of rule.mustContain) {
        if (!normTgt.includes(normalizeVietnamese(item))) {
          pass = false
          failReasons.push(`Thiếu chuỗi: "${item}"`)
        }
      }
    }

    if (rule.mustContainAny && rule.mustContainAny.length > 0) {
      const anyHit = rule.mustContainAny.some((item) => normTgt.includes(normalizeVietnamese(item)))
      if (!anyHit) {
        pass = false
        failReasons.push(`Không chứa bất kỳ chuỗi nào trong: [${rule.mustContainAny.join(', ')}]`)
      }
    }

    if (rule.mustNotContain) {
      for (const item of rule.mustNotContain) {
        if (normTgt.includes(normalizeVietnamese(item))) {
          pass = false
          failReasons.push(`Chứa chuỗi không được phép: "${item}"`)
        }
      }
    }

    if (rule.mustNotContainWord) {
      for (const item of rule.mustNotContainWord) {
        if (containsWord(tgtText, item)) {
          pass = false
          failReasons.push(`Chứa từ không được phép: "${item}"`)
        }
      }
    }

    if (pass) {
      evaluations.push({ ruleIndex: rIdx, result: 'pass' })
    } else {
      evaluations.push({
        ruleIndex: rIdx,
        result: 'fail',
        reason: failReasons.join('; ')
      })
    }
  }

  return evaluations
}
