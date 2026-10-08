import { describe, expect, it } from 'vitest'
import { parseTranslationResponse } from './lenientParser'

describe('lenientParser — Phân tích cú pháp khoan dung phản hồi mô hình', () => {
  it('phân tích thành công JSON chuẩn', () => {
    const raw = JSON.stringify([
      { id: '[1]', dst: 'Xin chào thế giới.' },
      { id: '[2]', dst: 'Đây là câu thứ hai.' }
    ])
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([
      { tempId: '[1]', text: 'Xin chào thế giới.' },
      { tempId: '[2]', text: 'Đây là câu thứ hai.' }
    ])
  })

  it('bóc tách khối codeblock markdown ```json ... ```', () => {
    const raw = `\`\`\`json
[
  {"id": "[1]", "dst": "Đoạn một."},
  {"id": "[2]", "dst": "Đoạn hai."}
]
\`\`\``
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([
      { tempId: '[1]', text: 'Đoạn một.' },
      { tempId: '[2]', text: 'Đoạn hai.' }
    ])
  })

  it('xử lý dấu phẩy thừa trước dấu đóng mảng (trailing comma)', () => {
    const raw = `[
      {"id": "[1]", "dst": "Thứ nhất"},
      {"id": "[2]", "dst": "Thứ hai"},
    ]`
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([
      { tempId: '[1]', text: 'Thứ nhất' },
      { tempId: '[2]', text: 'Thứ hai' }
    ])
  })

  it('trích xuất mảng JSON khi có lời thoại dẫn dắt ở đầu và cuối', () => {
    const raw = `Dưới đây là kết quả dịch theo yêu cầu của bạn:
[
  {"id": "[1]", "dst": "Chào buổi sáng."}
]
Chúc bạn một ngày tốt lành!`
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([{ tempId: '[1]', text: 'Chào buổi sáng.' }])
  })

  it('nhận diện các biến thể tên thuộc tính (text, translation, vi, ID)', () => {
    const raw = `[
      {"id": "[1]", "text": "Bản dịch A"},
      {"ID": "2", "translation": "Bản dịch B"},
      {"id": "[3]", "vi": "Bản dịch C"}
    ]`
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([
      { tempId: '[1]', text: 'Bản dịch A' },
      { tempId: '2', text: 'Bản dịch B' },
      { tempId: '[3]', text: 'Bản dịch C' }
    ])
  })

  it('nhận diện dạng đối tượng dùng ID làm key {[1]: "bản dịch"}', () => {
    const raw = `[
      {"[1]": "Dòng 1"},
      {"[2]": "Dòng 2"}
    ]`
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([
      { tempId: '[1]', text: 'Dòng 1' },
      { tempId: '[2]', text: 'Dòng 2' }
    ])
  })

  it('phục hồi bằng regex khi JSON bị lỗi cú pháp nặng không parse được', () => {
    // Thiếu dấu ngoặc vuông đóng hoặc cấu trúc lộn xộn
    const raw = `
      {"id": "[1]", "dst": "Câu một với ký tự đặc biệt."}
      {"id": "[2]", "dst": "Câu hai không có mảng bọc ngoài."}
    `
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([
      { tempId: '[1]', text: 'Câu một với ký tự đặc biệt.' },
      { tempId: '[2]', text: 'Câu hai không có mảng bọc ngoài.' }
    ])
  })

  it('"dst" thừa trước khóa nhãn không biến khóa nhãn thành bản dịch', () => {
    const raw =
      '[{"id":"[1]","dst":"speaker_to_listener":"Milly→Rion","self_ref":"tôi","addr_ref":"cậu","dst":"“Cậu về rồi à?”"},' +
      '{"id":"[2]","speaker_to_listener":"Rion→Milly","self_ref":"tôi","addr_ref":"chị","dst":"“Ừ.”"}]'
    expect(parseTranslationResponse(raw)).toEqual([
      { tempId: '[1]', text: '“Cậu về rồi à?”' },
      { tempId: '[2]', text: '“Ừ.”' }
    ])
  })

  it('regex dự phòng không lấy tên khóa làm bản dịch', () => {
    const raw = '{"id":"[1]","dst":"speaker_to_listener":"Milly→Rion" rồi hỏng hẳn'
    expect(parseTranslationResponse(raw)).toEqual([])
  })

  // Các mẫu dưới đây lấy từ phản hồi thật của gemini-3.5-flash-lite (Lab n4696dd, 2026-10-07): 163/544
  // phản hồi hỏng cả mảng vì một object, và regex dự phòng làm mất mọi câu thoại có nhãn.
  it('một object hỏng không làm mất các câu thoại có nhãn còn lại', () => {
    const raw =
      '[{"id":"[1]","speaker_to_listener":"Milly→Rion","self_ref":"tôi","addr_ref":"cậu","dst":"“Xin lỗi cậu.”"},' +
      '{"id":"[2]","dst":"Cho tôi "ta đây siêu mạnh" đi chứ."},' +
      '{"id":"[3]","speaker_to_listener":"Rion→Milly","self_ref":"tôi","addr_ref":"chị","dst":"“Ừ.”"}]'
    expect(parseTranslationResponse(raw)).toEqual([
      { tempId: '[1]', text: '“Xin lỗi cậu.”' },
      { tempId: '[2]', text: 'Cho tôi "ta đây siêu mạnh" đi chứ.' },
      { tempId: '[3]', text: '“Ừ.”' }
    ])
  })

  it('cứu object thiếu dấu ngoặc kép đóng trước }', () => {
    const raw = '[{"id":"[1]","dst":"em nghĩ là khó đấy ạ.”},{"id":"[2]","dst":"Vâng."}]'
    expect(parseTranslationResponse(raw)).toEqual([
      { tempId: '[1]', text: 'em nghĩ là khó đấy ạ.”' },
      { tempId: '[2]', text: 'Vâng.' }
    ])
  })

  it('lấy id từ khóa id lẫn thẻ', () => {
    const valid =
      '[{"id><context>[14]</context><speaker_to_listener>Rion→Crealydil</speaker_to_listener>' +
      '<self_ref>tôi</self_ref><addr_ref>chị</addr_ref><dst":"cái vẻ ra dáng chị hai thì vẫn vậy."}]'
    expect(parseTranslationResponse(valid)).toEqual([
      { tempId: '[14]', text: 'cái vẻ ra dáng chị hai thì vẫn vậy.' }
    ])
    const broken =
      '[{"id><id>[6]","src":"Crealydil→Rion","self_ref":"tớ","addr_ref":"cậu","dst":"「Chuyện đó……」"},' +
      '{"id":"[7]","dst":"Ừ."}]'
    expect(parseTranslationResponse(broken)).toEqual([
      { tempId: '[6]', text: '「Chuyện đó……」' },
      { tempId: '[7]', text: 'Ừ.' }
    ])
  })

  it('bỏ thẻ prompt lọt vào bản dịch, kể cả khi bản dịch nằm nhầm ở khóa src', () => {
    const raw =
      '[{"id":"[1]","src":"<speaker_to_listener>Milly→Leon</speaker_to_listener><self_ref>tôi</self_ref>' +
      '<addr_ref>thiếu gia</addr_ref><dst>「――――？」</dst>"},' +
      '{"id":"[2]","src":"「そう？」","dst":"<addressing>Leon→Milly</addressing><dst>“Vậy à?”</dst>"},' +
      '{"id":"[3]","src":"<self_ref>tôi</self_ref><dst>“Vâng.”</dst>}]'
    expect(parseTranslationResponse(raw)).toEqual([
      { tempId: '[1]', text: '「――――？」' },
      { tempId: '[2]', text: '“Vậy à?”' },
      { tempId: '[3]', text: '“Vâng.”' }
    ])
  })

  it('nhận bản dịch ghi nhầm vào khóa src', () => {
    const raw = '[{"id":"[7]","src":"Trước đề nghị của tôi, cô bé im bặt."}]'
    expect(parseTranslationResponse(raw)).toEqual([
      { tempId: '[7]', text: 'Trước đề nghị của tôi, cô bé im bặt.' }
    ])
  })

  it('trả về mảng rỗng khi chuỗi hoàn toàn không chứa bản dịch hợp lệ', () => {
    const raw = 'Xin lỗi, tôi không thể dịch nội dung này.'
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([])
  })
})

describe('parseTranslationResponse — object {"items":[…]}', () => {
  const expected = [
    { tempId: '[1]', text: 'Một' },
    { tempId: '[2]', text: 'Hai' }
  ]
  const object = '{"items":[{"id":"[1]","dst":"Một"},{"id":"[2]","dst":"Hai"}]}'

  it('reads the object the schema mode asks for', () => {
    expect(parseTranslationResponse(object)).toEqual(expected)
  })

  it('reads it inside a fence', () => {
    expect(parseTranslationResponse('```json\n' + object + '\n```')).toEqual(expected)
  })

  it('reads it after a lead-in that has a bracket of its own', () => {
    expect(parseTranslationResponse('Bản dịch [ghi chú]: ' + object)).toEqual(expected)
  })

  it('reads the old array exactly as before', () => {
    const array = '[{"id":"[1]","dst":"Một"},{"id":"[2]","dst":"Hai"}]'
    expect(parseTranslationResponse(array)).toEqual(expected)
    expect(parseTranslationResponse('Đây: ' + array)).toEqual(expected)
  })
})
