import {
  FENCE,
  type ChatContextBlock,
  type ChatMode,
  type ChatSendInput
} from '../../../shared/contracts/aiChat'
import type { ChatMessage } from '../../infra/providers/openAiCompatible'

/**
 * Lắp một lượt hội thoại thành `messages`.
 *
 * Hàm thuần, không gọi mạng, không đọc kho: cùng đầu vào cho cùng đầu ra. Đó là điều kiện để "ngữ
 * cảnh đã gửi" tái hiện được — panel liệt kê đúng các khối nó gửi, và một lượt dựng lại được tuần
 * sau (yêu cầu "Ngữ cảnh do hệ thống chọn bằng luật").
 *
 * Chế độ **Sửa** đòi một khối thay thế trong hàng rào ``` ở cuối, không đòi JSON (D7 của change
 * `ai-chat`): stream một JSON đang dở ra màn hình thì người đọc thấy dấu ngoặc và chuỗi escape, tức
 * mất streaming ở đúng chế độ dùng nhiều nhất. Hàng rào cho cả hai — chữ đọc được ngay, vẫn tách
 * được khi xong.
 */

const COMMON = [
  'Bạn là trợ lý của một người dịch truyện sang tiếng Việt.',
  'Ngữ cảnh kèm theo là nội dung thật của chương người dùng đang mở:',
  '"Bản gốc của chương" là văn bản nguồn, "Bản dịch hiện có" là bản dịch tới lúc này',
  '(thiếu khối đó nghĩa là chương chưa được dịch).',
  'Khi có khối "Đoạn đang sửa" thì đó là phần người dùng hỏi về; không có thì câu hỏi là về cả chương.',
  'Dùng thẳng các khối đó — **không** đòi người dùng dán lại nội dung.',
  'Trả lời ngắn, đi thẳng vào việc, bằng tiếng Việt.'
].join(' ')

/**
 * Chế độ Hỏi **không ghi**, và chỉ thế thôi.
 *
 * Bản đầu của đoạn này viết "Chỉ trả lời và giải thích. Không viết lại bản dịch…", và hậu quả thấy
 * ngay trên màn hình: hỏi "dịch chương này" thì model trả lời *"tôi không thể dịch toàn bộ chương"* —
 * nó tuân đúng lệnh đã nhận. Đó là lẫn **"không được ghi"** với **"không được giúp"**: khác biệt
 * giữa Hỏi và Sửa nằm ở chỗ câu trả lời có áp dụng được hay không, không nằm ở chỗ model được phép
 * làm gì cho người đọc.
 */
const ASK_ONLY = [
  'Trả lời thẳng vào thứ người dùng hỏi, kể cả khi họ nhờ dịch cả một đoạn hay cả chương —',
  'cứ viết bản dịch ra trong câu trả lời.',
  'Chỉ đừng nói rằng bạn đã sửa hay đã lưu gì vào bản dịch: ở chế độ này câu trả lời là chữ để đọc,',
  'người dùng tự quyết định dùng hay không.'
].join(' ')

const EDIT = [
  'Nhiệm vụ: đề xuất bản thay thế cho **Đoạn đang sửa**,',
  'hoặc cho **toàn bộ bản dịch của chương** khi không có khối đó.',
  'Viết tối đa ba câu giải thích chỗ cần sửa và vì sao.',
  'Sau đó, ở cuối câu trả lời, đặt bản thay thế hoàn chỉnh trong một khối ' + FENCE + '.',
  'Khối đó phải là văn bản thay cho **toàn bộ** Đoạn đang sửa, không phải một phần, và không kèm',
  'giải thích hay chú thích nào bên trong.',
  'Giữ nguyên xuống dòng và dấu câu khi không có lý do đổi.'
].join(' ')

export function systemPrompt(mode: ChatMode): string {
  return COMMON + ' ' + (mode === 'sua' ? EDIT : ASK_ONLY)
}

/** Một khối ngữ cảnh thành chữ. Nhãn đi kèm để model biết khối nào là khối nào. */
function renderBlock(block: ChatContextBlock): string {
  return '## ' + block.label + ' (' + block.detail + ')\n' + block.text
}

/**
 * Ngữ cảnh đi vào **một message `user` riêng, đặt trước lịch sử**, không nhập vào system prompt.
 *
 * Lý do xếp vậy: system prompt giữ **nguyên văn giữa mọi lượt**, nên nó là tiền tố ổn định — đúng
 * hình dạng mà prompt caching cần về sau. Nhồi ngữ cảnh (đổi theo từng lượt) vào đó sẽ làm tiền tố
 * đổi mỗi lần gửi và phá cache trước khi ta kịp bật nó (xem nghiên cứu ngữ cảnh truyện, nghịch lý
 * cache).
 */
export function buildChatMessages(input: ChatSendInput): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(input.mode) }]

  if (input.context.length > 0) {
    messages.push({
      role: 'user',
      content:
        'Ngữ cảnh của chương đang làm (ngôn ngữ nguồn: ' +
        input.sourceLang +
        ', đích: tiếng Việt):\n\n' +
        input.context.map(renderBlock).join('\n\n')
    })
  }

  for (const turn of input.history) {
    messages.push({ role: turn.role, content: turn.text })
  }
  messages.push({ role: 'user', content: input.question })
  return messages
}
