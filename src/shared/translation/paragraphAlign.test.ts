import { describe, it, expect } from 'vitest'
import { alignParagraphs } from './paragraphAlign'

describe('paragraphAlign', () => {
  describe('scenarios from translation-checks spec', () => {
    it('scenario: không sót, không dư -> mọi cặp là 1-1', () => {
      const src = [
        '孔乙己是站着喝酒而穿长衫的唯一的人。',
        '他身材很高大；青白脸色，皱纹间时常夹些伤痕。',
        '掌柜是一副凶脸孔，主顾也没有好声气。'
      ]
      const tgt = [
        'Khổng Ất Kỷ là người duy nhất vừa đứng uống rượu lại vừa mặc áo dài.',
        'Hắn vóc người rất cao lớn; nét mặt xanh xao, giữa những vết nhăn thường chen chút sẹo.',
        'Chưởng quỹ là bộ mặt dữ tợn, khách uống rượu cũng chẳng có giọng nói êm đềm.'
      ]

      const beads = alignParagraphs(src, tgt, { sourceLang: 'zh-Hans' })
      expect(beads).toHaveLength(3)
      expect(beads.every((b) => b.type === '1-1')).toBe(true)
      expect(beads[0]).toEqual({ type: '1-1', srcIdx: [0], tgtIdx: [0] })
      expect(beads[1]).toEqual({ type: '1-1', srcIdx: [1], tgtIdx: [1] })
      expect(beads[2]).toEqual({ type: '1-1', srcIdx: [2], tgtIdx: [2] })
    })

    it('scenario: sót ở đầu và tách ở sau với tổng số đoạn bằng nhau -> báo 1-0 và 1-2, các đoạn ở giữa ghép đúng', () => {
      const src = [
        '第1段，开篇故事。',
        '第2段，描述内容。',
        '「あっ」', // skipped
        '第4段，长长的正常内容，讲述了许多事情。',
        '第5段，很长的内容，包含前一句和后一句的叙述。'
      ]
      const tgt = [
        'Đoạn 1, câu chuyện mở đầu.',
        'Đoạn 2, nội dung miêu tả.',
        // index 2 skipped
        'Đoạn 4, nội dung bình thường rất dài, kể lại nhiều chuyện.',
        'Đoạn 5, phần thứ nhất của câu chuyện.',
        'Và đây là phần thứ hai của đoạn 5.'
      ]

      const beads = alignParagraphs(src, tgt, { sourceLang: 'ja' })
      const omission = beads.find((b) => b.type === '1-0')
      expect(omission).toBeDefined()
      expect(omission?.srcIdx).toEqual([2])

      const split = beads.find((b) => b.type === '1-2')
      expect(split).toBeDefined()
      expect(split?.srcIdx).toEqual([4])
      expect(split?.tgtIdx).toEqual([3, 4])

      const beadFor4thSrc = beads.find((b) => b.srcIdx[0] === 3)
      expect(beadFor4thSrc?.type).toBe('1-1')
      expect(beadFor4thSrc?.tgtIdx).toEqual([2])
    })

    it('scenario: hai dòng ngắn bị gộp -> báo 2-1', () => {
      const src = [
        '「あっ」',
        '「小さな声がした」',
        '長い説明がここに続きます。二人は顔を見合わせた。'
      ]
      const tgt = [
        '「A! Có tiếng nói nhỏ vang lên.」', // merged 0 and 1
        'Lời giải thích dài dòng tiếp tục ở đây. Hai người nhìn nhau.'
      ]

      const beads = alignParagraphs(src, tgt, { sourceLang: 'ja' })
      expect(beads).toHaveLength(2)
      expect(beads[0].type).toBe('2-1')
      expect(beads[0].srcIdx).toEqual([0, 1])
      expect(beads[0].tgtIdx).toEqual([0])
      expect(beads[1].type).toBe('1-1')
      expect(beads[1].srcIdx).toEqual([2])
      expect(beads[1].tgtIdx).toEqual([1])
    })

    it('runs deterministically: running twice gives identical output', () => {
      const src = ['段落1', '段落2', '段落3', '段落4']
      const tgt = ['Đoạn 1', 'Đoạn 2', 'Đoạn 3', 'Đoạn 4']
      const run1 = alignParagraphs(src, tgt, { sourceLang: 'zh-Hans' })
      const run2 = alignParagraphs(src, tgt, { sourceLang: 'zh-Hans' })
      expect(run1).toEqual(run2)
    })
  })

  describe('anchors', () => {
    it('uses anchors (numbers, names, markers, glossary) to align short ambiguous dialogues', () => {
      const src = [
        '長い段落その1です。',
        '「え」',
        '「あっ」',
        '100文の銭を置いた。',
        '長い段落その2です。'
      ]
      const tgt = [
        'Đoạn văn dài số 1.',
        '「Hả?」',
        '「A!」',
        'Đặt 100 đồng tiền lớn ra.',
        'Đoạn văn dài số 2.'
      ]

      const beads = alignParagraphs(src, tgt, {
        sourceLang: 'ja',
        glossary: [{ src: '銭', tgt: 'tiền' }]
      })

      expect(beads).toHaveLength(5)
      expect(beads[3].type).toBe('1-1')
      expect(beads[3].srcIdx).toEqual([3])
      expect(beads[3].tgtIdx).toEqual([3])
    })

    it('works properly even when no anchors match', () => {
      const src = ['短い行A', '短い行B']
      const tgt = ['Dòng ngắn A', 'Dòng ngắn B']
      const beads = alignParagraphs(src, tgt, { sourceLang: 'zh-Hans' })
      expect(beads).toHaveLength(2)
      expect(beads[0].type).toBe('1-1')
      expect(beads[1].type).toBe('1-1')
    })
  })
})
