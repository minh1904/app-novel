/**
 * Bộ phân tích cú pháp linh hoạt và đánh giá kết quả cho trọng tài LLM.
 * Hàm thuần túy không phụ thuộc Node/DOM.
 */

export interface JudgeError {
  side: 'A' | 'B'
  severity: 'major' | 'minor'
  category: 'meaning' | 'fluency' | 'address' | 'style'
}

export interface JudgeParagraphVerdict {
  n: number
  verdict: 'A' | 'B' | 'tie'
  errors?: JudgeError[]
}

export interface JudgeOutput {
  paragraphs: JudgeParagraphVerdict[]
}

export function evaluateTwoPassVerdicts(
  p1: 'A' | 'B' | 'tie',
  p2: 'A' | 'B' | 'tie'
): { consistentVerdict: 'A' | 'B' | 'tie'; isInconsistent: boolean } {
  // Lượt 2 đảo vị trí hai ứng viên: A ở lượt 2 là lượt chạy B, B ở lượt 2 là lượt chạy A.
  // Lượt chạy A thắng nếu: Lượt 1 chọn A VÀ Lượt 2 chọn B.
  if (p1 === 'A' && p2 === 'B') {
    return { consistentVerdict: 'A', isInconsistent: false }
  }
  // Lượt chạy B thắng nếu: Lượt 1 chọn B VÀ Lượt 2 chọn A.
  if (p1 === 'B' && p2 === 'A') {
    return { consistentVerdict: 'B', isInconsistent: false }
  }
  // Cả hai đều hòa:
  if (p1 === 'tie' && p2 === 'tie') {
    return { consistentVerdict: 'tie', isInconsistent: false }
  }
  // Mọi bất đồng (ví dụ cả hai lượt đều chọn vị trí A bất kể thứ tự -> thiên vị vị trí)
  return { consistentVerdict: 'tie', isInconsistent: true }
}

/**
 * Chuẩn hóa và phân tích cú pháp văn bản thô từ LLM thành JudgeOutput:
 * - Loại bỏ các khối mã markdown (```json ... ``` hoặc ``` ...)
 * - Loại bỏ văn bản thừa trước dấu { đầu tiên và sau dấu } cuối cùng
 * - Xử lý dấu xuống dòng chưa escape bên trong chuỗi ký tự nếu cần
 */
export function parseJudgeResponse(rawText: string): JudgeOutput | null {
  if (!rawText || rawText.trim() === '') return null

  let text = rawText.trim()

  // 1. Loại bỏ khối markdown ```json ... ``` hoặc ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) {
    text = fenceMatch[1].trim()
  }

  // 2. Trích xuất đối tượng JSON ngoài cùng {...}
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  // 3. Thử phân tích cú pháp JSON trực tiếp
  try {
    const parsed = JSON.parse(text)
    if (validateJudgeStructure(parsed)) {
      return parsed
    }
  } catch {
    // 4. Thử sửa lỗi linh hoạt: ký tự xuống dòng chưa escape trong chuỗi
    try {
      const sanitized = sanitizeRawJsonString(text)
      const parsed = JSON.parse(sanitized)
      if (validateJudgeStructure(parsed)) {
        return parsed
      }
    } catch {
      return null
    }
  }

  return null
}

function sanitizeRawJsonString(jsonStr: string): string {
  let inString = false
  let escaped = false
  let out = ''

  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i]
    if (escaped) {
      out += c
      escaped = false
      continue
    }
    if (c === '\\') {
      out += c
      escaped = true
      continue
    }
    if (c === '"') {
      inString = !inString
      out += c
      continue
    }
    if (inString && (c === '\n' || c === '\r')) {
      out += c === '\r' ? '' : '\\n'
      continue
    }
    out += c
  }

  return out
}

function validateJudgeStructure(obj: unknown): obj is JudgeOutput {
  if (!obj || typeof obj !== 'object') return false
  const record = obj as Record<string, unknown>
  if (!Array.isArray(record.paragraphs)) return false

  for (const item of record.paragraphs) {
    if (!item || typeof item !== 'object') return false
    const p = item as Record<string, unknown>
    if (typeof p.n !== 'number') return false
    if (typeof p.verdict !== 'string' || !['A', 'B', 'tie'].includes(p.verdict)) return false
    if (p.errors !== undefined && !Array.isArray(p.errors)) return false
  }

  return true
}
