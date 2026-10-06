import type { ParsedTranslateItem } from '../contracts/translateCore'

/**
 * Loại bỏ rào chắn markdown (codeblock) và khoảng trắng thừa.
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/m, '')
    .trim()
}

/**
 * Dọn dẹp lỗi JSON phổ biến: dấu phẩy thừa trước ] hoặc }, khoảng trắng lạ.
 */
export function sanitizeJsonString(text: string): string {
  return text
    // Xóa dấu phẩy thừa trước dấu đóng mảng: , ] -> ]
    .replace(/,\s*([\]}])/g, '$1')
    // v3/v4: model đôi khi viết thừa `"dst":` trước khóa nhãn ("dst":"noi":"A→B"); bỏ phần thừa để
    // "noi" không bị đọc thành bản dịch.
    .replace(/"dst"\s*:\s*"(noi|xung|goi)"\s*:/g, '"$1":')
}

/**
 * Trích xuất mảng JSON từ chuỗi văn bản có thể chứa lời mở đầu hoặc kết bài.
 */
export function extractJsonArraySlice(text: string): string | null {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

/**
 * Chuẩn hóa một object bất kỳ từ model về dạng { tempId, text }.
 */
function normalizeItem(raw: unknown): ParsedTranslateItem | null {
  if (typeof raw !== 'object' || raw === null) return null

  const obj = raw as Record<string, unknown>

  // Trường hợp chuẩn: { id: "[1]", dst: "..." } hoặc { id: "1", text: "..." }
  let idVal = obj.id ?? obj.ID ?? obj.Id
  let textVal = obj.dst ?? obj.text ?? obj.translation ?? obj.vi ?? obj.target

  // Trường hợp model dùng ID làm key: { "[1]": "Bản dịch" }
  if (idVal === undefined && textVal === undefined) {
    const keys = Object.keys(obj)
    if (keys.length === 1 && (/^\[?\d+\]?$/.test(keys[0]) || keys[0].startsWith('['))) {
      idVal = keys[0]
      textVal = obj[keys[0]]
    }
  }

  if (idVal !== undefined && textVal !== undefined) {
    const tempId = String(idVal).trim()
    const text = typeof textVal === 'string' ? textVal : String(textVal)
    return { tempId, text }
  }

  return null
}

/**
 * Phục hồi bằng regex khi JSON.parse hoàn toàn thất bại:
 * Quét tìm các cặp id và dst/text bằng biểu thức chính quy.
 */
export function regexFallbackExtract(text: string): ParsedTranslateItem[] {
  const items: ParsedTranslateItem[] = []

  // Mẫu: {"id": "[1]", "dst": "nội dung"}
  const pattern =
    /["'](?:id|ID|Id)["']\s*:\s*(?:"([^"]+)"|'([^']+)'|(\d+))\s*,\s*["'](?:dst|text|translation|vi|target)["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')(?!\s*:)/g

  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const rawId = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    let rawText = match[4] ?? match[5] ?? ''
    try {
      rawText = JSON.parse(`"${rawText}"`) as string
    } catch {
      // Giữ nguyên chuỗi nếu unescape thất bại
    }
    if (rawId !== '') {
      items.push({ tempId: rawId, text: rawText })
    }
  }

  // Mẫu ngược lại: {"dst": "nội dung", "id": "[1]"}
  if (items.length === 0) {
    const reversePattern =
      /["'](?:dst|text|translation|vi|target)["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')(?!\s*:)\s*,\s*["'](?:id|ID|Id)["']\s*:\s*(?:"([^"]+)"|'([^']+)'|(\d+))/g
    while ((match = reversePattern.exec(text)) !== null) {
      let rawText = match[1] ?? match[2] ?? ''
      const rawId = (match[3] ?? match[4] ?? match[5] ?? '').trim()
      try {
        rawText = JSON.parse(`"${rawText}"`) as string
      } catch {
        // Giữ nguyên chuỗi
      }
      if (rawId !== '') {
        items.push({ tempId: rawId, text: rawText })
      }
    }
  }

  return items
}

/**
 * Phân tích cú pháp phản hồi của mô hình thành danh sách ParsedTranslateItem.
 * Khoan dung với markdown fence, lời dẫn, trailing comma, và định dạng key linh hoạt.
 */
export function parseTranslationResponse(rawResponse: string): ParsedTranslateItem[] {
  const cleaned = stripMarkdownFences(rawResponse)
  const arraySlice = extractJsonArraySlice(cleaned)

  if (arraySlice !== null) {
    const sanitized = sanitizeJsonString(arraySlice)
    try {
      const parsed = JSON.parse(sanitized)
      if (Array.isArray(parsed)) {
        const items: ParsedTranslateItem[] = []
        for (const entry of parsed) {
          const item = normalizeItem(entry)
          if (item) items.push(item)
        }
        if (items.length > 0) return items
      }
    } catch {
      // JSON.parse thất bại, thử tiếp phương án regex fallback bên dưới
    }
  }

  // Phương án dự phòng: quét regex trên toàn bộ chuỗi
  const fallbackItems = regexFallbackExtract(cleaned)
  return fallbackItems
}
