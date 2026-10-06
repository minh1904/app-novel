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

  it('luật thầy trò thuộc bộ học đường hiện đại; luật đại từ Nhật chỉ ở bộ Nhật', () => {
    for (const id of ['ja-modern', 'zh-modern'] as const) {
      expect(REGISTER_PRESETS[id].rules?.join('\n')).toContain('hạn chế "mày/tao"')
    }
    expect(REGISTER_PRESETS['ja-modern'].rules?.join('\n')).toContain('お前/テメェ/貴様')
    expect(REGISTER_PRESETS['zh-modern'].rules?.join('\n')).not.toContain('お前')
    for (const id of ['ja-fantasy', 'ja-court', 'zh-ancient', 'en-western'] as const) {
      expect(REGISTER_PRESETS[id].rules ?? []).toEqual([])
    }
  })

  it('giáo viên nói thô mặc định dùng cậu, dành mày/tao cho ngoại lệ đã duyệt', () => {
    const row = REGISTER_PRESETS['ja-modern'].rows.find((item) => item.relation.includes('thô'))
    expect(row?.forward).toBe('cô / thầy – cậu')
    expect(row?.notes).toContain('ngoại lệ đã duyệt')
    for (const preset of Object.values(REGISTER_PRESETS)) {
      for (const teacher of preset.rows.filter((item) => /Thầy cô|Giáo viên/.test(item.relation))) {
        expect(teacher.forward).not.toMatch(/mày|tao/)
      }
    }
  })
})
