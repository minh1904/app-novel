import { describe, expect, it } from 'vitest'
import {
  ADDRESSING_RULES,
  REGISTER_PRESET_IDS,
  REGISTER_PRESETS,
  MAY_TAO_RULE
} from './addressingPresets'

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

  // Quyết định 2026-10-14: không còn luật cứng theo bối cảnh; "mày – tao" là mức cảm xúc, một luật chung.
  it('"mày – tao" là luật chung; không bộ nào còn luật hay ví dụ riêng', () => {
    expect(ADDRESSING_RULES).toContain(MAY_TAO_RULE)
    expect(MAY_TAO_RULE).toContain('cháu với ông bà, con với bố mẹ, trò với thầy cô')
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

  // Vai dưới không tự xưng tao gọi mày với vai trên (quyết định 2026-10-14); bảng gợi ý không được gợi ý ngược.
  it('không dòng nào gợi ý vai dưới xưng tao gọi mày với thầy cô hay cha mẹ', () => {
    const row = REGISTER_PRESETS['ja-modern'].rows.find((item) => item.relation.includes('thô'))
    expect(row?.forward).toBe('cô / thầy – cậu')
    for (const preset of Object.values(REGISTER_PRESETS)) {
      for (const junior of preset.rows.filter((item) =>
        /→ (thầy cô|cha mẹ|bố mẹ)/i.test(item.relation)
      )) {
        expect(junior.forward + (junior.notes ?? '')).not.toMatch(/tao – mày|mày – tao/)
      }
    }
    for (const preset of Object.values(REGISTER_PRESETS)) {
      for (const teacher of preset.rows.filter((item) => /Thầy cô|Giáo viên/.test(item.relation))) {
        expect(teacher.forward).not.toMatch(/mày|tao/)
      }
    }
  })
})
