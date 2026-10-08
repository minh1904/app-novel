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
  return (
    text
      // Xóa dấu phẩy thừa trước dấu đóng mảng: , ] -> ]
      .replace(/,\s*([\]}])/g, '$1')
      // Model đôi khi viết thừa `"dst":` trước khóa nhãn ("dst":"speaker_to_listener":"A→B"); bỏ phần
      // thừa để khóa nhãn không bị đọc thành bản dịch.
      .replace(/"dst"\s*:\s*"(speaker_to_listener|self_ref|addr_ref)"\s*:/g, '"$1":')
  )
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

/** Thẻ của prompt mà model đôi khi chép nhầm vào JSON trả về. */
const PROMPT_TAGS =
  'speaker_to_listener|self_ref|addr_ref|addressing|context|characters|glossary|previous|source'

/**
 * Bỏ thẻ prompt lọt vào bản dịch, ví dụ
 * `<speaker_to_listener>Milly→Leon</speaker_to_listener><self_ref>tôi</self_ref><dst>「…」</dst>`:
 * có `<dst>` thì lấy phần bên trong, rồi xóa các khối nhãn và thẻ lẻ còn sót.
 */
export function stripLeakedTags(text: string): string {
  if (!text.includes('<')) return text
  const inner = /<dst>([\s\S]*?)(?:<\/dst>|$)/.exec(text)
  return (
    (inner ? inner[1] : text)
      .replace(new RegExp(`<(${PROMPT_TAGS})>[\\s\\S]*?</\\1>`, 'g'), '')
      // `string` không có trong prompt nhưng model từng bịa ra (`Hà…</string> Ở cái môi trường…`).
      .replace(new RegExp(`</?(?:dst|string|${PROMPT_TAGS})>`, 'g'), '')
      .trim()
  )
}

/** `[N]` trong một khóa id bị hỏng như `id><context>[14]</context>…<dst` hoặc `id><id>[6]`. */
const BROKEN_ID_KEY = /^id\b[^[]{0,40}?(\[\d+\])/

/**
 * Chuẩn hóa một object bất kỳ từ model về dạng { tempId, text }.
 */
function normalizeItem(raw: unknown): ParsedTranslateItem | null {
  if (typeof raw !== 'object' || raw === null) return null

  const obj = raw as Record<string, unknown>

  // Trường hợp chuẩn: { id: "[1]", dst: "..." } hoặc { id: "1", text: "..." }
  let idVal = obj.id ?? obj.ID ?? obj.Id
  // `src` chỉ là đường lùi khi model ghi bản dịch nhầm sang khóa của bản gốc; nếu đó là bản gốc chép
  // lại thì bước đối soát loại nó.
  let textVal = obj.dst ?? obj.text ?? obj.translation ?? obj.vi ?? obj.target ?? obj.src

  // Trường hợp model dùng ID làm key: { "[1]": "Bản dịch" }
  if (idVal === undefined && textVal === undefined) {
    const keys = Object.keys(obj)
    if (keys.length === 1 && (/^\[?\d+\]?$/.test(keys[0]) || keys[0].startsWith('['))) {
      idVal = keys[0]
      textVal = obj[keys[0]]
    }
  }

  // Khóa id lẫn thẻ: cả `{"id><context>[14]…<dst":"bản dịch"}` vẫn là JSON hợp lệ với một khóa lạ.
  if (idVal === undefined) {
    for (const key of Object.keys(obj)) {
      const match = BROKEN_ID_KEY.exec(key)
      if (!match) continue
      idVal = match[1]
      if (textVal === undefined || /<dst$/.test(key)) textVal = obj[key]
      break
    }
  }

  if (idVal !== undefined && textVal !== undefined) {
    const tempId = String(idVal).trim()
    const text = stripLeakedTags(typeof textVal === 'string' ? textVal : String(textVal))
    return { tempId, text }
  }

  return null
}

/**
 * Tách phản hồi thành từng object theo ranh giới `},{"id`, không cần cả mảng là JSON hợp lệ. Bản dịch
 * hầu như không chứa chuỗi đó, còn dấu ngoặc kép không escape hay thiếu dấu đóng thì không làm lệch ranh giới.
 */
function splitObjects(text: string): string[] {
  const start = text.search(/\{\s*"id/)
  if (start === -1) return []
  const end = text.lastIndexOf('}')
  const body = text.slice(start, end > start ? end + 1 : undefined)
  const parts = body.split(/\}\s*,?\s*(?=\{\s*"id)/)
  return parts.map((part, index) => (index < parts.length - 1 ? part + '}' : part))
}

function unescapeJsonText(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string
  } catch {
    // Dấu ngoặc kép không escape bên trong bản dịch: giữ nguyên, chỉ giải các escape thường gặp.
    return value.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
  }
}

/**
 * Cứu một object hỏng: id là `[N]` đầu tiên sau khóa id, bản dịch là mọi thứ sau khóa `dst` tới hết
 * object (chịu được dấu ngoặc kép không escape và thiếu dấu đóng), không có `dst` thì lấy `<dst>…</dst>`
 * hoặc `src` như ở `normalizeItem`.
 */
function salvageObject(raw: string): ParsedTranslateItem | null {
  const id = /"id\b[^[]{0,40}?(\[\d+\])/.exec(raw)?.[1]
  if (!id) return null
  const tail = (from: RegExpExecArray | null): string | null =>
    from ? raw.slice(from.index + from[0].length).replace(/"?\s*\}?\s*$/, '') : null
  const dstKeys = [...raw.matchAll(/(?:"dst"|<dst")\s*:\s*"/g)]
  const dst = tail(dstKeys.length > 0 ? (dstKeys[dstKeys.length - 1] as RegExpExecArray) : null)
  let text: string | null = dst
  if (text === null && /<dst>/.test(raw)) text = raw
  if (text === null) text = tail(/"src"\s*:\s*"/.exec(raw))
  if (text === null) return null
  return { tempId: id, text: stripLeakedTags(unescapeJsonText(text)) }
}

/** Đọc từng object khi cả mảng không parse được: một object hỏng không kéo theo cả lô. */
function parseObjectByObject(text: string): ParsedTranslateItem[] {
  const items: ParsedTranslateItem[] = []
  for (const raw of splitObjects(text)) {
    let item: ParsedTranslateItem | null = null
    try {
      item = normalizeItem(JSON.parse(sanitizeJsonString(raw)))
    } catch {
      item = null
    }
    item ??= salvageObject(sanitizeJsonString(raw))
    if (item) items.push(item)
  }
  return items
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

function normalizeAll(entries: unknown[]): ParsedTranslateItem[] {
  const items: ParsedTranslateItem[] = []
  for (const entry of entries) {
    const item = normalizeItem(entry)
    if (item) items.push(item)
  }
  return items
}

function parseOrNull(text: string): unknown {
  try {
    return JSON.parse(sanitizeJsonString(text))
  } catch {
    return undefined
  }
}

/**
 * Hình dạng object `{"items":[…]}` của chế độ có schema (change `translate-structured-output-trial`):
 * cả chuỗi, rồi phần từ `{` đầu tới `}` cuối khi có lời dẫn. Đọc trước đường mảng để object không phụ
 * thuộc vào việc phần cắt `[`…`]` tình cờ trùng mảng `items`. `null` khi không phải hình dạng đó.
 */
function parseItemsObject(cleaned: string): ParsedTranslateItem[] | null {
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const candidates = [cleaned, start >= 0 && end > start ? cleaned.slice(start, end + 1) : '']
  for (const candidate of candidates) {
    if (candidate === '') continue
    const parsed = parseOrNull(candidate)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const list = (parsed as { items?: unknown }).items
    if (!Array.isArray(list)) continue
    const items = normalizeAll(list)
    if (items.length > 0) return items
  }
  return null
}

/**
 * Phân tích cú pháp phản hồi của mô hình thành danh sách ParsedTranslateItem.
 * Khoan dung với markdown fence, lời dẫn, trailing comma, và định dạng key linh hoạt. Nhận cả object
 * `{"items":[…]}` lẫn mảng cũ; mảng cũ cho đúng kết quả như trước.
 */
export function parseTranslationResponse(rawResponse: string): ParsedTranslateItem[] {
  const cleaned = stripMarkdownFences(rawResponse)
  const fromObject = parseItemsObject(cleaned)
  if (fromObject !== null) return fromObject
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

  // Cả mảng hỏng thường chỉ vì một object (dấu ngoặc kép không escape, thiếu dấu đóng, thẻ lạ): đọc
  // từng object để không mất các object lành, nhất là câu thoại có nhãn mà regex dưới đây bỏ qua.
  const objectItems = parseObjectByObject(cleaned)
  if (objectItems.length > 0) return objectItems

  // Phương án dự phòng: quét regex trên toàn bộ chuỗi
  const fallbackItems = regexFallbackExtract(cleaned)
  return fallbackItems
}
