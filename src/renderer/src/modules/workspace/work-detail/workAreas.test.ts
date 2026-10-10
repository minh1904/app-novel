import { describe, expect, it } from 'vitest'
import { workAreas } from './workAreas'

describe('workAreas', () => {
  it('lists the areas in the fixed order, with Chapters, Context and Sources real', () => {
    expect(workAreas.map((area) => area.label)).toEqual(['Chương', 'Ngữ cảnh', 'Bản raw', 'Tác vụ'])
    expect(workAreas[0].soon).toBeUndefined()
    expect(workAreas[1].soon).toBeUndefined()
    expect(workAreas[2].soon).toBeUndefined()
  })

  it('marks Jobs as "Sắp có"', () => {
    expect(workAreas[3].soon).toBe(true)
  })
})
