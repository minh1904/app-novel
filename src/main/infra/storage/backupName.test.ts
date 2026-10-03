import { describe, expect, it } from 'vitest'
import { backupFileName } from './backupName'

const day = new Date(2026, 9, 1)

describe('backupFileName', () => {
  it('uses the title and the date', () => {
    expect(backupFileName('Hiệu thuốc trên núi', day)).toBe('Hiệu thuốc trên núi — 2026-10-01.mira')
  })

  it('removes characters Windows does not allow', () => {
    const name = backupFileName('A/B\\C: "D"? <E> | F*', day)
    expect(name).not.toMatch(/[\\/:*?"<>|]/)
    expect(name.endsWith(' — 2026-10-01.mira')).toBe(true)
    expect(name).toContain('A B C')
  })

  it('keeps Chinese, Japanese and emoji', () => {
    expect(backupFileName('山中药铺 😀', day)).toBe('山中药铺 😀 — 2026-10-01.mira')
  })

  it('falls back when nothing usable is left or the name is reserved', () => {
    expect(backupFileName('???', day)).toBe('Tác phẩm — 2026-10-01.mira')
    expect(backupFileName('', day)).toBe('Tác phẩm — 2026-10-01.mira')
    expect(backupFileName('CON', day)).toBe('Tác phẩm — 2026-10-01.mira')
  })

  it('drops trailing dots and spaces', () => {
    expect(backupFileName('Hết.  ', day)).toBe('Hết — 2026-10-01.mira')
  })

  it('cuts very long titles by characters, not in the middle of a pair', () => {
    const name = backupFileName('😀'.repeat(300), day)
    expect([...name.replace(' — 2026-10-01.mira', '')]).toHaveLength(100)
  })

  it('pads month and day', () => {
    expect(backupFileName('A', new Date(2026, 0, 5))).toBe('A — 2026-01-05.mira')
  })
})
