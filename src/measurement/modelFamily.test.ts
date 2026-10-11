import { describe, it, expect } from 'vitest'
import { getModelFamily, checkJudgeFamily } from './modelFamily'

describe('modelFamily', () => {
  it('resolves family names from vendor prefixes and model names', () => {
    expect(getModelFamily('gemini-2.5-flash')).toBe('google')
    expect(getModelFamily('google/gemini-2.5-pro')).toBe('google')
    expect(getModelFamily('claude-3-7-sonnet')).toBe('anthropic')
    expect(getModelFamily('anthropic/claude-3.5-haiku')).toBe('anthropic')
    expect(getModelFamily('gpt-4o')).toBe('openai')
    expect(getModelFamily('o3-mini')).toBe('openai')
    expect(getModelFamily('deepseek-chat')).toBe('deepseek')
  })

  it('rejects judge from the same family as translator (Gemini translates, Gemini judges)', () => {
    const res = checkJudgeFamily('gemini-2.5-pro', ['gemini-2.5-flash'])
    expect(res.valid).toBe(false)
    expect(res.reason).toContain('Vi phạm')
  })

  it('requires a 3rd family when 2 translators belong to 2 different families', () => {
    // Người dịch: Gemini và Claude
    const translators = ['gemini-2.5-flash', 'claude-3-5-sonnet']

    // Giám khảo: Claude (xung đột với người dịch thứ 2)
    const judgeClaude = checkJudgeFamily('claude-3-7-sonnet', translators)
    expect(judgeClaude.valid).toBe(false)

    // Giám khảo: Gemini (xung đột với người dịch thứ 1)
    const judgeGemini = checkJudgeFamily('gemini-2.5-pro', translators)
    expect(judgeGemini.valid).toBe(false)

    // Giám khảo: GPT-4o (họ thứ 3 độc lập) -> Hợp lệ
    const judgeGpt = checkJudgeFamily('gpt-4o', translators)
    expect(judgeGpt.valid).toBe(true)
  })

  it('allows same family when allowSameFamily flag is set', () => {
    const res = checkJudgeFamily('gemini-2.5-pro', ['gemini-2.5-flash'], {
      allowSameFamily: true
    })
    expect(res.valid).toBe(true)
    expect(res.reason).toContain('Cảnh báo')
  })
})
