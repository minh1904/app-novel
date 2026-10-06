import { describe, expect, it } from 'vitest'
import { MOCK_FEATURES } from './mockFeatures'

describe('mock features', () => {
  it('uses a distinct id per feature', () => {
    const ids = Object.values(MOCK_FEATURES).map((feature) => feature.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
