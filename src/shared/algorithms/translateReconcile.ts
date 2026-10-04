import type {
  TranslateUnit,
  TempMappedUnit,
  ParsedTranslateItem,
  ReconciliationResult
} from '../contracts/translateCore'

export interface TempMappingResult {
  /** Các đơn vị gửi đi với ID tạm [1], [2], ... */
  sendable: TempMappedUnit[]
  /** Các đơn vị rỗng không cần gửi tới mô hình */
  skippedEmpty: TranslateUnit[]
  /** Ánh xạ từ ID gốc sang ID tạm */
  idToTemp: Map<string, string>
  /** Ánh xạ từ ID tạm sang ID gốc */
  tempToId: Map<string, string>
}

/**
 * Ánh xạ danh sách đơn vị gốc sang ID tạm [1], [2], ...
 * Bỏ qua các đơn vị có nội dung rỗng (trả về trực tiếp).
 */
export function mapToTempIds(units: TranslateUnit[]): TempMappingResult {
  const sendable: TempMappedUnit[] = []
  const skippedEmpty: TranslateUnit[] = []
  const idToTemp = new Map<string, string>()
  const tempToId = new Map<string, string>()

  let index = 1
  for (const unit of units) {
    if (unit.text.trim() === '') {
      skippedEmpty.push({ id: unit.id, text: '' })
      continue
    }

    const tempId = `[${index}]`
    index++

    sendable.push({
      tempId,
      originalId: unit.id,
      text: unit.text
    })

    idToTemp.set(unit.id, tempId)
    tempToId.set(tempId, unit.id)
    // Cũng hỗ trợ trường hợp model trả về số trần "1" thay vì "[1]"
    tempToId.set(String(index - 1), unit.id)
  }

  return { sendable, skippedEmpty, idToTemp, tempToId }
}

/**
 * Chuẩn hóa ID tạm nhận từ model (ví dụ: "1", "[1]", "[ 1 ]", "#1").
 */
export function normalizeTempId(rawId: string): string {
  const trimmed = rawId.trim()
  const bracketMatch = /^\[\s*(\d+)\s*\]$/.exec(trimmed)
  if (bracketMatch) return `[${bracketMatch[1]}]`

  const numMatch = /^\d+$/.exec(trimmed)
  if (numMatch) return `[${numMatch[0]}]`

  const hashMatch = /^#\s*(\d+)$/.exec(trimmed)
  if (hashMatch) return `[${hashMatch[1]}]`

  return trimmed
}

/**
 * Đối soát kết quả phân tích từ mô hình với danh sách đơn vị gốc yêu cầu.
 */
export function reconcileTempItems(
  sendable: TempMappedUnit[],
  tempToId: Map<string, string>,
  items: ParsedTranslateItem[]
): ReconciliationResult {
  const matched: TranslateUnit[] = []
  const missing: string[] = []
  const extraneous: string[] = []
  const empty: string[] = []

  const seenOriginalIds = new Set<string>()
  const expectedOriginalIds = new Set(sendable.map((u) => u.originalId))

  for (const item of items) {
    const normTemp = normalizeTempId(item.tempId)
    const originalId = tempToId.get(normTemp) ?? tempToId.get(item.tempId)

    if (!originalId || !expectedOriginalIds.has(originalId)) {
      extraneous.push(item.tempId)
      continue
    }

    // Nếu model trả trùng một ID, ưu tiên bản đầu tiên
    if (seenOriginalIds.has(originalId)) {
      continue
    }

    if (item.text.trim() === '') {
      empty.push(originalId)
      seenOriginalIds.add(originalId)
      continue
    }

    matched.push({
      id: originalId,
      text: item.text
    })
    seenOriginalIds.add(originalId)
  }

  // Tìm các ID bị thiếu hoàn toàn
  for (const unit of sendable) {
    if (!seenOriginalIds.has(unit.originalId)) {
      missing.push(unit.originalId)
    }
  }

  return { matched, missing, extraneous, empty }
}
