import type { TranslateUnit } from '../contracts/translateCore'

export interface PlanOptions {
  /** Giới hạn số đơn vị tối đa trong một lô */
  maxUnits?: number
  /** Giới hạn ước tính token tối đa cho một lô */
  maxTokens?: number
  /** Ngôn ngữ nguồn để ước tính token chính xác */
  sourceLang?: string
  /** Độ dài ký tự tối đa của một đơn vị trước khi bị cắt thành mảnh tạm */
  maxUnitChars?: number
}

export interface SplitPieceMeta {
  originalId: string
  pieceIndex: number
  totalPieces: number
}

export interface PlannedBatch {
  units: TranslateUnit[]
  estimatedTokens: number
  charCount: number
}

export interface BatchPlan {
  batches: PlannedBatch[]
  totalUnits: number
  totalEstimatedTokens: number
  splitMap: Map<string, SplitPieceMeta>
}

export const DEFAULT_MAX_UNITS = 30
export const DEFAULT_MAX_TOKENS = 1200
export const DEFAULT_MAX_UNIT_CHARS = 1600

/**
 * Ước tính số token của chuỗi văn bản dựa trên ngôn ngữ nguồn.
 */
export function estimateTextTokens(text: string, lang?: string): number {
  if (text.length === 0) return 0
  const isCjk = lang === 'zh-Hans' || lang === 'zh-Hant' || lang === 'ja'
  // CJK ~1.5 ký tự mỗi token; Latin ~3.5-4 ký tự mỗi token
  const charsPerToken = isCjk ? 1.5 : 3.8
  return Math.max(1, Math.ceil(text.length / charsPerToken))
}

/**
 * Cắt một đoạn văn quá dài thành các mảnh nhỏ theo ranh giới câu hoặc dòng an toàn.
 */
export function splitLongUnit(
  unit: TranslateUnit,
  maxChars = DEFAULT_MAX_UNIT_CHARS
): TranslateUnit[] {
  if (unit.text.length <= maxChars) {
    return [unit]
  }

  const pieces: string[] = []
  const text = unit.text

  // Thử cắt theo dấu chấm câu hoặc xuống dòng
  const sentenceDelims = /[。！？\n.!?]\s*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  let currentPiece = ''
  while ((match = sentenceDelims.exec(text)) !== null) {
    const boundary = match.index + match[0].length
    const segmentText = text.slice(lastIndex, boundary)

    if (currentPiece.length + segmentText.length > maxChars && currentPiece.length > 0) {
      pieces.push(currentPiece.trim())
      currentPiece = segmentText
    } else {
      currentPiece += segmentText
    }
    lastIndex = boundary
  }

  if (lastIndex < text.length) {
    currentPiece += text.slice(lastIndex)
  }
  if (currentPiece.trim().length > 0) {
    pieces.push(currentPiece.trim())
  }

  // Nếu không có dấu câu nào để cắt (chuỗi liên tục quá dài), cắt theo độ dài cứng
  if (pieces.length <= 1) {
    pieces.length = 0
    for (let i = 0; i < text.length; i += maxChars) {
      pieces.push(text.slice(i, i + maxChars))
    }
  }

  return pieces.map((p, idx) => ({
    id: `${unit.id}__part_${idx + 1}_of_${pieces.length}`,
    text: p
  }))
}

/**
 * Lập kế hoạch chia các đơn vị dịch thành nhiều lô an toàn.
 */
export function planBatches(
  units: TranslateUnit[],
  options?: PlanOptions
): BatchPlan {
  const maxUnits = options?.maxUnits ?? DEFAULT_MAX_UNITS
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
  const maxUnitChars = options?.maxUnitChars ?? DEFAULT_MAX_UNIT_CHARS
  const lang = options?.sourceLang

  const splitMap = new Map<string, SplitPieceMeta>()
  const flatUnits: TranslateUnit[] = []

  for (const unit of units) {
    if (unit.text.length > maxUnitChars) {
      const pieces = splitLongUnit(unit, maxUnitChars)
      pieces.forEach((piece, idx) => {
        splitMap.set(piece.id, {
          originalId: unit.id,
          pieceIndex: idx + 1,
          totalPieces: pieces.length
        })
        flatUnits.push(piece)
      })
    } else {
      flatUnits.push(unit)
    }
  }

  const batches: PlannedBatch[] = []
  let currentUnits: TranslateUnit[] = []
  let currentTokens = 0
  let currentChars = 0

  for (const unit of flatUnits) {
    const cost = estimateTextTokens(unit.text, lang)

    const exceedsUnitLimit = currentUnits.length >= maxUnits
    const exceedsTokenLimit = currentUnits.length > 0 && currentTokens + cost > maxTokens

    if (exceedsUnitLimit || exceedsTokenLimit) {
      batches.push({
        units: currentUnits,
        estimatedTokens: currentTokens,
        charCount: currentChars
      })
      currentUnits = []
      currentTokens = 0
      currentChars = 0
    }

    currentUnits.push(unit)
    currentTokens += cost
    currentChars += unit.text.length
  }

  if (currentUnits.length > 0) {
    batches.push({
      units: currentUnits,
      estimatedTokens: currentTokens,
      charCount: currentChars
    })
  }

  const totalEstimatedTokens = batches.reduce((sum, b) => sum + b.estimatedTokens, 0)

  return {
    batches,
    totalUnits: flatUnits.length,
    totalEstimatedTokens,
    splitMap
  }
}

/**
 * Ráp nối các mảnh tạm đã dịch về lại ID gốc ban đầu.
 */
export function reassembleSplitUnits(
  translated: TranslateUnit[],
  splitMap: Map<string, SplitPieceMeta>
): TranslateUnit[] {
  if (splitMap.size === 0) return translated

  const piecesByOriginal = new Map<string, Array<{ index: number; text: string }>>()
  const normalUnits: TranslateUnit[] = []

  for (const unit of translated) {
    const meta = splitMap.get(unit.id)
    if (meta) {
      const list = piecesByOriginal.get(meta.originalId) ?? []
      list.push({ index: meta.pieceIndex, text: unit.text })
      piecesByOriginal.set(meta.originalId, list)
    } else {
      normalUnits.push(unit)
    }
  }

  const reassembled: TranslateUnit[] = []
  for (const [originalId, pieces] of piecesByOriginal.entries()) {
    pieces.sort((a, b) => a.index - b.index)
    const combinedText = pieces.map((p) => p.text).join('\n')
    reassembled.push({
      id: originalId,
      text: combinedText
    })
  }

  return [...normalUnits, ...reassembled]
}
