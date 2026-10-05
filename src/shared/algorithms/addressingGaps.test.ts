import { describe, expect, it } from 'vitest'
import type { AddressingDyadItem, CharacterItem } from '../contracts/addressing'
import { addressingGaps, isPronounLike } from './addressingGaps'

function character(over: Partial<CharacterItem>): CharacterItem {
  return {
    id: 'c',
    source: 'ミリィ',
    target: 'Milly',
    gender: 'female',
    role: null,
    thirdPerson: 'cô',
    status: 'approved',
    notes: null,
    aliases: [],
    createdAt: 1,
    updatedAt: 1,
    ...over
  }
}

function dyad(over: Partial<AddressingDyadItem>): AddressingDyadItem {
  return {
    id: 'd',
    sourceCharacterId: 'milly',
    targetCharacterId: 'rion',
    speakerPronoun: 'tôi',
    recipientPronoun: 'Rion-sama',
    formality: null,
    status: 'approved',
    fromChapterId: null,
    toChapterId: null,
    notes: null,
    createdAt: 1,
    updatedAt: 1,
    ...over
  }
}

describe('addressingGaps', () => {
  it('nhận ra cách gọi là đại từ hay là tên, danh xưng', () => {
    expect(isPronounLike('mày')).toBe(true)
    expect(isPronounLike('anh / chị')).toBe(true)
    expect(isPronounLike('Rion-sama')).toBe(false)
    expect(isPronounLike('tiểu thư')).toBe(false)
  })

  it('cặp gọi bằng tên mà thiếu đại từ ngôi hai là một ô trống', () => {
    const characters = [
      character({ id: 'milly' }),
      character({ id: 'rion', source: 'リオン', target: 'Rion', gender: 'male', thirdPerson: null })
    ]
    const gaps = addressingGaps(characters, [dyad({})])
    expect(gaps.map((gap) => gap.kind)).toEqual(['second-person', 'third-person'])
    expect(gaps[0].message).toContain('Milly → Rion')
    expect(addressingGaps(characters, [dyad({ secondPerson: 'cậu' })])).toHaveLength(1)
  })

  it('bỏ qua mục đã bị từ chối và báo thiếu giới tính', () => {
    const gaps = addressingGaps(
      [character({ id: 'x', gender: 'unknown' }), character({ id: 'y', status: 'rejected' })],
      [dyad({ status: 'rejected' })]
    )
    expect(gaps.map((gap) => gap.kind)).toEqual(['gender'])
  })
})
