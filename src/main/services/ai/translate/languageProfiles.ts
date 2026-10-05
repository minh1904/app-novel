import type { SourceLanguage } from '../../../../shared/contracts/library'
import {
  REGISTER_PRESET_IDS,
  type RegisterPresetId
} from '../../../../shared/contracts/addressingPresets'

/**
 * Quy ước mặc định theo ngôn ngữ nguồn và thể loại — tầng thấp nhất của chỉ dẫn dịch.
 *
 * Profile chỉ nói điều đúng cho **cả một loại truyện**: chính sách kính ngữ, lối xưng hô chung, cách
 * viết tên. Cặp xưng hô của từng nhân vật thuộc ma trận xưng hô, thuật ngữ thuộc glossary; cả hai ghi
 * đè profile khi xung đột. Lời lẽ cố ý là **gợi ý theo bối cảnh** chứ không phải bảng ánh xạ cứng
 * (không ép mọi thoại cổ trang thành "ta – ngươi", không coi "tôi – bạn" là trung tính) — xem
 * [nhân vật và xưng hô](../../../../../docs/modules/context/characters-and-addressing.md).
 *
 * Profile phụ thuộc vào tác phẩm, không phụ thuộc lô, nên nằm trong system prompt và giữ nguyên
 * từng ký tự giữa các lô của cùng tác phẩm.
 */

/**
 * Bốn chế độ kính ngữ Nhật theo quyết định ngày 2026-10-04; mặc định **Giữ hậu tố**.
 * `hybrid` và `custom` cần quy tắc của người dịch; thiếu quy tắc thì quay về mặc định.
 */
export const HONORIFIC_MODES = ['keep', 'localize', 'hybrid', 'custom'] as const
export type HonorificMode = (typeof HONORIFIC_MODES)[number]

export interface HonorificPolicy {
  mode: HonorificMode
  /** Quy tắc người dịch viết cho `hybrid`/`custom`. */
  rules?: string
}

export const DEFAULT_HONORIFICS: HonorificPolicy = { mode: 'keep' }

/** Nhóm thể loại đủ khác nhau để đổi lối xưng hô. Hiện chỉ có ý nghĩa với nguồn tiếng Trung. */
export type GenreFamily = 'historical' | 'modern' | 'unknown'

const HISTORICAL = [
  'cổ trang',
  'cổ đại',
  'tiên hiệp',
  'kiếm hiệp',
  'võ hiệp',
  'huyền huyễn',
  'tu tiên',
  'tu chân',
  'cung đấu',
  'trạch đấu',
  'xuyên không',
  'lịch sử',
  'xianxia',
  'wuxia',
  'xuanhuan',
  'cultivation',
  'historical',
  '古代',
  '古言',
  '仙侠',
  '武侠',
  '玄幻',
  '修仙',
  '修真',
  '宫斗',
  '宅斗',
  '历史',
  '歷史'
]
const MODERN = [
  'hiện đại',
  'đô thị',
  'học đường',
  'vườn trường',
  'showbiz',
  'giới giải trí',
  'urban',
  'modern',
  'contemporary',
  'school',
  '都市',
  '现代',
  '現代',
  '现言',
  '校园',
  '校園',
  '娱乐圈'
]

/**
 * Suy nhóm thể loại từ trường `genre` người dùng gõ tự do. Không chắc thì `unknown` — profile chung
 * để model tự đọc bối cảnh còn hơn ép sai lối xưng hô cho nửa số truyện.
 */
export function genreFamily(genre: string | null | undefined): GenreFamily {
  const text = (genre ?? '').toLowerCase()
  if (text.trim() === '') return 'unknown'
  const historical = HISTORICAL.some((word) => text.includes(word))
  const modern = MODERN.some((word) => text.includes(word))
  if (historical === modern) return 'unknown'
  return historical ? 'historical' : 'modern'
}

export interface LanguageProfileInput {
  sourceLang?: SourceLanguage | string
  genre?: string | null
  honorifics?: HonorificPolicy
}

const LANGUAGE_NAME: Record<string, string> = {
  ja: 'tiếng Nhật',
  'zh-Hans': 'tiếng Trung',
  'zh-Hant': 'tiếng Trung',
  en: 'tiếng Anh'
}

export function languageName(sourceLang?: string): string {
  return (sourceLang && LANGUAGE_NAME[sourceLang]) || 'ngôn ngữ nguồn'
}

function honorificLines(policy: HonorificPolicy): string[] {
  const rules = policy.rules?.trim() ?? ''
  if ((policy.mode === 'hybrid' || policy.mode === 'custom') && rules !== '') {
    return ['- Kính ngữ theo quy tắc của người dịch:', rules]
  }
  if (policy.mode === 'localize') {
    return [
      '- Việt hóa kính ngữ gắn sau tên (-san, -kun, -chan, -sama…) thành cách gọi tiếng Việt theo vai và quan hệ; không giữ hậu tố Nhật.',
      '- Khi bản gốc đổi cách gọi một người (A-san thành A, A-sama thành A-san), đổi cách gọi tiếng Việt tương ứng để giữ thay đổi đó.'
    ]
  }
  return [
    '- Giữ hậu tố gắn sau tên (-san, -kun, -chan, -sama…) đúng như bản gốc; không tự thêm hậu tố không có trong bản gốc.',
    '- Không ghép thêm danh xưng tiếng Việt thành dạng lai như "chị A-san".',
    '- Chức danh hay quan hệ đứng riêng (sensei, senpai…) dịch theo vai trong cảnh.'
  ]
}

function japanese(policy: HonorificPolicy): string[] {
  return [
    ...honorificLines(policy),
    '- Bản gốc hay lược chủ ngữ: chỉ thêm đại từ khi câu tiếng Việt cần, và suy người nói từ mạch truyện, không suy từ một chữ.',
    '- Dùng dấu câu tiếng Việt thay cho 、。！？. Lời thoại 「…」 viết thành “…”, trích dẫn lồng 『…』 thành ‘…’; giữ một kiểu cho cả chương.'
  ]
}

function chinese(family: GenreFamily): string[] {
  const common = [
    '- Không gán 你 hay 您 vào một cặp đại từ tiếng Việt cố định; chọn theo quan hệ giữa người nói và người nghe.',
    '- Tránh lạm dụng từ Hán Việt tối nghĩa; câu văn phải đọc như tiếng Việt.'
  ]
  if (family === 'historical') {
    return [
      '- Tên người, địa danh, công pháp, cảnh giới dùng âm Hán Việt.',
      '- Xưng hô theo bối cảnh cổ đại và vai vế: với bề trên, trưởng bối, đồng môn, kẻ thù mỗi cặp một khác; không ép mọi lời thoại thành "ta – ngươi".',
      ...common
    ]
  }
  if (family === 'modern') {
    return [
      '- Tên người dùng âm Hán Việt.',
      '- Xưng hô theo lối nói hiện đại (anh – em, tôi – cậu, mày – tao… tùy quan hệ); không dùng lối cổ phong như ta – ngươi, huynh – đệ trừ khi nhân vật cố ý nói vậy.',
      '- Không đổi cặp xưng hô để báo trước diễn biến tình cảm sớm hơn bản gốc.',
      ...common
    ]
  }
  return [
    '- Tên người, địa danh dùng âm Hán Việt.',
    '- Chọn lối xưng hô cổ phong hay hiện đại theo bối cảnh của truyện và giữ một lối cho cả chương.',
    ...common
  ]
}

function english(): string[] {
  return [
    '- I/you không cho biết quan hệ: chọn cặp xưng hô tiếng Việt theo tuổi, vai vế và độ thân giữa hai người, rồi giữ nguyên cặp đó khi quan hệ chưa đổi.',
    '- Tên riêng giữ dạng chữ Latinh của bản gốc.',
    '- Dịch thoát ý khi dịch sát làm câu tiếng Việt gượng, nhưng giữ sắc thái và giọng nhân vật.'
  ]
}

/** Các dòng quy ước theo ngôn ngữ nguồn; mảng rỗng khi ngôn ngữ không có profile. */
export function languageProfile(input: LanguageProfileInput): string[] {
  switch (input.sourceLang) {
    case 'ja':
      return japanese(input.honorifics ?? DEFAULT_HONORIFICS)
    case 'zh-Hans':
    case 'zh-Hant':
      return chinese(genreFamily(input.genre))
    case 'en':
      return english()
    default:
      return []
  }
}

const COURT = ['hậu cung', 'cung đình', 'cung đấu', '後宮', '宮廷', '妃']

const FANTASY = [
  'dị giới',
  'isekai',
  'fantasy',
  'quý tộc',
  'tiểu thư',
  'hoàng tử',
  'chuyển sinh',
  'ma pháp',
  '異世界',
  'ファンタジー',
  '令嬢',
  '貴族',
  '転生'
]

/**
 * Gợi ý bộ mặc định xưng hô cho tác phẩm. Người dịch chốt; đây chỉ là điểm khởi đầu. Ghi thẳng mã bộ
 * vào thể loại (ví dụ "[ja-fantasy]") thì mã đó thắng, cho tới khi lựa chọn được lưu riêng theo tác phẩm.
 */
export function suggestRegister(
  sourceLang: SourceLanguage | string | undefined,
  genre: string | null | undefined
): RegisterPresetId | null {
  const text = (genre ?? '').toLowerCase()
  const explicit = REGISTER_PRESET_IDS.find((id) => text.includes(`[${id}]`))
  if (explicit) return explicit
  switch (sourceLang) {
    case 'ja':
      if (COURT.some((word) => text.includes(word))) return 'ja-court'
      return FANTASY.some((word) => text.includes(word)) ? 'ja-fantasy' : 'ja-modern'
    case 'zh-Hans':
    case 'zh-Hant': {
      const family = genreFamily(genre)
      return family === 'historical' ? 'zh-ancient' : family === 'modern' ? 'zh-modern' : null
    }
    case 'en':
      return 'en-western'
    default:
      return null
  }
}
