import { describe, expect, it } from 'vitest'
import { ADDRESSING_RULES, REGISTER_PRESET_IDS, REGISTER_PRESETS } from './addressingPresets'

describe('bộ mặc định xưng hô', () => {
  it('mỗi mã có một bộ, có dòng quan hệ và luật ngôi ba', () => {
    for (const id of REGISTER_PRESET_IDS) {
      const preset = REGISTER_PRESETS[id]
      expect(preset.id).toBe(id)
      expect(preset.rows.length).toBeGreaterThan(5)
      expect(preset.thirdPerson.length).toBeGreaterThan(0)
      for (const row of preset.rows) {
        expect(row.relation.trim()).not.toBe('')
        expect(row.forward).toMatch(/–/)
      }
    }
  })

  it('không gợi ý cặp "tôi – bạn" ở bất kỳ đâu (chốt ngày 2026-10-05)', () => {
    for (const preset of Object.values(REGISTER_PRESETS)) {
      for (const row of preset.rows) {
        expect(row.forward).not.toMatch(/tôi – bạn/)
        expect(row.backward ?? '').not.toMatch(/tôi – bạn/)
      }
    }
    expect(ADDRESSING_RULES.join('\n')).toContain('Không dùng "tôi – bạn"')
  })

  it('fantasy phương Tây không gợi ý "thần"; cổ trang không dùng "thiếp – chàng" làm mặc định', () => {
    const royal = REGISTER_PRESETS['ja-fantasy'].rows.find((row) =>
      row.relation.includes('hoàng tộc')
    )
    expect(royal?.forward).not.toMatch(/^thần/)
    const lovers = REGISTER_PRESETS['zh-ancient'].rows.find((row) =>
      row.relation.includes('Phu thê')
    )
    expect(lovers?.forward).toBe('ta – nàng')
    expect(lovers?.notes).toContain('Không dùng "thiếp – chàng"')
  })

  it('luật chung không gắn đại từ của một ngôn ngữ nguồn hay một quan hệ riêng', () => {
    const general = ADDRESSING_RULES.join('\n')
    expect(general).not.toMatch(/[぀-ヿ]|お前|貴様/)
    expect(general).not.toContain('Giáo viên')
    expect(general).toContain('giữ cách gọi tương ứng theo quy ước tên')
  })

  // Quyết định 2026-10-14: không còn luật cứng theo bối cảnh; một bộ chỉ còn bảng cặp gợi ý và cách gọi ngôi ba.
  it('không bộ nào còn luật hay ví dụ riêng', () => {
    for (const preset of Object.values(REGISTER_PRESETS)) {
      expect(Object.keys(preset).sort()).toEqual([
        'id',
        'label',
        'rows',
        'sourceLangs',
        'thirdPerson'
      ])
    }
  })
})
