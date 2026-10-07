import { describe, expect, it } from 'vitest'
import { nearestThinkingLevel } from './thinkingLevels'

describe('nearestThinkingLevel', () => {
  it('picks the closest allowed level', () => {
    expect(nearestThinkingLevel(['minimal', 'low', 'medium', 'high'], 'off')).toBe('minimal')
    expect(nearestThinkingLevel(['low', 'medium', 'high'], 'max')).toBe('high')
  })

  it('picks the lower level when two are equally near', () => {
    expect(nearestThinkingLevel(['minimal', 'medium'], 'low')).toBe('minimal')
  })

  it('has nothing to suggest when the model takes no level', () => {
    expect(nearestThinkingLevel([], 'off')).toBeNull()
  })
})
