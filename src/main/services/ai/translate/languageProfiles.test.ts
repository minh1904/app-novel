import { describe, expect, it } from 'vitest'
import { genreFamily, languageProfile, suggestRegister } from './languageProfiles'

describe('genreFamily', () => {
  it('nhận thể loại cổ trang và hiện đại từ chữ người dùng gõ', () => {
    expect(genreFamily('Tiên hiệp, tu tiên')).toBe('historical')
    expect(genreFamily('仙侠')).toBe('historical')
    expect(genreFamily('Ngôn tình đô thị')).toBe('modern')
    expect(genreFamily('Urban fantasy')).toBe('modern')
  })

  it('không chắc thì để chung', () => {
    expect(genreFamily(null)).toBe('unknown')
    expect(genreFamily('Ngôn tình')).toBe('unknown')
    // Có cả hai dấu hiệu, ví dụ truyện xuyên không về hiện đại: không đoán.
    expect(genreFamily('Xuyên không đô thị')).toBe('unknown')
  })
})

describe('languageProfile', () => {
  it('tiếng Nhật mặc định giữ hậu tố', () => {
    const lines = languageProfile({ sourceLang: 'ja' }).join('\n')
    expect(lines).toContain('Giữ hậu tố')
    expect(lines).toContain('chị A-san')
  })

  it('tiếng Nhật Việt hóa vẫn giữ thay đổi cách gọi trong bản gốc', () => {
    const lines = languageProfile({ sourceLang: 'ja', honorifics: { mode: 'localize' } }).join('\n')
    expect(lines).toContain('Việt hóa')
    expect(lines).toContain('A-san thành A')
    expect(lines).not.toContain('Giữ hậu tố')
  })

  it('chế độ lai hoặc tùy chỉnh dùng quy tắc người dịch, thiếu quy tắc thì về mặc định', () => {
    const custom = languageProfile({
      sourceLang: 'ja',
      honorifics: { mode: 'custom', rules: 'Giữ -sama, bỏ -san.' }
    }).join('\n')
    expect(custom).toContain('Giữ -sama, bỏ -san.')
    const empty = languageProfile({ sourceLang: 'ja', honorifics: { mode: 'hybrid', rules: ' ' } })
    expect(empty.join('\n')).toContain('Giữ hậu tố')
  })

  it('tiếng Trung đổi lối xưng hô theo thể loại và dùng fallback rõ cho profile lạ', () => {
    expect(languageProfile({ sourceLang: 'zh-Hant', genre: '武侠' }).join('\n')).toContain('cổ đại')
    expect(languageProfile({ sourceLang: 'zh-Hans' }).join('\n')).toContain('giữ một lối')
    expect(languageProfile({ sourceLang: 'en' }).join('\n')).toContain('I/you')
    expect(languageProfile({ sourceLang: 'ko' }).join('\n')).toContain('kính ngữ')
    expect(languageProfile({ sourceLang: 'fr-CA' })).toEqual([])
  })
})

describe('suggestRegister', () => {
  it('gợi ý theo ngôn ngữ và thể loại', () => {
    expect(suggestRegister('ja', 'Hiện đại · Tình cảm (現実世界〔恋愛〕)')).toBe('ja-modern')
    expect(suggestRegister('ja', 'Dị giới · Tình cảm (異世界〔恋愛〕)')).toBe('ja-fantasy')
    expect(suggestRegister('zh-Hans', 'Tiên hiệp')).toBe('zh-ancient')
    expect(suggestRegister('zh-Hant', 'Đô thị')).toBe('zh-modern')
    expect(suggestRegister('zh-Hans', 'Ngôn tình')).toBeNull()
    expect(suggestRegister('en', null)).toBe('en-western')
    expect(suggestRegister('ja', 'Hậu cung, trinh thám')).toBe('ja-court')
  })

  it('mã bộ ghi thẳng trong thể loại thắng phần đoán', () => {
    expect(suggestRegister('ja', 'Học đường [ja-fantasy]')).toBe('ja-fantasy')
  })
})

describe('suggestRegister without evidence', () => {
  // A Japanese work with no genre used to get the school preset, so teacher rules reached every work.
  it('guesses no preset for a Japanese work without a setting signal', () => {
    expect(suggestRegister('ja', null)).toBeNull()
    expect(suggestRegister('ja', 'Hành động')).toBeNull()
    expect(suggestRegister('ja', 'ハイファンタジー〔ファンタジー〕')).toBe('ja-fantasy')
    expect(suggestRegister('ja', '現実世界〔恋愛〕')).toBe('ja-modern')
    expect(suggestRegister('ja', 'Học đường')).toBe('ja-modern')
  })

  it('reads an English translation of a cultivation novel as ancient Chinese', () => {
    expect(suggestRegister('en', 'Xianxia, cultivation')).toBe('zh-ancient')
    expect(suggestRegister('en', 'LitRPG')).toBe('en-western')
  })
})

describe('language profiles: style notes', () => {
  it('gives each source language its own flexible notes', () => {
    const profile = (sourceLang: string, genre?: string) =>
      languageProfile({ sourceLang, genre }).join('\n')
    const ja = profile('ja')
    expect(ja).toContain('không phiên âm romaji')
    expect(ja).toContain('緊張 là căng thẳng')
    const zh = profile('zh-Hans', 'Tiên hiệp')
    expect(zh).toContain('咱们 luôn gồm người nghe')
    expect(zh).toContain('bổn tọa')
    expect(zh).toContain('có phải… hay không')
    const ko = profile('ko')
    expect(ko).toContain('không tự đọc theo Hán Việt')
    expect(ko).toContain('ạ, dạ, thưa')
    expect(ko).not.toContain('Hán Hàn')
    expect(profile('en')).toContain('không lặp "anh ta/cô ta"')
  })
})
