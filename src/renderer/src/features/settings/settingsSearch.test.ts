import { describe, expect, it } from 'vitest'
import { groupOf, normalizeLocation } from './settingsNav'
import { SETTINGS_INDEX, searchSettings } from './settingsSearch'

describe('settings search', () => {
  it('finds a provider card by name and points at its key card', () => {
    expect(searchSettings('gemini')[0]?.location).toEqual({
      group: 'connections',
      page: 'keys',
      key: 'provider:google'
    })
  })

  it('ignores Vietnamese marks and case', () => {
    expect(searchSettings('du phong').map((hit) => hit.title)).toContain('Model dự phòng')
    expect(searchSettings('HIỆU ỨNG KÍNH')[0]?.title).toBe('Hiệu ứng kính (acrylic)')
  })

  it('returns nothing for an empty query', () => {
    expect(searchSettings('   ')).toEqual([])
  })

  it('only points at pages that exist', () => {
    for (const entry of SETTINGS_INDEX) {
      expect(
        groupOf(entry.location.group).pages.some((page) => page.id === entry.location.page)
      ).toBe(true)
      expect(normalizeLocation(entry.location)).toEqual(entry.location)
    }
  })
})
