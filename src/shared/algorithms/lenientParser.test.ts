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

  it('trả về mảng rỗng khi chuỗi hoàn toàn không chứa bản dịch hợp lệ', () => {
    const raw = 'Xin lỗi, tôi không thể dịch nội dung này.'
    const items = parseTranslationResponse(raw)
    expect(items).toEqual([])
  })
})
