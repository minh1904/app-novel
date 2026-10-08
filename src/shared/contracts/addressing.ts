import * as v from 'valibot'
import { idSchema } from './library'
import { CONTEXT_STATUSES, type ContextStatus } from './glossary'

export const CHARACTER_GENDERS = ['male', 'female', 'other', 'unknown'] as const
export type CharacterGender = (typeof CHARACTER_GENDERS)[number]

export interface CharacterItem {
  id: string
  source: string
  target: string
  gender: CharacterGender
  role: string | null
  /** Đại từ người kể dùng cho nhân vật ở ngôi ba (hắn, cô ấy, y…); vắng là chưa chốt. */
  thirdPerson?: string | null
  status: ContextStatus
  notes: string | null
  aliases: string[]
  createdAt: number
  updatedAt: number
}

export interface AddressingDyadItem {
  id: string
  sourceCharacterId: string
  targetCharacterId: string
  speakerPronoun: string
  /** Cách gọi người nghe: đại từ, hoặc tên/danh xưng như "Rion-sama". */
  recipientPronoun: string
  /**
   * Đại từ ngôi hai dùng khi bản gốc lược chủ ngữ hoặc dùng đại từ (貴方, あなた, 你) trong lúc cách
   * gọi ở trên là tên hoặc danh xưng. Thiếu ô này, model tự điền theo tuổi: hầu gái gọi chủ nhỏ là "em".
   */
  secondPerson?: string | null
  formality: string | null
  status: ContextStatus
  fromChapterId: string | null
  toChapterId: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export interface AddressingDyadResolved extends AddressingDyadItem {
  sourceCharacter: CharacterItem
  targetCharacter: CharacterItem
}

export interface AddressingComplianceIssue {
  paragraphIndex: number
  quoteText: string
  speakerCharacterId?: string
  recipientCharacterId?: string
  issueType: 'unexpected_pronoun' | 'inconsistent_pair'
  expectedPronoun?: string
  actualPronoun: string
  message: string
}

export interface ParagraphAddressingCheckItem {
  paragraphIndex?: number
  text: string
  speakerCharacterId?: string
  recipientCharacterId?: string
}

export interface AddressingComplianceReport {
  checkedParagraphsCount: number
  issues: AddressingComplianceIssue[]
  hasIssues: boolean
}

export const CHARACTER_NAME_MAX = 100
export const CHARACTER_ROLE_MAX = 200
export const PRONOUN_MAX = 50

export const characterNameSchema = v.pipe(
  v.string('Tên nhân vật phải là chuỗi ký tự.'),
  v.trim(),
  v.minLength(1, 'Tên nhân vật không được để trống.'),
  v.maxLength(CHARACTER_NAME_MAX, `Tên nhân vật tối đa ${CHARACTER_NAME_MAX} ký tự.`)
)

export const characterGenderSchema = v.picklist(CHARACTER_GENDERS, 'Giới tính không hợp lệ.')

export const pronounSchema = v.pipe(
  v.string('Đại từ phải là chuỗi ký tự.'),
  v.trim(),
  v.minLength(1, 'Đại từ không được để trống.'),
  v.maxLength(PRONOUN_MAX, `Đại từ tối đa ${PRONOUN_MAX} ký tự.`)
)

const workId = idSchema
const characterId = v.pipe(
  v.string('ID nhân vật phải là chữ.'),
  v.uuid('ID nhân vật không hợp lệ.')
)
const dyadId = v.pipe(
  v.string('ID cặp xưng hô phải là chữ.'),
  v.uuid('ID cặp xưng hô không hợp lệ.')
)
const chapterIdNullable = v.nullish(
  v.pipe(v.string('ID chương phải là chữ.'), v.uuid('ID chương không hợp lệ.'))
)

export const listCharactersSchema = v.strictObject({
  workId,
  status: v.optional(v.picklist(CONTEXT_STATUSES)),
  query: v.optional(v.pipe(v.string(), v.trim()))
})

export const createCharacterSchema = v.strictObject({
  workId,
  source: characterNameSchema,
  target: characterNameSchema,
  gender: v.optional(characterGenderSchema, 'unknown'),
  role: v.optional(v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(CHARACTER_ROLE_MAX)))),
  thirdPerson: v.optional(v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(PRONOUN_MAX)))),
  status: v.optional(v.picklist(CONTEXT_STATUSES), 'approved'),
  notes: v.optional(v.nullish(v.pipe(v.string(), v.trim()))),
  aliases: v.optional(v.array(characterNameSchema), [])
})

export const updateCharacterSchema = v.strictObject({
  workId,
  characterId,
  source: v.optional(characterNameSchema),
  target: v.optional(characterNameSchema),
  gender: v.optional(characterGenderSchema),
  role: v.optional(v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(CHARACTER_ROLE_MAX)))),
  thirdPerson: v.optional(v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(PRONOUN_MAX)))),
  status: v.optional(v.picklist(CONTEXT_STATUSES)),
  notes: v.optional(v.nullish(v.pipe(v.string(), v.trim()))),
  aliases: v.optional(v.array(characterNameSchema))
})

export const deleteCharacterSchema = v.strictObject({
  workId,
  characterId
})

export const listDyadsSchema = v.strictObject({
  workId,
  chapterId: v.optional(v.pipe(v.string(), v.uuid())),
  status: v.optional(v.picklist(CONTEXT_STATUSES))
})

export const setDyadSchema = v.strictObject({
  workId,
  dyadId: v.optional(dyadId),
  sourceCharacterId: characterId,
  targetCharacterId: characterId,
  speakerPronoun: pronounSchema,
  recipientPronoun: pronounSchema,
  secondPerson: v.optional(v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(PRONOUN_MAX)))),
  formality: v.optional(v.nullish(v.pipe(v.string(), v.trim()))),
  fromChapterId: v.optional(chapterIdNullable),
  toChapterId: v.optional(chapterIdNullable),
  status: v.optional(v.picklist(CONTEXT_STATUSES), 'approved'),
  notes: v.optional(v.nullish(v.pipe(v.string(), v.trim())))
})

export const deleteDyadSchema = v.strictObject({
  workId,
  dyadId
})
