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
 * Checks whether source and target share anchor features:
 * - Common numbers (\d+)
 * - Common capitalized Latin words ([A-Z][a-z]+)
 * - Common scene break characters (＊, ◇)
 * - Matched glossary entry (src in source, tgt in target)
 */
export function hasSharedAnchors(
  srcText: string,
  tgtText: string,
  glossary?: GlossaryAnchor[]
): boolean {
  // 1. Numbers
  const srcNumbers = srcText.match(/\d+/g)
  if (srcNumbers) {
    const tgtNumbers = new Set(tgtText.match(/\d+/g) ?? [])
    for (const num of srcNumbers) {
      if (tgtNumbers.has(num)) return true
    }
  }

  // 2. Capitalized Latin words
  const srcLatin = srcText.match(/[A-Z][a-z]+/g)
  if (srcLatin) {
    const tgtLatin = new Set(tgtText.match(/[A-Z][a-z]+/g) ?? [])
    for (const word of srcLatin) {
      if (tgtLatin.has(word)) return true
    }
  }

  // 3. Scene breaks
  if (
    (srcText.includes('＊') && tgtText.includes('＊')) ||
    (srcText.includes('◇') && tgtText.includes('◇'))
  ) {
    return true
  }

  // 4. Glossary
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
 * Align source paragraphs and target paragraphs using Gale-Church dynamic programming.
 * Implements R1, R1a, R1b, R2 of translation-checks spec and D2 of design.md.
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

  // Precompute visible lengths
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

      // 1-0: omission (source paragraph skipped)
      if (i >= 1) {
        const cost10 = penaltySkip
        consider(i, j, i - 1, j, cost10, '1-0')
      }

      // 0-1: addition (extra target paragraph)
      if (j >= 1) {
        const cost01 = penaltySkip
        consider(i, j, i, j - 1, cost01, '0-1')
      }

      // 1-1: standard match
      if (i >= 1 && j >= 1) {
        const srcLen = Math.max(1, srcLens[i - 1])
        const tgtLen = Math.max(1, tgtLens[j - 1])
        let diff = Math.abs(tgtLen / srcLen - ratio)
        if (hasSharedAnchors(srcParas[i - 1], tgtParas[j - 1], glossary)) {
          diff *= anchorDiscount
        }
        consider(i, j, i - 1, j - 1, diff, '1-1')
      }

      // 2-1: merge (2 source paragraphs into 1 target paragraph)
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

      // 1-2: split (1 source paragraph into 2 target paragraphs)
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

  // Backtrack from (m, n)
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
