import type { SourceLanguage } from '../contracts/library'

export type BeadType = '1-1' | '1-0' | '0-1' | '2-1' | '1-2'

export interface Bead {
  type: BeadType
  srcIdx: number[]
  tgtIdx: number[]
}

export interface GlossaryAnchor {
  src: string
  tgt: string
  aliases?: Array<string | { src: string; tgt: string }>
}

export interface AlignOptions {
  sourceLang?: SourceLanguage
  expectedRatio?: number
  penaltySkip?: number
  penaltyMerge?: number
  penaltySplit?: number
  anchorDiscount?: number
  glossary?: GlossaryAnchor[]
}

const DEFAULT_RATIOS: Record<string, number> = {
  'zh-Hans': 2.5,
  'zh-Hant': 2.5,
  ja: 2.0,
  en: 1.1
}

const BEAD_PRIORITY: Record<BeadType, number> = {
  '1-1': 0,
  '1-0': 1,
  '0-1': 2,
  '2-1': 3,
  '1-2': 4
}

function visibleLength(text: string): number {
  return text.replace(/[\s\u3000]/g, '').length
}

/**
 * Kiểm tra xem bản gốc và bản dịch có chia sẻ các đặc trưng mỏ neo hay không:
 * - Các chữ số chung (\d+)
 * - Các từ chữ Latin viết hoa chung ([A-Z][a-z]+)
 * - Ký tự phân cảnh chung (＊, ◇)
 * - Thuật ngữ bảng chú giải trùng khớp (thuật ngữ nguồn trong bản gốc, đích trong bản dịch)
 */
export function hasSharedAnchors(
  srcText: string,
  tgtText: string,
  glossary?: GlossaryAnchor[]
): boolean {
  // 1. Chữ số
  const srcNumbers = srcText.match(/\d+/g)
  if (srcNumbers) {
    const tgtNumbers = new Set(tgtText.match(/\d+/g) ?? [])
    for (const num of srcNumbers) {
      if (tgtNumbers.has(num)) return true
    }
  }

  // 2. Từ Latin viết hoa
  const srcLatin = srcText.match(/[A-Z][a-z]+/g)
  if (srcLatin) {
    const tgtLatin = new Set(tgtText.match(/[A-Z][a-z]+/g) ?? [])
    for (const word of srcLatin) {
      if (tgtLatin.has(word)) return true
    }
  }

  // 3. Dấu ngắt cảnh
  if (
    (srcText.includes('＊') && tgtText.includes('＊')) ||
    (srcText.includes('◇') && tgtText.includes('◇'))
  ) {
    return true
  }

  // 4. Thuật ngữ
  if (glossary && glossary.length > 0) {
    for (const entry of glossary) {
      const srcFound =
        srcText.includes(entry.src) ||
        (entry.aliases &&
          entry.aliases.some((a) =>
            typeof a === 'string' ? srcText.includes(a) : srcText.includes(a.src)
          ))
      if (srcFound && tgtText.includes(entry.tgt)) {
        return true
      }
    }
  }

  return false
}

interface DpNode {
  cost: number
  prevI: number
  prevJ: number
  beadType: BeadType
}

/**
 * Gióng hàng các đoạn văn bản gốc và bản dịch bằng thuật toán quy hoạch động Gale-Church.
 */
export function alignParagraphs(
  srcParas: string[],
  tgtParas: string[],
  options?: AlignOptions
): Bead[] {
  const m = srcParas.length
  const n = tgtParas.length

  if (m === 0 && n === 0) return []

  const sourceLang = options?.sourceLang ?? 'zh-Hans'
  const ratio = options?.expectedRatio ?? DEFAULT_RATIOS[sourceLang] ?? 2.0
  const penaltySkip = options?.penaltySkip ?? 1.0
  const penaltyMerge = options?.penaltyMerge ?? 1.5
  const penaltySplit = options?.penaltySplit ?? 1.5
  const anchorDiscount = options?.anchorDiscount ?? 0.6
  const glossary = options?.glossary

  // Tính trước độ dài ký tự nhìn thấy
  const srcLens = srcParas.map(visibleLength)
  const tgtLens = tgtParas.map(visibleLength)

  const dp: DpNode[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => ({
      cost: Infinity,
      prevI: -1,
      prevJ: -1,
      beadType: '1-1'
    }))
  )

  dp[0][0] = { cost: 0, prevI: -1, prevJ: -1, beadType: '1-1' }

  const EPSILON = 1e-9

  function consider(
    i: number,
    j: number,
    prevI: number,
    prevJ: number,
    transitionCost: number,
    beadType: BeadType
  ): void {
    const totalCost = dp[prevI][prevJ].cost + transitionCost
    const current = dp[i][j]

    if (totalCost < current.cost - EPSILON) {
      dp[i][j] = { cost: totalCost, prevI, prevJ, beadType }
    } else if (Math.abs(totalCost - current.cost) <= EPSILON) {
      if (BEAD_PRIORITY[beadType] < BEAD_PRIORITY[current.beadType]) {
        dp[i][j] = { cost: totalCost, prevI, prevJ, beadType }
      }
    }
  }

  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0 && j === 0) continue

      // 1-0: lược dịch (bỏ sót đoạn nguồn)
      if (i >= 1) {
        const cost10 = penaltySkip
        consider(i, j, i - 1, j, cost10, '1-0')
      }

      // 0-1: dịch thêm (thừa đoạn đích)
      if (j >= 1) {
        const cost01 = penaltySkip
        consider(i, j, i, j - 1, cost01, '0-1')
      }

      // 1-1: khớp chuẩn 1-1
      if (i >= 1 && j >= 1) {
        const srcLen = Math.max(1, srcLens[i - 1])
        const tgtLen = Math.max(1, tgtLens[j - 1])
        let diff = Math.abs(tgtLen / srcLen - ratio)
        if (hasSharedAnchors(srcParas[i - 1], tgtParas[j - 1], glossary)) {
          diff *= anchorDiscount
        }
        consider(i, j, i - 1, j - 1, diff, '1-1')
      }

      // 2-1: gộp đoạn (2 đoạn nguồn thành 1 đoạn đích)
      if (i >= 2 && j >= 1) {
        const srcLen = Math.max(1, srcLens[i - 2] + srcLens[i - 1])
        const tgtLen = Math.max(1, tgtLens[j - 1])
        let diff = Math.abs(tgtLen / srcLen - ratio)
        let penalty = penaltyMerge
        if (
          hasSharedAnchors(srcParas[i - 2], tgtParas[j - 1], glossary) &&
          hasSharedAnchors(srcParas[i - 1], tgtParas[j - 1], glossary)
        ) {
          diff *= anchorDiscount
          penalty *= anchorDiscount
        }
        consider(i, j, i - 2, j - 1, diff + penalty, '2-1')
      }

      // 1-2: tách đoạn (1 đoạn nguồn thành 2 đoạn đích)
      if (i >= 1 && j >= 2) {
        const srcLen = Math.max(1, srcLens[i - 1])
        const tgtLen = Math.max(1, tgtLens[j - 2] + tgtLens[j - 1])
        const combinedTgt = tgtParas[j - 2] + ' ' + tgtParas[j - 1]
        let diff = Math.abs(tgtLen / srcLen - ratio)
        let penalty = penaltySplit
        if (hasSharedAnchors(srcParas[i - 1], combinedTgt, glossary)) {
          diff *= anchorDiscount
          penalty *= anchorDiscount
        }
        consider(i, j, i - 1, j - 2, diff + penalty, '1-2')
      }
    }
  }

  // Truy vết ngược từ (m, n)
  const beads: Bead[] = []
  let currI = m
  let currJ = n

  while (currI > 0 || currJ > 0) {
    const node = dp[currI][currJ]
    const pI = node.prevI
    const pJ = node.prevJ

    let srcIdx: number[] = []
    let tgtIdx: number[] = []

    if (node.beadType === '1-1') {
      srcIdx = [pI]
      tgtIdx = [pJ]
    } else if (node.beadType === '1-0') {
      srcIdx = [pI]
      tgtIdx = []
    } else if (node.beadType === '0-1') {
      srcIdx = []
      tgtIdx = [pJ]
    } else if (node.beadType === '2-1') {
      srcIdx = [pI, pI + 1]
      tgtIdx = [pJ]
    } else if (node.beadType === '1-2') {
      srcIdx = [pI]
      tgtIdx = [pJ, pJ + 1]
    }

    beads.push({
      type: node.beadType,
      srcIdx,
      tgtIdx
    })

    currI = pI
    currJ = pJ
  }

  beads.reverse()
  return beads
}
