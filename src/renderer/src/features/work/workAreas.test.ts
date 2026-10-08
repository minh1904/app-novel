import { describe, expect, it } from 'vitest'
import { workAreas } from './workAreas'

describe('workAreas', () => {
  it('lists the areas in the fixed order, with Chapters and Context real', () => {
    expect(workAreas.map((area) => area.label)).toEqual(['Chương', 'Ngữ cảnh', 'Nguồn', 'Tác vụ'])
    expect(workAreas[0].soon).toBeUndefined()
    expect(workAreas[1].soon).toBeUndefined()
  })

  it('marks Sources and Jobs as "Sắp có"', () => {
    for (const area of workAreas.slice(2)) {
      expect(area.soon, area.id).toBe(true)
    }
  })
})
