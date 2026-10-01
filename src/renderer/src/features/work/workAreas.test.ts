import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workAreas } from './workAreas'

const BACKLOG = resolve(__dirname, '../../../../../docs/handbook/delivery/backlog.md')

describe('workAreas', () => {
  it('lists the areas in the fixed order, with Chapters first and real', () => {
    expect(workAreas.map((area) => area.label)).toEqual(['Chương', 'Ngữ cảnh', 'Nguồn', 'Tác vụ'])
    expect(workAreas[0].soon).toBeUndefined()
  })

  it('marks every other area as "Sắp có" and backs it with a backlog row', () => {
    const backlog = readFileSync(BACKLOG, 'utf-8')
    for (const area of workAreas.slice(1)) {
      expect(area.soon, area.id).toBe(true)
      const row = backlog.split('\n').find((line) => line.includes('`' + area.id + '`'))
      expect(row, 'no backlog row for ' + area.id).toContain('Chỉ minh họa')
    }
  })
})
