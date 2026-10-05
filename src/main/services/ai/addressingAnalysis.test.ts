import { describe, expect, it } from 'vitest'
import {
  buildAnalysisMessages,
  collectAddressingEvidence,
  parseAnalysis
} from './addressingAnalysis'

const chapters = [
  {
    number: 1,
    text: 'ミリィが扉を開けた。\n「リオン様ったら、探しましたよ？」\n地の文。\n「リオン様？」'
  },
  {
    number: 2,
    text: '姉が笑う。\n「ね、弟くんもそう思うでしょ？」\n「リオン様、お昼寝の時間です」'
  }
]
const characters = [{ source: 'リオン', target: 'Rion', aliases: [] }]

describe('addressingAnalysis', () => {
  it('gom câu thoại có tên nhân vật, kèm câu dẫn, rải đều qua các chương', () => {
    const [evidence] = collectAddressingEvidence(chapters, characters, 'ja', 2)
    expect(evidence.lines).toEqual([
      { chapter: 1, cue: 'ミリィが扉を開けた。', line: '「リオン様ったら、探しましたよ？」' },
      { chapter: 2, cue: '姉が笑う。', line: '「リオン様、お昼寝の時間です」' }
    ])
  })

  it('prompt bắt buộc đại từ ngôi hai khi cách gọi là tên và kèm bảng mặc định', () => {
    const messages = buildAnalysisMessages({
      sourceLang: 'ja',
      register: 'ja-fantasy',
      characters,
      evidence: collectAddressingEvidence(chapters, characters, 'ja')
    })
    expect(messages[0].content).toContain('BẮT BUỘC có "secondPerson"')
    expect(messages[0].content).toContain('<xung_ho_mac_dinh>')
    expect(messages[1].content).toContain(
      'ch1: [ミリィが扉を開けた。] 「リオン様ったら、探しましたよ？」'
    )
  })

  it('đọc JSON có rào và bỏ cặp thiếu trường bắt buộc', () => {
    const result = parseAnalysis(
      '```json\n{"characters":[{"source":"リオン","gender":"male"}],"dyads":[{"from":"ミリィ","to":"リオン","self":"tôi","address":"Rion-sama","secondPerson":"cậu"},{"from":"x"}]}\n```'
    )
    expect(result.characters).toHaveLength(1)
    expect(result.dyads).toEqual([
      { from: 'ミリィ', to: 'リオン', self: 'tôi', address: 'Rion-sama', secondPerson: 'cậu' }
    ])
  })
})
