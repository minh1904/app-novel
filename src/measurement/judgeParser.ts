/**
 * Lenient parser and verdict evaluator for LLM judge (design D4).
 * Pure function with no Node/DOM dependencies.
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
  // Pass 2 has swapped candidates: A in Pass 2 is Run B, B in Pass 2 is Run A.
  // Run A wins if: Pass 1 picked A AND Pass 2 picked B.
  if (p1 === 'A' && p2 === 'B') {
    return { consistentVerdict: 'A', isInconsistent: false }
  }
  // Run B wins if: Pass 1 picked B AND Pass 2 picked A.
  if (p1 === 'B' && p2 === 'A') {
    return { consistentVerdict: 'B', isInconsistent: false }
  }
  // Both tied:
  if (p1 === 'tie' && p2 === 'tie') {
    return { consistentVerdict: 'tie', isInconsistent: false }
  }
  // Any disagreement (e.g. both picked candidate A regardless of order -> position bias!)
  return { consistentVerdict: 'tie', isInconsistent: true }
}

/**
 * Normalizes and parses raw LLM text into JudgeOutput:
 * - Strips markdown code blocks (```json ... ``` or ``` ...)
 * - Strips leading/trailing text outside the first { and last }
 * - Fixes raw unescaped newlines inside strings if needed
 */
export function parseJudgeResponse(rawText: string): JudgeOutput | null {
  if (!rawText || rawText.trim() === '') return null

  let text = rawText.trim()

  // 1. Remove markdown fences ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) {
    text = fenceMatch[1].trim()
  }

  // 2. Extract outer JSON object {...}
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  // 3. Attempt direct JSON parse
  try {
    const parsed = JSON.parse(text)
    if (validateJudgeStructure(parsed)) {
      return parsed
    }
  } catch {
    // 4. Try lenient fixes: unescaped control newlines inside quotes
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
