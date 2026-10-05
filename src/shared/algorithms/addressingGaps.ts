import type { AddressingDyadItem, CharacterItem } from '../contracts/addressing'

/**
 * Ô còn trống trong dữ liệu xưng hô — những chỗ model sẽ phải tự đoán.
 *
 * Sửa theo **loại lỗi**, không theo từng lỗi: hầu gái Milly gọi Rion là "em" không phải vì thiếu một
 * luật, mà vì cặp chỉ ghi cách gọi bằng tên ("Rion-sama") và không có ô cho đại từ ngôi hai, nên khi
 * bản gốc lược chủ ngữ model tự điền theo tuổi. Bước chuẩn bị và bước phân tích dùng danh sách này để
 * buộc điền đủ trước khi dịch.
 */

export interface AddressingGap {
  kind: 'second-person' | 'third-person' | 'gender'
  characterId?: string
  dyadId?: string
  message: string
}

/** Đại từ và từ thân tộc tiếng Việt dùng được làm ngôi hai; ngoài danh sách này coi là tên hoặc danh xưng. */
const VIETNAMESE_SECOND_PERSON = new Set([
  'mày',
  'mi',
  'cậu',
  'em',
  'anh',
  'chị',
  'cô',
  'chú',
  'bác',
  'ông',
  'bà',
  'dì',
  'cháu',
  'con',
  'ngươi',
  'nàng',
  'chàng',
  'ngài',
  'người',
  'huynh',
  'đệ',
  'tỷ',
  'muội',
  'khanh',
  'các hạ',
  'đạo hữu',
  'bồ',
  'trò',
  'nhóc',
  'bạn',
  'tụi mày',
  'bọn mày',
  'các ngươi',
  'thầy',
  'sư phụ'
])

export function isPronounLike(term: string): boolean {
  const words = term
    .toLowerCase()
    .split(/[/,;]| hoặc /)
    .map((part) => part.trim())
    .filter(Boolean)
  return words.length > 0 && words.every((word) => VIETNAMESE_SECOND_PERSON.has(word))
}

export function addressingGaps(
  characters: CharacterItem[],
  dyads: AddressingDyadItem[]
): AddressingGap[] {
  const gaps: AddressingGap[] = []
  const names = new Map(
    characters.map((character) => [character.id, character.target || character.source])
  )
  for (const dyad of dyads) {
    if (dyad.status === 'rejected') continue
    if (!isPronounLike(dyad.recipientPronoun) && !dyad.secondPerson) {
      gaps.push({
        kind: 'second-person',
        dyadId: dyad.id,
        message: `${names.get(dyad.sourceCharacterId) ?? '?'} → ${names.get(dyad.targetCharacterId) ?? '?'}: gọi bằng "${dyad.recipientPronoun}" nhưng chưa có đại từ ngôi hai dự phòng.`
      })
    }
  }
  for (const character of characters) {
    if (character.status === 'rejected') continue
    const name = character.target || character.source
    if (character.gender === 'unknown') {
      gaps.push({
        kind: 'gender',
        characterId: character.id,
        message: `${name}: chưa có giới tính.`
      })
    }
    if (!character.thirdPerson) {
      gaps.push({
        kind: 'third-person',
        characterId: character.id,
        message: `${name}: chưa chốt đại từ người kể dùng.`
      })
    }
  }
  return gaps
}
