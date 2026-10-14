import { describe, expect, it } from 'vitest'
import { parseCopilotModels } from './copilot'
import { codexThinkingLevels, thinkingLevelsFromWire } from './accountReasoning'

describe('codexThinkingLevels (Hermes ladder per generation)', () => {
  it('never offers minimal; max only from gpt-5.6 / GPT-6 Sol and Luna; Astra cannot turn off', () => {
    expect(codexThinkingLevels('gpt-5.5')).toEqual(['off', 'low', 'medium', 'high', 'xhigh'])
    expect(codexThinkingLevels('gpt-5.6-terra')).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'xhigh',
      'max'
    ])
    expect(codexThinkingLevels('openai/gpt-6-sol-pro')).toContain('max')
    expect(codexThinkingLevels('gpt-6-astra')).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(codexThinkingLevels('gpt-6.1-sol')).not.toContain('off')
  })
})

describe('Copilot /models reasoning levels', () => {
  it('maps supports.reasoning_effort onto Mira levels and drops unknown names', () => {
    const [model] = parseCopilotModels({
      data: [
        {
          id: 'gpt-5.5',
          capabilities: { type: 'chat', supports: { reasoning_effort: ['low', 'high', 'ultra'] } }
        }
      ]
    })
    expect(thinkingLevelsFromWire(model!.reasoningLevels)).toEqual(['low', 'high'])
    expect(thinkingLevelsFromWire(['none', 'medium'])).toEqual(['off', 'medium'])
  })
})
