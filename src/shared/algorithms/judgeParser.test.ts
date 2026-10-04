import { describe, it, expect } from 'vitest'
import { parseJudgeResponse, evaluateTwoPassVerdicts } from './judgeParser'

describe('judgeParser', () => {
  it('parses clean valid JSON response', () => {
    const raw = JSON.stringify({
      paragraphs: [
        {
          n: 1,
          verdict: 'A',
          errors: [{ side: 'B', severity: 'minor', category: 'fluency' }]
        },
        { n: 2, verdict: 'tie' }
      ]
    })
    const parsed = parseJudgeResponse(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.paragraphs).toHaveLength(2)
    expect(parsed?.paragraphs[0].verdict).toBe('A')
  })

  it('strips markdown code blocks (```json ... ```)', () => {
    const raw = `Here is my evaluation:
\`\`\`json
{
  "paragraphs": [
    { "n": 1, "verdict": "B" }
  ]
}
\`\`\`
Hope this helps!`
    const parsed = parseJudgeResponse(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.paragraphs[0].verdict).toBe('B')
  })

  it('handles raw unescaped newlines inside string values', () => {
    const raw = `{
  "paragraphs": [
    {
      "n": 1,
      "verdict": "A",
      "errors": [
        {
          "side": "B",
          "severity": "major",
          "category": "meaning",
          "note": "Line 1
Line 2 with raw newline"
        }
      ]
    }
  ]
}`
    const parsed = parseJudgeResponse(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.paragraphs[0].verdict).toBe('A')
  })

  it('returns null for completely broken response that cannot be parsed', () => {
    const broken = 'Sorry, as an AI language model I cannot judge this text.'
    expect(parseJudgeResponse(broken)).toBeNull()
  })

  describe('evaluateTwoPassVerdicts', () => {
    it('identifies win for A when both passes consistently choose Candidate A', () => {
      const res = evaluateTwoPassVerdicts('A', 'B')
      expect(res.consistentVerdict).toBe('A')
      expect(res.isInconsistent).toBe(false)
    })

    it('identifies win for B when both passes consistently choose Candidate B', () => {
      const res = evaluateTwoPassVerdicts('B', 'A')
      expect(res.consistentVerdict).toBe('B')
      expect(res.isInconsistent).toBe(false)
    })

    it('identifies tie when both passes choose tie', () => {
      const res = evaluateTwoPassVerdicts('tie', 'tie')
      expect(res.consistentVerdict).toBe('tie')
      expect(res.isInconsistent).toBe(false)
    })

    it('flags inconsistency due to position bias (both passes pick candidate A regardless of order)', () => {
      const res = evaluateTwoPassVerdicts('A', 'A')
      expect(res.consistentVerdict).toBe('tie')
      expect(res.isInconsistent).toBe(true)
    })
  })
})
