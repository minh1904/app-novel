import { describe, expect, it } from 'vitest'
import { nameConsistency, overallConsistency } from './nameConsistency'

const source = [
  'リオンは笑った。',
  'リオン様、起きてください。',
  'ミリィは怒った。',
  'リオンが走る。',
  'ミリィとリオンが話す。',
  '空は青い。',
  'ミリィが笑う。'
]

describe('nameConsistency', () => {
  it('chọn cách viết đi kèm nhân vật, không chọn chữ hoa đầu câu', () => {
    const target = [
      'Leon cười.',
      'Thiếu gia Rion, dậy đi ạ.',
      'Milly giận.',
      'Leon chạy.',
      'Milly và Leon nói chuyện.',
      'Trời xanh.',
      'Milly cười.'
    ]
    const result = nameConsistency(source, target, [
      { name: 'リオン', forms: ['リオン'] },
      { name: 'ミリィ', forms: ['ミリィ'] }
    ])
    const leon = result.find((r) => r.name === 'リオン')
    expect(leon).toMatchObject({ paragraphs: 4, dominant: 'Leon', consistent: 3 })
    expect(leon?.others.map((o) => o.rendering)).toContain('Rion')
    expect(result.find((r) => r.name === 'ミリィ')).toMatchObject({
      dominant: 'Milly',
      consistent: 3
    })
    expect(overallConsistency(result)).toEqual({ names: 2, paragraphs: 7, consistent: 6 })
  })

  it('bỏ nhân vật xuất hiện quá ít đoạn và đoạn vượt quá bản dịch', () => {
    expect(
      nameConsistency(source, ['Leon cười.'], [{ name: 'リオン', forms: ['リオン'] }])
    ).toEqual([])
  })
})
