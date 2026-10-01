import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MOCK_FEATURES } from './mockFeatures'

const BACKLOG = resolve(__dirname, '../../../../../docs/handbook/delivery/backlog.md')

describe('mock features', () => {
  const backlog = readFileSync(BACKLOG, 'utf-8')

  it.each(Object.values(MOCK_FEATURES))(
    '$id has a backlog row marked as illustration only',
    (feature) => {
      const row = backlog.split('\n').find((line) => line.includes('`' + feature.id + '`'))
      expect(row, 'no row for ' + feature.id + ' in delivery/backlog.md').toBeDefined()
      expect(row).toContain('Chỉ minh họa')
    }
  )

  it('uses a distinct id per feature', () => {
    const ids = Object.values(MOCK_FEATURES).map((feature) => feature.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
